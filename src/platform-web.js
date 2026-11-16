// Browser implementation of the `api` that preload.js gives the desktop app.
// Everything stays on the device: data in IndexedDB, photos in Cache Storage (served back by sw.js),
// and the AI model runs in the page through onnxruntime-web.
// A cloud backend would be a third implementation of this same object.
if (!window.api) {
  const idb = new Promise((resolve, reject) => {
    const req = indexedDB.open('blueguardian', 1);
    req.onupgradeneeded = () => req.result.createObjectStore('kv');
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
  const kv = async (mode, fn) => {
    const store = (await idb).transaction('kv', mode).objectStore('kv');
    return new Promise((resolve, reject) => {
      const req = fn(store);
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
  };
  const photoUrl = name => new URL('userdata/' + encodeURIComponent(name), location.href).href;
  const photos = () => caches.open('photos');
  const progress = fraction => dispatchEvent(new CustomEvent('ai-progress', { detail: fraction }));

  // The model is ~90 MB: download once with progress, then sw.js keeps it for offline use.
  async function fetchModel() {
    const res = await fetch('models/vision-web.onnx');
    if (!res.ok) throw new Error('model download failed: ' + res.status);
    const total = +res.headers.get('content-length');
    if (!total || !res.body) return res.arrayBuffer();
    const buf = new Uint8Array(total);
    let got = 0;
    for (const reader = res.body.getReader(); ;) {
      const { done, value } = await reader.read();
      if (done) break;
      buf.set(value, got);
      progress((got += value.length) / total);
    }
    return buf;
  }

  let session;
  const loadSession = async () => {
    await new Promise((resolve, reject) => {
      const s = document.createElement('script');
      s.src = 'vendor/ort/ort.wasm.min.js';
      s.onload = resolve;
      s.onerror = () => reject(new Error('could not load the AI runtime'));
      document.head.append(s);
    });
    ort.env.wasm.wasmPaths = new URL('vendor/ort/', location.href).href;
    ort.env.wasm.numThreads = 1; // threads need cross-origin isolation headers, which static hosts don't send
    const s = await ort.InferenceSession.create(await fetchModel());
    progress(null);
    return s;
  };

  window.api = {
    platform: 'web',
    textEmbeds: 'ai/text-embeds-web.json',
    photoUrl,
    // Photos are served by the service worker, so the page must wait until it is in control.
    ready: (async () => {
      await navigator.serviceWorker.register('sw.js');
      await navigator.serviceWorker.ready;
      if (!navigator.serviceWorker.controller)
        await new Promise(r => navigator.serviceWorker.addEventListener('controllerchange', r, { once: true }));
      navigator.storage?.persist?.(); // ask the browser not to evict our data
    })(),
    loadDb: async () => (await kv('readonly', s => s.get('db'))) ?? null,
    saveDb: json => kv('readwrite', s => s.put(JSON.parse(json), 'db')),
    savePhoto: async (bytes, ext) => {
      const name = crypto.randomUUID() + ext;
      await (await photos()).put(photoUrl(name), new Response(bytes, { headers: { 'content-type': 'image/jpeg' } }));
      return name;
    },
    removePhotos: async names => {
      const cache = await photos();
      await Promise.all(names.map(n => cache.delete(photoUrl(n))));
    },
    embed: async pixels => {
      session ??= loadSession();
      const s = await session.catch(e => { session = null; throw e; }); // allow a retry after a failed download
      const out = await s.run({ [s.inputNames[0]]: new ort.Tensor('float32', pixels, [1, 3, 224, 224]) });
      const e = out.image_embeds.data;
      const n = Math.hypot(...e);
      return Float32Array.from(e, x => x / n);
    },
    saveFile: async (name, text) => {
      const a = document.createElement('a');
      a.href = URL.createObjectURL(new Blob([text]));
      a.download = name;
      a.click();
      setTimeout(() => URL.revokeObjectURL(a.href), 1000);
      return true;
    },
  };
}
