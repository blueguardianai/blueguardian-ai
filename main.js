const { app, BrowserWindow, ipcMain, dialog, protocol, net, shell, nativeTheme } = require('electron');
const path = require('node:path');
const fs = require('node:fs');
const crypto = require('node:crypto');
const { pathToFileURL } = require('node:url');

const DATA = app.getPath('userData');
const PHOTOS = path.join(DATA, 'photos');
const DB = path.join(DATA, 'db.json');
const MODEL = app.isPackaged
  ? path.join(process.resourcesPath, 'models', 'vision.onnx')
  : path.join(__dirname, 'models', 'vision.onnx');

app.commandLine.appendSwitch('lang', 'el'); // Greek date pickers and native dialogs

protocol.registerSchemesAsPrivileged([
  { scheme: 'app', privileges: { standard: true, secure: true, supportFetchAPI: true } },
]);

// app://bundle/<file>          -> app files
// app://bundle/userdata/<file> -> photos the students added
function resolveAppUrl(url) {
  const rel = decodeURIComponent(new URL(url).pathname);
  const [base, sub] = rel.startsWith('/userdata/')
    ? [PHOTOS, rel.slice('/userdata/'.length)]
    : [__dirname, rel];
  const file = path.resolve(base, '.' + path.sep + sub);
  if (file !== base && !file.startsWith(base + path.sep)) return null; // no ../ escapes
  return file;
}

let session; // onnxruntime session, loaded on first use
async function embed(pixels) {
  const ort = require('onnxruntime-node');
  session ??= await ort.InferenceSession.create(MODEL);
  const input = new ort.Tensor('float32', pixels, [1, 3, 224, 224]);
  const out = await session.run({ [session.inputNames[0]]: input });
  const e = out.image_embeds.data;
  const n = Math.hypot(...e);
  return Float32Array.from(e, x => x / n);
}

function createWindow() {
  const win = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 1000,
    minHeight: 650,
    title: 'BlueGuardian AI',
    icon: path.join(__dirname, 'build', 'icon.png'),
    backgroundColor: nativeTheme.shouldUseDarkColors ? '#0b0e13' : '#f5f7fa',
    autoHideMenuBar: true,
    webPreferences: { preload: path.join(__dirname, 'preload.js') },
  });
  win.loadURL('app://bundle/src/index.html');
  // External links (OpenStreetMap / Copernicus credits) open in the browser.
  win.webContents.setWindowOpenHandler(({ url }) => {
    if (/^https:\/\//.test(url)) shell.openExternal(url);
    return { action: 'deny' };
  });
}

app.whenReady().then(() => {
  fs.mkdirSync(PHOTOS, { recursive: true });

  protocol.handle('app', req => {
    const file = resolveAppUrl(req.url);
    if (!file) return new Response('forbidden', { status: 403 });
    return net.fetch(pathToFileURL(file).toString());
  });

  ipcMain.handle('db:load', () => (fs.existsSync(DB) ? JSON.parse(fs.readFileSync(DB, 'utf8')) : null));

  // Write to a temp file then rename, so a crash mid-save never corrupts the data.
  ipcMain.handle('db:save', (_e, json) => {
    JSON.parse(json); // refuse to write garbage
    fs.writeFileSync(DB + '.tmp', json);
    fs.renameSync(DB + '.tmp', DB);
  });

  // The page resizes photos to JPEG first, so only image bytes and a known extension arrive here.
  ipcMain.handle('photos:save', (_e, bytes, ext) => {
    if (!['.jpg', '.png', '.webp'].includes(ext)) throw new Error('unsupported image type');
    const name = crypto.randomUUID() + ext;
    fs.writeFileSync(path.join(PHOTOS, name), Buffer.from(bytes));
    return name;
  });

  ipcMain.handle('photos:remove', (_e, names) => {
    for (const n of names) {
      const file = resolveAppUrl('app://bundle/userdata/' + encodeURIComponent(n));
      if (file && file !== PHOTOS) fs.rmSync(file, { force: true });
    }
  });

  ipcMain.handle('ai:embed', (_e, pixels) => embed(pixels));

  ipcMain.handle('file:save', async (e, name, text) => {
    const ext = path.extname(name).slice(1);
    const { canceled, filePath } = await dialog.showSaveDialog(BrowserWindow.fromWebContents(e.sender), {
      defaultPath: name,
      filters: [{ name: ext.toUpperCase(), extensions: [ext] }],
    });
    if (canceled) return false;
    fs.writeFileSync(filePath, text);
    return true;
  });

  createWindow();
  app.on('activate', () => BrowserWindow.getAllWindows().length || createWindow());
});

app.on('window-all-closed', () => process.platform === 'darwin' || app.quit());
