import { app, BrowserWindow, shell } from 'electron';
import path from 'path';

const isDev = !app.isPackaged;

// Set userData path BEFORE importing server to guarantee env var is set when db.js evaluates
process.env.ELECTRON_USER_DATA = app.getPath('userData');

let startServer, stopServer;
let mainWindow = null;

async function createWindow() {
  // In production, start the server. In dev, it's already running as a separate process.
  if (!isDev) {
    // Import server functions dynamically to ensure ELECTRON_USER_DATA is set first
    ({ startServer, stopServer } = await import('../server/index.js'));
    // Start Express server
    await startServer();
  }

  // In dev mode, appPath is the root directory; in production it's the app bundle
  const appPath = isDev ? process.cwd() : app.getAppPath();
  const preloadPath = path.join(appPath, 'electron', 'preload.js');
  const distPath = path.join(appPath, 'dist', 'index.html');

  mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    minWidth: 900,
    minHeight: 600,
    titleBarStyle: 'hiddenInset',
    webPreferences: {
      preload: preloadPath,
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: true,
    },
  });

  if (isDev) {
    mainWindow.loadURL('http://localhost:5173');
    mainWindow.webContents.openDevTools();
  } else {
    mainWindow.loadFile(distPath);
  }

  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: 'deny' };
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

app.whenReady().then(createWindow);

app.on('window-all-closed', async () => {
  // Only stop server in production (in dev it's a separate process)
  if (stopServer && !isDev) await stopServer();
  if (process.platform !== 'darwin') app.quit();
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) createWindow();
});

process.on('SIGTERM', async () => {
  console.log('[main] received SIGTERM, shutting down');
  if (stopServer && !isDev) await stopServer();
  app.quit();
});

process.on('SIGINT', async () => {
  console.log('[main] received SIGINT, shutting down');
  if (stopServer && !isDev) await stopServer();
  app.quit();
});
