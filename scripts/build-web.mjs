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
cp('node_modules/qrcode-generator/qrcode.js', 'app/vendor/qrcode.js');
for (const f of ['ort.wasm.min.js', 'ort-wasm-simd-threaded.mjs', 'ort-wasm-simd-threaded.wasm'])
  cp(`node_modules/onnxruntime-web/dist/${f}`, `app/vendor/ort/${f}`);
cp('models/vision-web.onnx', 'app/models/vision-web.onnx');
fs.rmSync(path.join(out, 'app/ai/text-embeds.json')); // desktop model only

// The desktop app loads libraries from node_modules; the website loads the copies above.
const page = path.join(out, 'app/index.html');
fs.writeFileSync(page, fs.readFileSync(page, 'utf8')
  .replaceAll('../node_modules/leaflet/dist/', 'vendor/leaflet/')
  .replaceAll('../node_modules/chart.js/dist/', 'vendor/')
  .replaceAll('../node_modules/qrcode-generator/', 'vendor/'));

// Not-found page: the privacy page's frame with a short message. GitHub Pages serves it at any
// depth, so every local link is made absolute.
const privacy = fs.readFileSync(path.join(out, 'privacy.html'), 'utf8');
fs.writeFileSync(path.join(out, '404.html'), privacy
  .replace(/<title>.*<\/title>/, '<title>404 · BlueGuardian AI</title>')
  .replace(/<main[\s\S]*<\/main>/, `<main class="prose">
    <section>
      <h1><span lang="el">Η σελίδα δεν βρέθηκε</span><span lang="en">Page not found</span></h1>
      <p><span lang="el">Ο σύνδεσμος μπορεί να είναι παλιός ή να έχει λάθος.</span><span lang="en">The link may be old or mistyped.</span></p>
      <p style="display:flex;flex-wrap:wrap;gap:10px;margin-top:24px"><a class="btn primary" href="/"><span lang="el">Αρχική σελίδα</span><span lang="en">Home page</span></a> <a class="btn" href="/app/"><span lang="el">Άνοιγμα εφαρμογής</span><span lang="en">Open the app</span></a></p>
    </section>
  </main>`)
  .replace(/(href|src)="(?!https?:|#|mailto:|\/)(\.\/)?/g, '$1="/'));

// Browsers keep site files for up to 10 minutes; a build stamp in the URL makes every deploy load fresh.
const version = Date.now().toString(36);
for (const f of ['index.html', 'privacy.html', 'code-signing.html', '404.html']) {
  const file = path.join(out, f);
  fs.writeFileSync(file, fs.readFileSync(file, 'utf8').replace(/(site\.css|site\.js|app\/theme\.js)"/g, `$1?v=${version}"`));
}

const size = dir => fs.readdirSync(dir, { recursive: true, withFileTypes: true })
  .reduce((n, e) => n + (e.isFile() ? fs.statSync(path.join(e.parentPath, e.name)).size : 0), 0);
console.log(`dist/web: ${(size(out) / 1e6).toFixed(0)} MB`);
