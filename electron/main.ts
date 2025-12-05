import { app, BrowserWindow, globalShortcut, Tray, Menu, ipcMain, nativeImage, desktopCapturer, screen } from 'electron';
import * as path from 'path';

let mainWindow: BrowserWindow | null = null;
let tray: Tray | null = null;

const isDev = process.env.NODE_ENV === 'development';

function createWindow() {
  const { width, height } = screen.getPrimaryDisplay().workAreaSize;

  mainWindow = new BrowserWindow({
    width: 900,
    height: 600,
    minWidth: 400,
    minHeight: 300,
    frame: false,
    transparent: true,
    alwaysOnTop: true,
    skipTaskbar: true,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: false,
      contextIsolation: true,
      webSecurity: false // Needed to load local images/blobs sometimes
    },
  });

  if (isDev) {
    mainWindow.loadURL('http://localhost:5173');
  } else {
    mainWindow.loadFile(path.join(__dirname, '../dist/index.html'));
  }

  // Hide instead of close
  mainWindow.on('close', (event) => {
    if (!(app as any).isQuitting) {
      event.preventDefault();
      mainWindow?.hide();
    }
  });
}

function createTray() {
  const icon = nativeImage.createEmpty(); // Replace with real icon path later
  tray = new Tray(icon);
  tray.setToolTip('OverSolve');
  tray.setContextMenu(Menu.buildFromTemplate([
    { label: 'Show Overlay', click: () => mainWindow?.show() },
    { type: 'separator' },
    { label: 'Quit', click: () => {
      (app as any).isQuitting = true;
      app.quit();
    }}
  ]));
}

function toggleWindow() {
  if (mainWindow?.isVisible()) {
    mainWindow.hide();
  } else {
    mainWindow?.show();
    mainWindow?.focus();
  }
}

app.whenReady().then(() => {
  createWindow();
  createTray();

  globalShortcut.register('CommandOrControl+Shift+Space', toggleWindow);
});

// --- IPC HANDLERS ---

ipcMain.on('window-hide', () => mainWindow?.hide());
ipcMain.on('window-minimize', () => mainWindow?.minimize());

// Capture Screen Handler
ipcMain.handle('capture-screen', async () => {
  // 1. Get the primary display size to ensure high-quality capture
  const primaryDisplay = screen.getPrimaryDisplay();
  const { width, height } = primaryDisplay.size;
  
  // 2. Capture all screens
  const sources = await desktopCapturer.getSources({ 
    types: ['screen'], 
    thumbnailSize: { width: width, height: height } 
  });

  // 3. Return the first screen's image as Data URL
  // (In multi-monitor setups, you might want to pick the active one)
  return sources[0].thumbnail.toDataURL();
});