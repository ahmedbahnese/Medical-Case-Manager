import app from "./app";
import { logger } from "./lib/logger";
import { initDatabase } from "./lib/db-init";

const rawPort = process.env["PORT"];
const host = process.env["HOST"] ?? "0.0.0.0";

if (!rawPort) {
  throw new Error(
    "PORT environment variable is required but was not provided.",
  );
}

const port = Number(rawPort);

if (Number.isNaN(port) || port <= 0) {
  throw new Error(`Invalid PORT value: "${rawPort}"`);
}

// Initialize DB (create tables + seed) before accepting requests
initDatabase()
  .then(() => {
    app.listen(port, host, (err) => {
      if (err) {
        logger.error({ err }, "Error listening on port");
        process.exit(1);
      }
      logger.info({ host, port }, "Server listening");
    });
  })
  .catch((err) => {
    logger.error({ err }, "Fatal: database initialization failed");
    process.exit(1);
  });
