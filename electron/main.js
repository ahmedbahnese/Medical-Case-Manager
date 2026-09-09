/**
 * BSCH Electron Main Process
 * Starts the bundled Express API, then opens the main browser window.
 *
 * Development : npm start  (from electron/ — expects workspace builds)
 * Production  : built with electron-builder (nsis / portable)
 */

const { app, BrowserWindow, shell, Menu, Tray, nativeImage, dialog, ipcMain, powerSaveBlocker } = require('electron');
const path = require('path');
const { spawn, execFileSync } = require('child_process');
const http = require('http');
const fs = require('fs');

// Windows 7 Chromium GPU drivers can render a completely white window.
app.disableHardwareAcceleration();
app.commandLine.appendSwitch('disable-gpu');
app.commandLine.appendSwitch('disable-gpu-compositing');

const API_PORT = 8080;
// Use the IPv4 loopback explicitly. On Windows 7, `localhost` may resolve to
// IPv6 first while the bundled server listens on IPv4, producing a blank page.
const API_HOST = '127.0.0.1';
const API_URL  = `http://${API_HOST}:${API_PORT}`;

let mainWindow = null;
let tray       = null;
let apiProcess = null;
let apiStartError = null;
let isQuitting = false;
let isHidingWindow = false;
let sleepBlockerId = null;
const startHidden = process.argv.includes('--hidden') || app.getLoginItemSettings().wasOpenedAtLogin;

function writeDiagnostic(message) {
  try {
    const dir = app.getPath('userData');
    fs.mkdirSync(dir, { recursive: true });
    fs.appendFileSync(path.join(dir, 'electron.log'), `[${new Date().toISOString()}] ${message}\n`);
  } catch (_) {}
}

process.on('uncaughtException', (err) => writeDiagnostic(`uncaughtException: ${err?.stack || err}`));
process.on('unhandledRejection', (err) => writeDiagnostic(`unhandledRejection: ${err?.stack || err}`));

function keepServerAvailable() {
  if (sleepBlockerId !== null) return;
  // A real Windows Sleep/Standby suspends all user processes. This keeps the
  // machine awake while Windows may still turn off the display.
  sleepBlockerId = powerSaveBlocker.start('prevent-app-suspension');
  writeDiagnostic(`powerSaveBlocker started: ${sleepBlockerId}`);
}

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

const SERVER_ENTRY   = isDev
  ? getResourcePath('artifacts', 'api-server', 'dist', 'index.mjs')
  : getResourcePath('api-server', 'dist', 'index.mjs');

