// Electron preload script
// Exposes safe APIs to the renderer process via contextBridge
const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  platform: process.platform,
  version: process.versions.electron,
  savePDF: (html, title) => ipcRenderer.invoke('save-pdf', { html, title }),
  selectUpdatePackage: () => ipcRenderer.invoke('select-update-package'),
  runUpdatePackage: (filePath) => ipcRenderer.invoke('run-update-package', filePath),
});
