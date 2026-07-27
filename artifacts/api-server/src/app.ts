import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";
import express, { type Express, type Request, type Response, type NextFunction } from "express";
import cors from "cors";
import pinoHttp from "pino-http";
import router from "./routes";
import { logger } from "./lib/logger";

const app: Express = express();

// ── Security headers ──────────────────────────────────────────────────────────
app.use((_req: Request, res: Response, next: NextFunction) => {
  // Prevent MIME-type sniffing
  res.setHeader("X-Content-Type-Options", "nosniff");
  // Prevent clickjacking
  res.setHeader("X-Frame-Options", "SAMEORIGIN");
  // Remove server fingerprint
  res.removeHeader("X-Powered-By");
  // Referrer leakage
  res.setHeader("Referrer-Policy", "strict-origin-when-cross-origin");
  // Basic content security for API responses
  res.setHeader("X-XSS-Protection", "1; mode=block");
  next();
});

app.use(
  pinoHttp({
    logger,
    serializers: {
      req(req) {
        return { id: req.id, method: req.method, url: req.url?.split("?")[0] };
      },
      res(res) {
        return { statusCode: res.statusCode };
      },
    },
  }),
);

// CORS — open so API calls work from Vite dev server and Expo.
// In production the frontend is served from the same origin, so CORS
// headers are not needed for browser clients.
app.use(cors({ credentials: true, origin: true }));

app.use(express.json({ limit: "5mb" }));
app.use(express.urlencoded({ extended: true, limit: "5mb" }));

// ── API routes ───────────────────────────────────────────────────────────────
// Prevent caching of API responses that may contain sensitive data
app.use("/api", (_req: Request, res: Response, next: NextFunction) => {
  res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate");
  res.setHeader("Pragma", "no-cache");
  next();
});
app.use("/api", router);

// ── Static frontend serving (production only) ─────────────────────────────────
// In production the built React SPA is served from the same process so the
// hospital LAN only needs a single port (8080).
//
// Frontend directory resolution order:
//   1. FRONTEND_DIR env var  (explicit, set by StartServer.bat or Docker env)
//   2. <cwd>/public          (Docker layout — Dockerfile copies dist/public here)
//   3. <bundle>/../../bsch/dist/public  (monorepo layout: dist → api-server → artifacts → bsch/dist/public)
if (process.env.NODE_ENV === "production") {
  const __dirnameESM = path.dirname(fileURLToPath(import.meta.url));

  let frontendDir: string;
  if (process.env.FRONTEND_DIR) {
    frontendDir = path.resolve(process.env.FRONTEND_DIR);
  } else {
    // Docker: CWD=/app, frontend is at /app/public
    const cwdPublic = path.join(process.cwd(), "public");
    // Monorepo local: __dirname = .../artifacts/api-server/dist
    //   2 levels up → artifacts/
    //   + bsch/dist/public → artifacts/bsch/dist/public ✓
    const relPublic = path.join(__dirnameESM, "..", "..", "bsch", "dist", "public");
    frontendDir = fs.existsSync(cwdPublic) ? cwdPublic : relPublic;
  }

  if (fs.existsSync(frontendDir)) {
    logger.info({ frontendDir }, "Serving static frontend");

    // Hashed Vite assets can be cached for a long time; SW and manifest must not be cached
    app.use(
      express.static(frontendDir, {
        maxAge: "7d",
        etag: true,
        index: false,
        setHeaders(res, filePath) {
          const name = path.basename(filePath);
          // Service worker and manifest must always be fresh
          if (name === "sw.js" || name === "manifest.json" || name === "index.html") {
            res.setHeader("Cache-Control", "no-cache");
          }
        },
      }),
    );

    // SPA fallback: serve index.html for any non-API path so that
    // client-side routing (wouter) works on direct URL access / page refresh
    // Express 5 requires named wildcard segments
    app.get("/{*splat}", (_req, res) => {
      res.setHeader("Cache-Control", "no-cache");
      res.sendFile(path.join(frontendDir, "index.html"));
    });
  } else {
    logger.warn(
      { frontendDir },
      "Frontend directory not found — static serving disabled. " +
        "Build the frontend first or set FRONTEND_DIR.",
    );
  }
}

export default app;
