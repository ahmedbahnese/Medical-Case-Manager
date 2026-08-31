/**
 * BSCH Electron Main Process
 * Starts the bundled Express API, then opens the main browser window.
 *
 * Development : npm start  (from electron/ — expects workspace builds)
 * Production  : built with electron-builder (nsis / portable)
 */

const { app, BrowserWindow, shell, Menu, Tray, nativeImage, dialog, ipcMain } = require('electron');
const path = require('path');
const { spawn } = require('child_process');
const http = require('http');
const fs = require('fs');

const API_PORT = 8080;
const API_URL  = `http://localhost:${API_PORT}`;

let mainWindow = null;
let tray       = null;
let apiProcess = null;

ipcMain.handle('save-pdf', async (event, payload) => {
  const sourceWindow = BrowserWindow.fromWebContents(event.sender);
  if (!sourceWindow || !payload || typeof payload.html !== 'string') return { canceled: true };
  const pdfWindow = new BrowserWindow({ show: false, webPreferences: { javascript: false, nodeIntegration: false, contextIsolation: true } });
  try {
    await pdfWindow.loadURL('data:text/html;charset=utf-8,' + encodeURIComponent(payload.html));
    const pdf = await pdfWindow.webContents.printToPDF({
      printBackground: true,
      pageSize: 'A4',
      margins: { marginType: 'custom', top: 10000, bottom: 10000, left: 9000, right: 9000 },
    });
    const result = await dialog.showSaveDialog(sourceWindow, {
      title: 'حفظ ملف PDF',
      defaultPath: payload.title || 'تقرير.pdf',
      filters: [{ name: 'PDF', extensions: ['pdf'] }],
    });
    if (result.canceled || !result.filePath) return { canceled: true };
    fs.writeFileSync(result.filePath, pdf);
    return { canceled: false, filePath: result.filePath };
  } finally {
    if (!pdfWindow.isDestroyed()) pdfWindow.close();
  }
});

// Prevent recursive launches and accidental multiple server instances.
const hasSingleInstanceLock = app.requestSingleInstanceLock();
if (!hasSingleInstanceLock) {
  app.quit();
} else {
  app.on('second-instance', () => {
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore();
      mainWindow.show();
      mainWindow.focus();
    }
  });
}

// ─── Resolve paths for packaged vs dev ────────────────────────────────────────

const isDev = !app.isPackaged;

function getResourcePath(...segments) {
  if (isDev) {
    // In dev, main.js lives in electron/; workspace root is one level up
    return path.join(__dirname, '..', ...segments);
  }
  // In packaged app, extraResources land in process.resourcesPath
  return path.join(process.resourcesPath, ...segments);
}

let SERVER_ENTRY   = isDev
  ? getResourcePath('artifacts', 'api-server', 'dist', 'index.mjs')
  : getResourcePath('api-server', 'dist', 'index.mjs');

let FRONTEND_DIR   = isDev
  ? getResourcePath('artifacts', 'bsch', 'dist', 'public')
  : getResourcePath('public');

const VERSION_FILE = isDev ? path.join(__dirname, '..', 'package.json') : path.join(process.resourcesPath, 'app-version.json');

function readJson(file) {
  try { return JSON.parse(fs.readFileSync(file, 'utf8')); } catch { return null; }
}

function copyDirectory(source, target) {
  if (!fs.existsSync(source)) return;
  fs.mkdirSync(target, { recursive: true });
  for (const entry of fs.readdirSync(source, { withFileTypes: true })) {
    const from = path.join(source, entry.name);
    const to = path.join(target, entry.name);
    if (entry.isDirectory()) copyDirectory(from, to);
    else fs.copyFileSync(from, to);
  }
}

