import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";
import express, { type Express } from "express";
import cors from "cors";
import pinoHttp from "pino-http";
import router from "./routes";
import { logger } from "./lib/logger";

const app: Express = express();

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

// CORS — open so API calls work from any origin (Vite dev server, Expo, etc.).
// In production the frontend is served from the same origin, so this header
// is ignored by browsers for same-origin requests.
app.use(cors());

app.use(express.json({ limit: "5mb" }));
app.use(express.urlencoded({ extended: true, limit: "5mb" }));

// ── API routes ───────────────────────────────────────────────────────────────
app.use("/api", router);

// ── Static frontend serving (production only) ─────────────────────────────────
// In production the built React SPA is served from the same process so the
// hospital LAN only needs a single port (8080).
//
// Frontend directory resolution order:
//   1. FRONTEND_DIR env var  (explicit, e.g. set in StartServer.bat)
//   2. <cwd>/public          (Docker layout — Dockerfile copies dist/public here)
//   3. <bundle>/../../../bsch/dist/public  (monorepo local layout)
if (process.env.NODE_ENV === "production") {
  const __dirnameESM = path.dirname(fileURLToPath(import.meta.url));

  let frontendDir: string;
  if (process.env.FRONTEND_DIR) {
    frontendDir = path.resolve(process.env.FRONTEND_DIR);
  } else {
    const cwdPublic = path.join(process.cwd(), "public");
    const relPublic = path.join(__dirnameESM, "..", "..", "..", "bsch", "dist", "public");
    frontendDir = fs.existsSync(cwdPublic) ? cwdPublic : relPublic;
  }

  if (fs.existsSync(frontendDir)) {
    logger.info({ frontendDir }, "Serving static frontend");

    // Serve static assets with long-lived cache for Vite-hashed filenames
    app.use(
      express.static(frontendDir, {
        maxAge: "7d",
        etag: true,
        index: false, // Let SPA fallback handle root
      }),
    );

    // SPA fallback: serve index.html for any non-API path so that
    // client-side routing (wouter) works on direct URL access / page refresh
    // Express 5 requires named wildcard segments
    app.get("/{*splat}", (_req, res) => {
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
