const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

const packageDir = path.join(__dirname, 'native', 'better-sqlite3');
const prebuildBin = require.resolve('prebuild-install/bin.js', { paths: [packageDir] });

if (!fs.existsSync(packageDir)) {
  console.error(`Native package directory not found: ${packageDir}`);
  process.exit(1);
}

const result = spawnSync(process.execPath, [
  prebuildBin,
  '--runtime', 'electron',
  '--target', '22.3.27',
  '--arch', 'ia32',
  '--platform', 'win32',
  '--verbose',
], { cwd: packageDir, stdio: 'inherit', windowsHide: true });

if (result.error) throw result.error;
if (result.status !== 0) {
  console.error('No compatible prebuilt better-sqlite3 binary was downloaded. Refusing to package an incompatible native module.');
  process.exit(result.status || 1);
}
