// Assembles the static website into dist/web:
//   /        the landing page (site/)
//   /app/    the same app as the desktop build (src/), with its libraries and the browser AI model
// Upload the folder to any static host. It needs no server code and holds no secrets.
import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve(import.meta.dirname, '..');
const out = path.join(root, 'dist/web');
const cp = (from, to) => fs.cpSync(path.join(root, from), path.join(out, to), { recursive: true });

fs.rmSync(out, { recursive: true, force: true });
cp('site', '.');
cp('src', 'app');
cp('build/icon.png', 'build/icon.png');
cp('build/favicon.png', 'build/favicon.png'); // transparent, cropped tab icon
for (const f of ['leaflet.js', 'leaflet.css', 'images']) cp(`node_modules/leaflet/dist/${f}`, `app/vendor/leaflet/${f}`);
cp('node_modules/chart.js/dist/chart.umd.min.js', 'app/vendor/chart.umd.min.js');
for (const f of ['ort.wasm.min.js', 'ort-wasm-simd-threaded.mjs', 'ort-wasm-simd-threaded.wasm'])
  cp(`node_modules/onnxruntime-web/dist/${f}`, `app/vendor/ort/${f}`);
cp('models/vision-web.onnx', 'app/models/vision-web.onnx');
fs.rmSync(path.join(out, 'app/ai/text-embeds.json')); // desktop model only

// The desktop app loads libraries from node_modules; the website loads the copies above.
const page = path.join(out, 'app/index.html');
fs.writeFileSync(page, fs.readFileSync(page, 'utf8')
  .replaceAll('../node_modules/leaflet/dist/', 'vendor/leaflet/')
  .replaceAll('../node_modules/chart.js/dist/', 'vendor/'));

const size = dir => fs.readdirSync(dir, { recursive: true, withFileTypes: true })
  .reduce((n, e) => n + (e.isFile() ? fs.statSync(path.join(e.parentPath, e.name)).size : 0), 0);
console.log(`dist/web: ${(size(out) / 1e6).toFixed(0)} MB`);
