const { app, BrowserWindow } = require("electron");

app.commandLine.appendSwitch("autoplay-policy", "no-user-gesture-required");

function createWindow() {
  const win = new BrowserWindow({
    width: 380,
    height: 600,
    resizable: false,
    title: "Pratyush AI",
    alwaysOnTop: true,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false
    }
  });

  win.loadFile("index.html");

  win.webContents.session.setPermissionRequestHandler((webContents, permission, callback) => {
    callback(true);
  });

  win.webContents.session.setPermissionCheckHandler(() => {
    return true;
  });

  win.webContents.on("crashed", () => { win.reload(); });
  win.webContents.on("unresponsive", () => { win.reload(); });
}

app.whenReady().then(createWindow);

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});

app.on("activate", () => {
  if (BrowserWindow.getAllWindows().length === 0) createWindow();
});