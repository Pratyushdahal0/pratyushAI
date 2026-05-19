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

  // Allow mic permission
  win.webContents.session.setPermissionRequestHandler((webContents, permission, callback) => {
    const allowed = ["media", "microphone", "audioCapture"];
    callback(allowed.includes(permission));
  });

  win.webContents.session.setPermissionCheckHandler((webContents, permission) => {
    const allowed = ["media", "microphone", "audioCapture"];
    return allowed.includes(permission);
  });
}

app.whenReady().then(createWindow);