function applyPendingUpdate() {
  if (isDev) return;
  const dataDir = app.getPath('userData');
  const updatesDir = path.join(dataDir, 'updates');
  const manifestPath = path.join(updatesDir, 'update-manifest.json');
  const manifest = readJson(manifestPath);
  if (!manifest || !manifest.version || !manifest.payloadDir) return;

  const current = readJson(VERSION_FILE) || { version: app.getVersion() };
  const appliedVersionPath = path.join(dataDir, 'applied-version.json');
  const applied = readJson(appliedVersionPath) || current;
  if (String(manifest.version) <= String(applied.version)) return;
  const source = path.resolve(updatesDir, manifest.payloadDir);
  const staged = path.join(updatesDir, '.staged-' + Date.now());
  const runtime = path.join(dataDir, 'update-runtime');
  if (!fs.existsSync(source)) return;

  try {
    copyDirectory(source, staged);
    if (!fs.existsSync(path.join(staged, 'api-server', 'dist', 'index.mjs')) || !fs.existsSync(path.join(staged, 'public', 'index.html'))) {
      throw new Error('حزمة التحديث لا تحتوي على api-server/dist/index.mjs و public/index.html');
    }
    const backup = path.join(dataDir, 'update-backup');
    if (fs.existsSync(backup)) fs.rmSync(backup, { recursive: true, force: true });
    if (fs.existsSync(runtime)) fs.renameSync(runtime, backup);
    fs.renameSync(staged, runtime);
    fs.writeFileSync(path.join(runtime, 'app-version.json'), JSON.stringify({ version: manifest.version, appliedAt: new Date().toISOString() }, null, 2));
    fs.renameSync(manifestPath, manifestPath + '.applied');
    fs.writeFileSync(appliedVersionPath, JSON.stringify({ version: manifest.version, appliedAt: new Date().toISOString() }, null, 2));
    SERVER_ENTRY = path.join(runtime, 'api-server', 'dist', 'index.mjs');
    FRONTEND_DIR = path.join(runtime, 'public');
    if (fs.existsSync(backup)) fs.rmSync(backup, { recursive: true, force: true });
    console.log('[UPDATE] Applied version ' + manifest.version);
  } catch (error) {
    console.error('[UPDATE] Failed:', error.message);
    if (fs.existsSync(staged)) fs.rmSync(staged, { recursive: true, force: true });
  }
}

// ─── Local SQLite database ─────────────────────────────────────────────────────
function loadDbConfig() {
  const dataDir = app.getPath('userData');
  fs.mkdirSync(dataDir, { recursive: true });
  return {
    BSCH_DATA_DIR: dataDir,
    BSCH_DATABASE_PATH: path.join(dataDir, 'bsch.sqlite'),
    HOST: '0.0.0.0',
  };
}

// ─── Start API Server ─────────────────────────────────────────────────────────

function startApiServer() {
  if (!hasSingleInstanceLock) return;
  if (apiProcess && !apiProcess.killed) return;
  if (!fs.existsSync(SERVER_ENTRY)) {
    dialog.showErrorBox(
      'ملف الخادم مفقود',
      `لم يتم العثور على ملف الخادم:\n${SERVER_ENTRY}\n\nتأكد من اكتمال عملية البناء.`
    );
    return;
  }

  const dbConfig = loadDbConfig();

  apiProcess = spawn(process.execPath, ['--enable-source-maps', SERVER_ENTRY], {
    env: {
      ...process.env,
      PORT:         String(API_PORT),
      NODE_ENV:     'production',
      // Electron's executable must be switched to Node mode for the API child.
      ELECTRON_RUN_AS_NODE: '1',
      FRONTEND_DIR: FRONTEND_DIR,
      ...dbConfig,
    },
    stdio: ['ignore', 'pipe', 'pipe'],
    windowsHide: true,
  });

  apiProcess.stdout.on('data', (d) => console.log('[API]', d.toString().trim()));
  apiProcess.stderr.on('data', (d) => console.error('[API ERR]', d.toString().trim()));

  apiProcess.on('exit', (code, signal) => {
    console.log(`API server exited — code=${code} signal=${signal}`);
  });
}

// ─── Wait for API to be ready ─────────────────────────────────────────────────

function waitForApi(retries = 60, delayMs = 500) {
  return new Promise((resolve, reject) => {
    const check = (n) => {
      http.get(`${API_URL}/api/health`, (res) => {
        // Any HTTP response below 500 proves that the API is reachable.
        // /api/health is protected and may correctly return 401 before login.
        if (res.statusCode && res.statusCode < 500) resolve();
        else if (n > 0) setTimeout(() => check(n - 1), delayMs);
        else reject(new Error('API server did not start in time'));
      }).on('error', () => {
        if (n > 0) setTimeout(() => check(n - 1), delayMs);
        else reject(new Error('API server did not start in time'));
      });
    };
    check(retries);
  });
}

// ─── Splash window (shown while backend initializes) ──────────────────────────

let splashWindow = null;

