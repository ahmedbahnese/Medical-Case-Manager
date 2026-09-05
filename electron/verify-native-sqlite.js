const fs = require("fs");
const path = require("path");

function peKind(file) {
  const b = fs.readFileSync(file);
  if (b[0] !== 0x4d || b[1] !== 0x5a) throw new Error(`${file}: not a PE file`);
  const pe = b.readUInt32LE(0x3c);
  if (b.toString("ascii", pe, pe + 4) !== "PE\0\0") throw new Error(`${file}: invalid PE signature`);
  const machine = b.readUInt16LE(pe + 4);
  if (machine === 0x14c) return "PE32";
  if (machine === 0x8664) return "PE32+";
  return `unknown(0x${machine.toString(16)})`;
}

const expected = { ia32: "PE32", x64: "PE32+" };
const root = process.argv[2] || path.resolve(__dirname, "..", "lib", "db", "node_modules", "better-sqlite3");
for (const [arch, kind] of Object.entries(expected)) {
  const candidates = [
    path.join(root, arch, "better_sqlite3.node"),
    path.join(root, "build", arch, "better_sqlite3.node"),
  ];
  const file = candidates.find(fs.existsSync);
  if (!file) {
    console.warn(`SQLite ${arch}: DLL not found (checked ${candidates.join(", ")})`);
    continue;
  }
  const actual = peKind(file);
  if (actual !== kind) throw new Error(`SQLite ${arch}: expected ${kind}, got ${actual} (${file})`);
  console.log(`SQLite ${arch}: ${actual} OK — ${file}`);
}
