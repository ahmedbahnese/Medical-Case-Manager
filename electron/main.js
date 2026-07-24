/**
 * BSCH Electron Main Process
 * Bundles the Express API server and opens a browser window.
 *
 * Build: npm run build (from electron/ directory)
 * Start: npm start
 */

const { app, BrowserWindow, shell, Menu, Tray, nativeImage } = require('electron');
const path = require('path');
const { spawn } = require('child_process');
const http = require('http');

const API_PORT = 8080;
const API_URL = `http://localhost:${API_PORT}`;
let mainWindow = null;
let tray = null;
let apiProcess = null;

// ─── Start API Server ─────────────────────────────────────────────────────────

function startApiServer() {
  const serverPath = path.join(__dirname, '..', 'artifacts', 'api-server', 'dist', 'index.mjs');

  apiProcess = spawn(process.execPath, ['--enable-source-maps', serverPath], {
    env: {
      ...process.env,
      PORT: String(API_PORT),
      NODE_ENV: 'production',
      DATABASE_URL: process.env.DATABASE_URL || 'postgresql://bsch_user:bsch_password@localhost:5432/bsch_db',
    },
    stdio: ['ignore', 'pipe', 'pipe'],
  });

  apiProcess.stdout.on('data', (d) => console.log('[API]', d.toString().trim()));
  apiProcess.stderr.on('data', (d) => console.error('[API ERR]', d.toString().trim()));

  apiProcess.on('exit', (code) => {
    console.log(`API server exited with code ${code}`);
  });
}

// ─── Wait for API to be ready ─────────────────────────────────────────────────

function waitForApi(retries = 30) {
  return new Promise((resolve, reject) => {
    const check = (n) => {
      http.get(`${API_URL}/api/health`, (res) => {
        if (res.statusCode === 200) resolve();
        else if (n > 0) setTimeout(() => check(n - 1), 500);
        else reject(new Error('API server did not start in time'));
      }).on('error', () => {
        if (n > 0) setTimeout(() => check(n - 1), 500);
        else reject(new Error('API server did not start in time'));
      });
    };
    check(retries);
  });
}

// ─── Create Main Window ───────────────────────────────────────────────────────

async function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 900,
    minWidth: 800,
    minHeight: 600,
    title: 'BSCH - نظام إدارة الحالات الطبية',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: false,
      contextIsolation: true,
    },
    autoHideMenuBar: true,
  });

  // Attempt to load; retry if API isn't ready yet
  try {
    await waitForApi();
    mainWindow.loadURL(API_URL);
  } catch (err) {
    mainWindow.loadFile(path.join(__dirname, 'error.html'));
  }

  // Open external links in system browser
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: 'deny' };
  });

  mainWindow.on('closed', () => { mainWindow = null; });
}

// ─── Tray Icon ────────────────────────────────────────────────────────────────

function createTray() {
  const icon = nativeImage.createEmpty(); // Replace with actual icon path
  tray = new Tray(icon);
  tray.setToolTip('BSCH - نظام إدارة الحالات الطبية');

  const contextMenu = Menu.buildFromTemplate([
    { label: 'فتح التطبيق', click: () => { if (mainWindow) mainWindow.focus(); else createWindow(); } },
    { label: 'إعادة تشغيل', click: () => { app.relaunch(); app.exit(0); } },
    { type: 'separator' },
    { label: 'إغلاق', click: () => app.quit() },
  ]);

  tray.setContextMenu(contextMenu);
  tray.on('double-click', () => { if (mainWindow) mainWindow.focus(); else createWindow(); });
}

// ─── App Lifecycle ────────────────────────────────────────────────────────────

app.whenReady().then(async () => {
  startApiServer();
  createTray();
  await createWindow();

  app.on('activate', () => { if (BrowserWindow.getAllWindows().length === 0) createWindow(); });
});

app.on('window-all-closed', () => {
  // Keep app running in tray on Windows/Linux
  if (process.platform === 'darwin') app.quit();
});

app.on('before-quit', () => {
  if (apiProcess) apiProcess.kill();
});
