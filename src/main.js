console.log("Working");

const { create } = require('domain');
const electron = require('electron');
const app = electron.app;
const BrowserWindow = electron.BrowserWindow;
const path = require('path');
const url = require('url');

// more secure
// electron.ipcMain.handle("test-thing", async (_, msg) => {
//     console.log(`Test Message ${msg}`)
// })

let win;

function createWindow() {
    win = new BrowserWindow({ 
        width: 1920, height: 1080,
        webPreferences: {
            nodeIntegration: true,
            contextIsolation: false
            //preload: path.join(__dirname, "common", "preload.js")
        }
    });
    win.loadURL(url.format({
        pathname: path.join(__dirname, 'nav.html'),
        protocol: 'file:',
        slashes: true
    }));
    // win.webContents.openDevTools();
    win.on('closed', () => {
        win = null;
    });
}

app.on('ready', createWindow);

app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
        app.quit();
    }
});

app.on('activate', () => {
    if (win === null) {
        createWindow();
    }
});

process.stdout.write("hello: ");