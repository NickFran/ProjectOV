console.log("Working");

import { create } from 'domain';
import electron from 'electron';
import path from 'path';
import url from 'url';
import { fileURLToPath } from 'url';

const app = electron.app;
const BrowserWindow = electron.BrowserWindow;

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

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
        pathname: path.join(__dirname, 'modularization.html'),
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