function createSplash() {
  splashWindow = new BrowserWindow({
    width: 420,
    height: 280,
    frame: false,
    transparent: true,
    alwaysOnTop: true,
    resizable: false,
    center: true,
    webPreferences: { nodeIntegration: false, contextIsolation: true },
  });

  const splashHtml = `<!DOCTYPE html>
<html lang="ar" dir="rtl">
<head>
<meta charset="UTF-8">
<style>
  * { margin:0; padding:0; box-sizing:border-box; }
  body {
    font-family: 'Segoe UI', Arial, sans-serif;
    background: linear-gradient(135deg, #0f766e 0%, #134e4a 100%);
    color: #fff;
    display: flex; flex-direction: column;
    align-items: center; justify-content: center;
    height: 100vh; border-radius: 16px;
    -webkit-app-region: no-drag;
  }
  h1 { font-size: 1.6rem; margin-bottom: 0.4rem; letter-spacing: 0.5px; }
  p  { font-size: 0.85rem; opacity: 0.8; margin-bottom: 1.8rem; }
  .spinner {
    width: 40px; height: 40px;
    border: 4px solid rgba(255,255,255,0.3);
    border-top-color: #fff;
    border-radius: 50%;
    animation: spin 0.9s linear infinite;
  }
  @keyframes spin { to { transform: rotate(360deg); } }
  .sub { font-size: 0.75rem; opacity: 0.6; margin-top: 1rem; }
</style>
</head>
<body>
  <h1>🏥 BSCH</h1>
  <p>نظام إدارة الحالات الطبية</p>
  <div class="spinner"></div>
  <div class="sub">جارٍ تهيئة الخادم…</div>
</body>
</html>`;

  splashWindow.loadURL('data:text/html;charset=utf-8,' + encodeURIComponent(splashHtml));
}

// ─── Create Main Window ───────────────────────────────────────────────────────

async function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1366,
    height: 900,
    minWidth: 900,
    minHeight: 600,
    title: 'BSCH - نظام إدارة الحالات الطبية',
    show: false,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: false,
      contextIsolation: true,
    },
    autoHideMenuBar: true,
  });

  try {
    await waitForApi();
    mainWindow.loadURL(API_URL);
    mainWindow.once('ready-to-show', () => {
      if (splashWindow) { splashWindow.close(); splashWindow = null; }
      mainWindow.show();
      mainWindow.focus();
    });
  } catch (err) {
    if (splashWindow) { splashWindow.close(); splashWindow = null; }
    const details = encodeURIComponent(err && err.message ? err.message : 'سبب غير معروف');
    mainWindow.loadURL('file://' + path.join(__dirname, 'error.html') + '?message=' + details);
    mainWindow.show();
  }

  // Restore the standard copy/paste context menu inside the desktop shell.
  mainWindow.webContents.on('context-menu', (_event, params) => {
    const menu = Menu.buildFromTemplate([
      { role: 'cut', enabled: params.isEditable },
      { role: 'copy', enabled: Boolean(params.selectionText) },
      { role: 'paste', enabled: params.isEditable },
      { type: 'separator' },
      { role: 'selectAll' },
    ]);
    menu.popup({ window: mainWindow });
  });

  // Open external links in the system browser
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: 'deny' };
  });

  mainWindow.on('closed', () => { mainWindow = null; });
}

// ─── System Tray ─────────────────────────────────────────────────────────────

function createTray() {
  // Use a minimal 1×1 transparent icon as fallback (icon replaced by installer)
  const icon = nativeImage.createEmpty();
  tray = new Tray(icon);
  tray.setToolTip('BSCH - نظام إدارة الحالات الطبية');

  const contextMenu = Menu.buildFromTemplate([
    { label: 'فتح التطبيق',   click: () => { if (mainWindow) mainWindow.focus(); else createWindow(); } },
    { label: 'إعادة تشغيل',  click: () => { app.relaunch(); app.exit(0); } },
    { type: 'separator' },
    { label: 'إغلاق التطبيق', click: () => app.quit() },
  ]);

  tray.setContextMenu(contextMenu);
  tray.on('double-click', () => { if (mainWindow) mainWindow.focus(); else createWindow(); });
}

// ─── App Lifecycle ────────────────────────────────────────────────────────────

app.whenReady().then(async () => {
  applyPendingUpdate();
  createSplash();
  startApiServer();
  createTray();
  await createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

// Keep running in the tray when the last window is closed (Windows/Linux)
app.on('window-all-closed', () => {
  if (process.platform === 'darwin') app.quit();
});

app.on('before-quit', () => {
  if (apiProcess) {
    apiProcess.kill();
    apiProcess = null;
  }
});
