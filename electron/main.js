/**
 * BSCH Electron Main Process
 * Starts the bundled Express API, then opens the main browser window.
 *
 * Development : npm start  (from electron/ — expects workspace builds)
 * Production  : built with electron-builder (nsis / portable)
 */

const { app, BrowserWindow, shell, Menu, Tray, nativeImage, dialog } = require('electron');
const path = require('path');
const { spawn } = require('child_process');
const http = require('http');
const fs = require('fs');

const API_PORT = 8080;
const API_URL  = `http://localhost:${API_PORT}`;

let mainWindow = null;
let tray       = null;
let apiProcess = null;

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

const SERVER_ENTRY   = isDev
  ? getResourcePath('artifacts', 'api-server', 'dist', 'index.mjs')
  : getResourcePath('api-server', 'dist', 'index.mjs');

const FRONTEND_DIR   = isDev
  ? getResourcePath('artifacts', 'bsch', 'dist', 'public')
  : getResourcePath('public');

// ─── MySQL config — read from a local bsch.config.json if present ─────────────
// Default credentials work for a fresh local MySQL install with the BSCH setup script.
// Users can override by creating  %APPDATA%\BSCH\bsch.config.json

function loadDbConfig() {
  const configDir  = app.getPath('userData');
  const configFile = path.join(configDir, 'bsch.config.json');
  const defaults = {
    DB_HOST:     '127.0.0.1',
    DB_PORT:     '3306',
    DB_USER:     'bsch_user',
    DB_PASSWORD: 'bsch_password',
    DB_NAME:     'bsch_db',
  };
  try {
    if (fs.existsSync(configFile)) {
      const cfg = JSON.parse(fs.readFileSync(configFile, 'utf8'));
      return { ...defaults, ...cfg };
    }
  } catch (_) { /* use defaults */ }
  return defaults;
}

// ─── Start API Server ─────────────────────────────────────────────────────────

function startApiServer() {
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
        if (res.statusCode === 200) resolve();
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
    mainWindow.loadFile(path.join(__dirname, 'error.html'));
    mainWindow.show();
  }

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
