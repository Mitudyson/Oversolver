import { contextBridge, ipcRenderer } from 'electron';

contextBridge.exposeInMainWorld('electron', {
  hideWindow: () => ipcRenderer.send('window-hide'),
  minimizeWindow: () => ipcRenderer.send('window-minimize'),
  onShow: (callback: () => void) => ipcRenderer.on('window-show', callback),
});