const FRONTEND_DIR   = isDev
  ? getResourcePath('artifacts', 'bsch', 'dist', 'public')
  : getResourcePath('public');

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
  apiProcess.stderr.on('data', (d) => {
    const text = d.toString().trim();
    if (text) apiStartError = text.slice(-4000);
    if (text) writeDiagnostic(`API ERR: ${text}`);
    console.error('[API ERR]', text);
  });
  apiProcess.on('error', (err) => {
    apiStartError = err && err.message ? err.message : String(err);
    console.error('[API SPAWN ERR]', apiStartError);
  });
  apiProcess.on('exit', (code, signal) => {
    const detail = apiStartError ? ` — ${apiStartError}` : '';
    console.log(`API server exited — code=${code} signal=${signal}${detail}`);
    writeDiagnostic(`API exited — code=${code} signal=${signal}${detail}`);
    if (!isQuitting && code !== 0 && !apiStartError) {
      apiStartError = `API process exited with code ${code || 'unknown'}${signal ? ` (${signal})` : ''}`;
    }
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
        else reject(new Error(apiStartError || 'API server did not start in time'));
      }).on('error', () => {
        if (n > 0) setTimeout(() => check(n - 1), delayMs);
        else reject(new Error(apiStartError || 'API server did not start in time'));
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

  mainWindow.webContents.on('console-message', (_event, level, message, line, sourceId) => {
    writeDiagnostic(`renderer console level=${level}: ${message} (${sourceId}:${line})`);
  });
  mainWindow.webContents.on('render-process-gone', (_event, details) => {
    writeDiagnostic(`renderer gone: ${JSON.stringify(details)}`);
  });

  try {
    await waitForApi();
    mainWindow.webContents.on('did-fail-load', (_event, errorCode, errorDescription, validatedURL) => {
      writeDiagnostic(`did-fail-load: ${errorCode} ${errorDescription} ${validatedURL}`);
      if (isQuitting) return;
      const details = encodeURIComponent(`${errorDescription} (${errorCode})\n${validatedURL}`);
      mainWindow.loadURL('file://' + path.join(__dirname, 'error.html') + '?message=' + details);
      if (!startHidden) mainWindow.show();
    });
    mainWindow.loadURL(API_URL);
    mainWindow.webContents.once('did-finish-load', () => {
      if (splashWindow) { splashWindow.close(); splashWindow = null; }
      if (!startHidden) {
        mainWindow.show();
        mainWindow.focus();
      }
    });
    mainWindow.once('ready-to-show', () => {
      if (splashWindow) { splashWindow.close(); splashWindow = null; }
      if (!startHidden) {
        mainWindow.show();
        mainWindow.focus();
      }
    });
  } catch (err) {
    if (splashWindow) { splashWindow.close(); splashWindow = null; }
    const details = encodeURIComponent(err && err.message ? err.message : 'سبب غير معروف');
    mainWindow.loadURL('file://' + path.join(__dirname, 'error.html') + '?message=' + details);
    if (!startHidden) mainWindow.show();
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

  mainWindow.on('close', (event) => {
    if (!isQuitting && !isHidingWindow) {
      event.preventDefault();
      isHidingWindow = true;
      mainWindow.hide();
      isHidingWindow = false;
    }
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
    { label: 'تشغيل تلقائيًا مع Windows', type: 'checkbox', checked: true, click: (item) => {
      app.setLoginItemSettings({ openAtLogin: item.checked, args: ['--hidden'] });
    } },
    { label: 'إعادة تشغيل',  click: () => { app.relaunch(); app.exit(0); } },
    { type: 'separator' },
    { label: 'إغلاق التطبيق', click: () => app.quit() },
  ]);

  tray.setContextMenu(contextMenu);
  tray.on('double-click', () => { if (mainWindow) mainWindow.focus(); else createWindow(); });
}

// ─── App Lifecycle ────────────────────────────────────────────────────────────

app.whenReady().then(async () => {
  keepServerAvailable();
  app.setLoginItemSettings({ openAtLogin: true, args: ['--hidden'] });
  if (!startHidden) createSplash();
  startApiServer();
  createTray();
  await createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

// Closing the main window must fully terminate BSCH. The tray is only a
// convenience while the app is running; it must not leave a hidden server.
app.on('window-all-closed', () => {
  // Keep the API server alive; exit explicitly from the tray menu.
});

function stopApiServer() {
  const child = apiProcess;
  apiProcess = null;
  if (!child || child.killed) return;

  // On Windows, kill the whole process tree. Electron may otherwise leave
  // the Node API child alive after the window has closed.
  if (process.platform === 'win32' && child.pid) {
    try {
      execFileSync('taskkill', ['/pid', String(child.pid), '/t', '/f'], { windowsHide: true });
    } catch (_) {
      try { child.kill(); } catch (_) {}
    }
  } else {
    try { child.kill('SIGTERM'); } catch (_) {}
  }
}

ipcMain.handle('select-update-package', async () => {
  const result = await dialog.showOpenDialog({
    title: 'اختيار حزمة تحديث BSCH',
    filters: [{ name: 'BSCH Setup', extensions: ['exe'] }],
    properties: ['openFile'],
  });
  if (result.canceled || !result.filePaths[0]) return { canceled: true };
  const selected = result.filePaths[0];
  if (!/^BSCH[-_].*\.exe$/i.test(path.basename(selected))) {
    return { canceled: true, error: 'اختر ملف تثبيت BSCH فقط' };
  }
  return { canceled: false, path: selected, name: path.basename(selected) };
});

ipcMain.handle('launch-update-package', async (_event, selectedPath) => {
  if (typeof selectedPath !== 'string' || !/^BSCH[-_].*\.exe$/i.test(path.basename(selectedPath))) {
    return { ok: false, error: 'ملف التحديث غير صالح' };
  }
  const error = await shell.openPath(selectedPath);
  if (error) return { ok: false, error };
  setTimeout(() => app.quit(), 500);
  return { ok: true };
});

app.on('before-quit', (event) => {
  if (isQuitting) return;
  isQuitting = true;
  event.preventDefault();
  if (tray && !tray.isDestroyed()) tray.destroy();
  if (splashWindow && !splashWindow.isDestroyed()) splashWindow.close();
  stopApiServer();
  // Give the child process a moment to release SQLite and its port.
  setTimeout(() => app.exit(0), 250);
});
