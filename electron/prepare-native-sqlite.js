const fs = require('fs');
const path = require('path');

const electronDir = __dirname;
const target = path.join(electronDir, 'native', 'better-sqlite3');
const candidates = [
  path.resolve(electronDir, '..', 'lib', 'db'),
  path.resolve(electronDir, '..'),
];

let packageJson;
for (const base of candidates) {
  try {
    packageJson = require.resolve('better-sqlite3/package.json', { paths: [base] });
    break;
  } catch (_) {}
}
if (!packageJson) {
  console.error('Could not resolve better-sqlite3. Run pnpm install from the repository root first.');
  process.exit(1);
}

fs.rmSync(target, { recursive: true, force: true });
fs.mkdirSync(path.dirname(target), { recursive: true });
const source = path.dirname(packageJson);
fs.cpSync(source, target, { recursive: true });
console.log(`Copied better-sqlite3 from ${source} to ${target}`);
