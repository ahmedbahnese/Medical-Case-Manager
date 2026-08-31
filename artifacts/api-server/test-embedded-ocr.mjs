import { createWorker } from "tesseract.js";
import { createRequire } from "node:module";
import path from "node:path";
import os from "node:os";

const require = createRequire(import.meta.url);
const data = require("@tesseract.js-data/ara");
const worker = await createWorker("ara", 1, {
  langPath: data.langPath,
  cachePath: path.join(os.tmpdir(), "bsch-ocr-test-cache"),
  gzip: true,
  logger: () => undefined,
});
console.log("worker-loaded");
await worker.terminate();
