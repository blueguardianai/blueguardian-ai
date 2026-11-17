import { predict } from './ai/predict.js';
import { t, lang, translate } from './i18n.js';
import { renderLab, renderGame } from './ideas.js';
import { listShared, shareVisit, unshareVisit, reportVisit, moderate, sharedPhotoUrl } from './cloud.js';

// Install as an app (Chrome, Edge, Android): keep the browser's install prompt and offer it on the dashboard.
// Registered before the first await so an early event is not missed. Safari and the desktop app never send it.
let installPrompt;
addEventListener('beforeinstallprompt', e => {
  if (localStorage.installLater) return; // dismissed: leave it to the browser's own menu
  e.preventDefault();
  installPrompt = e;
  document.querySelector('#install-banner').hidden = false;
});
addEventListener('appinstalled', () => { document.querySelector('#install-banner').hidden = true; });

await api.ready; // website: wait for the service worker that serves the photos
translate();

const CLASSES = await (await fetch('ai/classes.json')).json();
const TEXT = await (await fetch(api.textEmbeds)).json();
const LOCALE = lang === 'el' ? 'el-GR' : 'en-GB';
const DAY = 864e5;
// CLIP image preprocessing (openai/clip-vit-*): 224x224, these mean/std per channel.
const MEAN = [0.48145466, 0.4578275, 0.40821073];
const STD = [0.26862954, 0.26130258, 0.27577711];

const $ = s => document.querySelector(s);
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => `&#${c.charCodeAt(0)};`);
const fmtDate = d => new Date(d).toLocaleString(LOCALE, { dateStyle: 'medium', timeStyle: 'short' });
const localIso = ms => new Date(ms - new Date().getTimezoneOffset() * 6e4).toISOString().slice(0, 16);
const num = v => (v === '' || v == null ? null : Number(v));
const icon = name => `<svg class="i" aria-hidden="true"><use href="#i-${name}"/></svg>`;
const pctOf = p => (p * 100).toFixed(0);
const cname = c => c[lang];
const stage = s => t('stage_' + s);

// Chart.js can't read CSS variables or oklch(): resolve any CSS color to rgba() through a 1px canvas.
const probe = document.body.appendChild(document.createElement('i'));
probe.style.setProperty('transition', 'none', 'important'); // the reduced-motion rule would make it report the previous color
const px = new OffscreenCanvas(1, 1).getContext('2d', { willReadFrequently: true });
function css(color) {
  probe.style.color = color;
  px.clearRect(0, 0, 1, 1);
  px.fillStyle = getComputedStyle(probe).color;
  px.fillRect(0, 0, 1, 1);
  const [r, g, b, a] = px.getImageData(0, 0, 1, 1).data;
  return `rgba(${r},${g},${b},${(a / 255).toFixed(2)})`;
}

const stored = await api.loadDb();
let db = stored ?? { version: 1, observations: [] };
// Embeddings only compare within one model: the desktop app and the website use different ones.
if (db.model !== TEXT.model) {
  for (const o of db.observations) for (const p of o.photos) p.emb = null;
  db.model = TEXT.model;
}
let saveTimer;
const save = () => {
  clearTimeout(saveTimer);
  saveTimer = setTimeout(() => api.saveDb(JSON.stringify(db)), 300);
};

// ---------- AI ----------

async function pixelsFor(file) {
  const blob = await (await fetch(api.photoUrl(file))).blob();
  const full = await createImageBitmap(blob); // applies EXIF rotation
  const s = 224 / Math.min(full.width, full.height);
  const w = Math.round(full.width * s), h = Math.round(full.height * s);
  const bmp = await createImageBitmap(full, { resizeWidth: w, resizeHeight: h, resizeQuality: 'high' });
  const g = new OffscreenCanvas(224, 224).getContext('2d');
  g.drawImage(bmp, Math.round((224 - w) / 2), Math.round((224 - h) / 2)); // center crop
  const d = g.getImageData(0, 0, 224, 224).data;
  const out = new Float32Array(3 * 224 * 224);
  for (let i = 0; i < 224 * 224; i++)
    for (let c = 0; c < 3; c++) out[c * 224 * 224 + i] = (d[i * 4 + c] / 255 - MEAN[c]) / STD[c];
  return out;
}

async function analyze(photo) {
  const e = await api.embed(await pixelsFor(photo.file));
  photo.emb = Array.from(e, x => Math.round(x * 1e4) / 1e4);
}

const allPhotos = () => db.observations.flatMap(o => o.photos.map(p => ({ ...p, obs: o, ref: p })));
const examples = skip =>
  allPhotos()
    .filter(p => p.label && p.emb && p.ref !== skip)
    .map(p => ({ emb: p.emb, k: CLASSES.findIndex(c => c.id === p.label) }));

// The class a photo counts as: the student's label if verified, else the AI's guess.
function classify(photo) {
  if (!photo.emb) return null;
  const { k, probs } = predict(photo.emb, TEXT.classes, examples(photo));
  return { ai: CLASSES[k].id, probs, final: photo.label ?? CLASSES[k].id };
}

// Website only: the model downloads on first use, so say how far along it is.
let modelPct = null;
const busyText = () => (modelPct == null ? t('analyzing') : t('downloading', { pct: modelPct }));
addEventListener('ai-progress', e => {
  modelPct = e.detail == null ? null : Math.round(e.detail * 100);
  document.querySelectorAll('.busy').forEach(el => { el.textContent = busyText(); });
});

// ---------- photo cards ----------

let fresh; // the photo whose label was just clicked: only its check icon animates in
function photoCard(photo, { onChange, onRemove } = {}) {
  const el = document.createElement('div');
  el.className = 'photo';
  const render = () => {
    const r = classify(photo);
    // Each probability row is also the correction button: click the right class, click again to undo.
    const rows = r
      ? CLASSES.map((c, i) => {
          const on = photo.label === c.id;
          return `
          <button type="button" class="bar ${on ? 'active' : ''} ${on && photo === fresh ? 'fresh' : ''}" data-k="${c.id}"
                  style="--c:${c.color};--w:${pctOf(r.probs[i])}%" title="${t('correct', { cls: cname(c) })}" aria-pressed="${on}">
            ${on ? icon('check') : '<i class="dot"></i>'}<span>${cname(c)}</span>
            <i class="track"><i></i></i><b>${pctOf(r.probs[i])}%</b></button>`;
        }).join('')
      : errors.has(photo) ? `<p class="err">${esc(errors.get(photo))}</p>` : `<p class="busy">${busyText()}</p>`;
    const top = r && CLASSES.find(c => c.id === r.final);
    el.innerHTML = `
      <img src="${api.photoUrl(photo.file)}" loading="lazy" decoding="async" alt="">
      ${onRemove ? `<button type="button" class="x" title="${t('remove')}" aria-label="${t('remove')}">${icon('x')}</button>` : ''}
      ${top ? `<div class="verdict" style="--c:${top.color}"><i class="dot"></i><b>${cname(top)}</b>
                 <small>${t(photo.label ? 'isChecked' : 'isGuess')}</small></div>` : ''}
      <div class="bars">${rows}</div>`;
    el.querySelectorAll('.bar').forEach(b => b.onclick = () => {
      photo.label = photo.label === b.dataset.k ? null : b.dataset.k;
      fresh = photo;
      onChange?.();
      fresh = null;
    });
    el.querySelector('.x')?.addEventListener('click', () => onRemove(photo));
  };
  render();
  el.render = render;
  return el;
}

const busy = new WeakSet(), errors = new WeakMap();
async function analyzeAll(photos, rerender) {
  for (const p of photos.filter(p => !p.emb && !busy.has(p) && !errors.has(p))) {
    busy.add(p);
    try { await analyze(p); save(); }
    catch (e) { errors.set(p, t('aiError', { msg: e.message.replace(/^Error invoking remote method '[^']+': /, '') })); }
    busy.delete(p);
    rerender();
  }
}

// Phone photos are several MB each: shrink to 1600px JPEG before storing, so backups and browser storage stay small.
async function storePhoto(blob) {
  const bmp = await createImageBitmap(blob); // throws for files that are not images
  const s = Math.min(1, 1600 / Math.max(bmp.width, bmp.height));
  const canvas = new OffscreenCanvas(Math.round(bmp.width * s), Math.round(bmp.height * s));
  canvas.getContext('2d').drawImage(bmp, 0, 0, canvas.width, canvas.height);
  const jpeg = await canvas.convertToBlob({ type: 'image/jpeg', quality: 0.85 });
  return api.savePhoto(await jpeg.arrayBuffer(), '.jpg');
}

// ---------- tabs ----------

const pages = { dashboard: renderDashboard, observations: renderObservations, ai: renderAi, compare: renderCompare, ideas: renderIdeas, community: renderCommunity, data: renderData };
let current = 'dashboard';
function show(tab) {
  const swap = () => {
    document.querySelectorAll('.tab, .page').forEach(x => x.classList.remove('active', 'entering'));
    $(`.tab[data-tab="${tab}"]`).classList.add('active');
    $('#' + tab).classList.add('active', 'entering'); // rows stagger in only while the page is opening, not on every re-render
    setTimeout(() => $('#' + tab).classList.remove('entering'), 700);
    current = tab;
    render();
  };
  document.startViewTransition ? document.startViewTransition(swap) : swap();
}
document.querySelectorAll('.tab').forEach(b => b.onclick = () => show(b.dataset.tab));
function render() {
  const todo = allPhotos().filter(p => !p.label).length;
  $('#todo-count').textContent = todo;
  $('#todo-count').hidden = !todo;
  pages[current]();
}
const refresh = () => { save(); render(); };

// Dialogs grow out of, and shrink back into, whatever was pressed to open them. A modal dialog is centred,
// so the origin is the press point measured from the middle of the screen; no layout is needed yet.
let press;
addEventListener('pointerdown', e => press = e, true);
addEventListener('beforetoggle', e => {
  if (e.target instanceof HTMLDialogElement && e.newState === 'open' && press)
    e.target.style.transformOrigin = `calc(50% + ${press.clientX - innerWidth / 2}px) calc(50% + ${press.clientY - innerHeight / 2}px)`;
}, true);

// Segmented control: the knob slides to the active button and stretches 12% on the way.
function placeKnob(seg, move) {
  const a = seg.querySelector('.active');
  if (!a?.offsetWidth) return;
  seg.style.setProperty('--x', a.offsetLeft + 'px');
  seg.style.setProperty('--w', a.offsetWidth + 'px');
  seg.classList.add('ready');
  if (move) seg.animate({ scale: [1, '1.12 1', 1] }, { duration: 250, easing: 'ease-in-out', pseudoElement: '::before' });
}

// ---------- shared ----------

function sites() {
  const m = new Map();
  for (const o of [...db.observations].sort((a, b) => a.date.localeCompare(b.date))) m.set(o.site, o);
  return m; // site name -> latest observation
}
const visitsAt = site => db.observations.filter(o => o.site === site).sort((a, b) => a.date.localeCompare(b.date));

function fillSiteSelect(sel) {
  const names = [...sites().keys()];
  const keep = sel.value;
  sel.innerHTML = names.map(n => `<option>${esc(n)}</option>`).join('');
  sel.hidden = !names.length;
  if (names.includes(keep)) sel.value = keep;
}

function classShare(obsList) {
  const counts = Object.fromEntries(CLASSES.map(c => [c.id, 0]));
  let n = 0;
  for (const o of obsList) for (const p of o.photos) {
    const r = classify(p);
    if (r) { counts[r.final]++; n++; }
  }
  return { counts, n };
}
const wastePct = obsList => {
  const s = classShare(obsList);
  return s.n ? Math.round(((s.counts.plastic + s.counts.other) / s.n) * 100) : null;
};

const tile = (value, label) => `<div class="tile"><span>${label}</span><b>${value}</b></div>`;
const thumbs = (o, cls = '') =>
  `<div class="thumbs ${cls}">${o.photos.slice(0, 4).map(p => `<img src="${api.photoUrl(p.file)}" loading="lazy" alt="">`).join('')}</div>`;
// `o` is a local visit or a shared one; both carry temp, ph and litter.
const metrics = o => [
  o.temp != null && `<span>${icon('thermometer')}${o.temp} °C</span>`,
  o.ph != null && `<span>${icon('droplet')}pH ${o.ph}</span>`,
  o.litter != null && `<span>${icon('trash')}${o.litter} ${t('items')}</span>`,
].filter(Boolean).join('');
const emptyState = (text, button, id) =>
  `<div class="empty"><p>${text}</p>${button ? `<button class="btn primary" id="${id}">${button}</button>` : ''}</div>`;

// ---------- guide ----------

// The four steps tick themselves off from the student's own data (the example beach doesn't count).
function guideSteps() {
  const own = db.observations.filter(o => !o.demo);
  const photos = own.flatMap(o => o.photos);
  const has = (site, s) => own.some(o => o.site === site && o.stage === s);
  return [
    { key: 'Visit', done: own.length > 0, go: () => openObs(null) },
    { key: 'Photos', done: photos.length > 0, go: () => openObs(own.at(-1) ?? null) },
    { key: 'Check', done: photos.some(p => p.label), go: () => show('ai') },
    { key: 'Compare', done: own.some(o => has(o.site, 'before') && has(o.site, 'after')), go: () => show('compare') },
  ];
}

function renderGuide() {
  const box = $('#guide');
  box.hidden = localStorage.guide === 'off';
  if (box.hidden) return;
  const steps = guideSteps();
  const next = steps.find(s => !s.done);
  box.innerHTML = `
    <h2><span>${t('guideTitle')} <small>${steps.filter(s => s.done).length}/${steps.length}</small></span>
      <button class="btn" id="guide-hide">${t('guideHide')}</button></h2>
    ${next ? `<ol class="steps">${steps.map(s => `
      <li class="step ${s.done ? 'done' : s === next ? 'next' : ''}">
        <b>${t('step' + s.key)}</b><p>${t('step' + s.key + 'Text')}</p>
        ${s === next ? `<button class="btn primary" id="guide-go">${t('start')}${icon('arrow')}</button>` : ''}
      </li>`).join('')}</ol>` : `<p class="hint">${t('guideDone')}</p>`}`;
  $('#guide-hide').onclick = () => { localStorage.guide = 'off'; renderGuide(); };
  if (next) $('#guide-go').onclick = next.go;
}
$('#guide-open').onclick = () => { localStorage.removeItem('guide'); show('dashboard'); $('main').scrollTo({ top: 0, behavior: 'smooth' }); };

// ---------- example data ----------

const DEMO_SITE = 'Symphonia Bay';
const DEMO = [
  { stage: 'before', days: 45, temp: 21.4, ph: 8.05, litter: 46, notes: 'demoBefore', photos: ['other_1', 'plastic_1', 'plastic_2', 'plastic_3'] },
  { stage: 'action', days: 30, temp: 20.8, ph: 8.08, litter: null, notes: 'demoAction', photos: [] },
  { stage: 'after', days: 14, temp: 19.6, ph: 8.1, litter: 7, notes: 'demoAfter', photos: ['clean_1', 'clean_2', 'natural_1', 'natural_2'] },
];
const hasDemo = () => db.observations.some(o => o.demo);

async function loadDemo() {
  if (hasDemo()) return;
  for (const d of DEMO) {
    const photos = [];
    for (const name of d.photos)
      photos.push({ file: await api.savePhoto(await (await fetch(`demo/${name}.jpg`)).arrayBuffer(), '.jpg'), emb: null, label: null });
    db.observations.push({
      id: crypto.randomUUID(), demo: true, site: DEMO_SITE, lat: 37.905, lon: 23.715, stage: d.stage,
      date: localIso(Date.now() - d.days * DAY), temp: d.temp, ph: d.ph, litter: d.litter, notes: t(d.notes), photos,
    });
  }
  refresh();
  analyzeAll(allPhotos().map(p => p.ref), render);
}

function clearDemo() {
  api.removePhotos(db.observations.filter(o => o.demo).flatMap(o => o.photos.map(p => p.file)));
  db.observations = db.observations.filter(o => !o.demo);
  refresh();
}
$('#demo-remove').onclick = clearDemo;
$('#install').onclick = async () => {
  installPrompt.prompt();
  await installPrompt.userChoice;
  $('#install-banner').hidden = true;
};
$('#install-later').onclick = () => { localStorage.installLater = 1; $('#install-banner').hidden = true; };
$('#demo-toggle').onclick = () => (hasDemo() ? clearDemo() : loadDemo());

// ---------- dashboard ----------

let map, charts = {};
const OSM = () => L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
  maxZoom: 19, keepBuffer: 6, className: 'osm', attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
});
const ESRI = () => L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {
  maxZoom: 19, keepBuffer: 6, attribution: 'Imagery &copy; Esri, Maxar, Earthstar Geographics',
});
// Satellite photo by default. A two-part switch on the map shows which view is on (highlighted) and which one
// a click picks. The choice is remembered.
function baseMap(m) {
  const layers = { sat: ESRI(), street: OSM() };
  let mode = 'sat';
  try { if (localStorage.mapMode === 'street') mode = 'street'; } catch {}
  layers[mode].addTo(m);
  // Rubber band: the map can be dragged a little past the edge of the world, then springs back.
  m.setMaxBounds([[-85, -180], [85, 180]]);
  m.options.maxBoundsViscosity = 0.7;
  const Switch = L.Control.extend({
    onAdd() {
      const b = L.DomUtil.create('div', 'seg map-switch');
      b.innerHTML = `<button data-mode="sat">${icon('image')}${t('mapSat')}</button><button data-mode="street">${icon('pin')}${t('mapStreet')}</button>`;
      const mark = () => b.querySelectorAll('button').forEach(x => {
        x.classList.toggle('active', x.dataset.mode === mode);
        x.setAttribute('aria-pressed', x.dataset.mode === mode);
      });
      mark();
      L.DomEvent.disableClickPropagation(b);
      b.onclick = e => {
        const next = e.target.closest('button')?.dataset.mode;
        if (!next || next === mode) return;
        m.removeLayer(layers[mode]);
        mode = next;
        layers[mode].addTo(m);
        try { localStorage.mapMode = mode; } catch {}
        mark();
        placeKnob(b, true);
      };
      return b;
    },
  });
  new Switch({ position: 'topright' }).addTo(m);
}
const DEFAULT_VIEW = [[37.9, 23.73], 10];
const PIN = { radius: 8, className: 'pin' }; // colors come from CSS

// Smooth maps: quarter-step zoom on the wheel and trackpad, a long soft glide after a drag.
const MAP_OPTS = { zoomSnap: 0.25, zoomDelta: 0.5, wheelPxPerZoomLevel: 110, wheelDebounceTime: 20, inertiaDeceleration: 2400, easeLinearity: 0.15 };
function newMap(id, tools = true) {
  const m = L.map(id, MAP_OPTS).setView(...DEFAULT_VIEW);
  baseMap(m);
  if (!tools) return m;
  m.pins = L.layerGroup().addTo(m);
  m.pts = [];
  // Under the zoom buttons: all beaches, my location, full screen.
  const Tools = L.Control.extend({
    onAdd() {
      const bar = L.DomUtil.create('div', 'leaflet-bar map-tools');
      const btn = (name, title, fn) => {
        const a = L.DomUtil.create('a', '', bar);
        a.href = '#';
        a.role = 'button';
        a.title = title;
        a.setAttribute('aria-label', title);
        a.innerHTML = icon(name);
        L.DomEvent.on(a, 'click', e => { L.DomEvent.preventDefault(e); fn(); });
      };
      btn('fit', t('mapFit'), () => fitTo(m, m.pts));
      if (api.platform === 'web' && navigator.geolocation) btn('locate', t('mapMe'), () => m.locate({ enableHighAccuracy: true }));
      if (document.fullscreenEnabled) btn('expand', t('mapFull'), () =>
        (document.fullscreenElement ? document.exitFullscreen() : m.getContainer().requestFullscreen()));
      L.DomEvent.disableClickPropagation(bar);
      return bar;
    },
  });
  new Tools({ position: 'topleft' }).addTo(m);
  let me;
  m.on('locationfound', e => {
    (me ??= L.circleMarker(e.latlng, { radius: 7, className: 'me', interactive: false }).addTo(m)).setLatLng(e.latlng);
    m.flyTo(e.latlng, 12, { duration: 1.2 });
  });
  m.on('locationerror', () => alert(t('locateFail')));
  m.getContainer().addEventListener('fullscreenchange', () => m.invalidateSize());
  m.on('popupopen', e => {
    const el = e.popup.getElement();
    wirePhotos(el);
    const cmp = el.querySelector('[data-cmp]'), card = el.querySelector('[data-card]');
    if (cmp) cmp.onclick = () => { fillSiteSelect($('#cmp-site')); $('#cmp-site').value = cmp.dataset.cmp; show('compare'); };
    if (card) card.onclick = () => {
      const c = $(`#com-list [data-vid="${CSS.escape(card.dataset.card)}"]`);
      if (!c) return;
      c.scrollIntoView({ behavior: 'smooth', block: 'center' });
      c.classList.remove('flash');
      requestAnimationFrame(() => c.classList.add('flash'));
    };
  });

  // Pin colour and size follow the litter count. Legend in the corner.
  const Legend = L.Control.extend({
    onAdd() {
      const d = L.DomUtil.create('div', 'map-legend');
      d.innerHTML = `<b>${t('litterItems')}</b>` +
        ['< 100', '100–300', '> 300'].map((r, i) => `<span><i class="dot" style="--c:var(--${LITTER[i][1]})"></i>${r}</span>`).join('') +
        `<span><i class="dot" style="--c:var(--accent)"></i>${t('mapNoCount')}</span>`;
      return d;
    },
  });
  new Legend({ position: 'bottomleft' }).addTo(m);
  return m;
}

const LITTER = [[100, 'good'], [300, 'warm'], [Infinity, 'bad']];
const pinStyle = litter => litter == null ? PIN
  : { className: 'pin ' + LITTER.find(([max]) => litter < max)[1], radius: Math.min(7 + Math.sqrt(litter) / 3, 16) };

// The first fit flies in from the default view; later ones glide.
function fitTo(m, pts) {
  m.pts = pts;
  if (!pts.length) return;
  m.invalidateSize();
  const opts = { maxZoom: 13, padding: [40, 40] };
  if (!m.getSize().x) return m.fitBounds(pts, opts); // hidden page: no size to animate in
  m.flyToBounds(pts, { ...opts, duration: m.fitted ? 0.6 : 1.2 });
  m.fitted = true;
}

// A beach pin: name on hover; a click flies in, then opens the popup with its photos.
function addPin(m, ll, litter, name, html) {
  const pin = L.circleMarker(ll, pinStyle(litter)).addTo(m.pins)
    .bindTooltip(esc(name), { direction: 'top', offset: [0, -10], className: 'map-tip' });
  pin.on('click', () => {
    m.closePopup();
    pin.closeTooltip();
    m.once('moveend', () => L.popup({ maxWidth: 300, minWidth: 250, offset: [0, -4], autoPanPaddingTopLeft: [56, 64], autoPanPaddingBottomRight: [20, 20] }).setLatLng(ll).setContent(html).openOn(m));
    m.flyTo(ll, Math.max(m.getZoom(), 12), { duration: 0.8 });
  });
  return pin;
}

// Popup body: photos (a click opens them full size), when, what was measured, and one action.
function popupHtml({ name, sub, o, photos, action }) {
  const shown = photos.slice(0, 4);
  return `<div class="pop">
    ${photos.length ? `<div class="pop-photos" data-photos="${esc(JSON.stringify(photos))}" data-cap="${esc(name)}">${shown.map((u, i) => `
      <button data-i="${i}" aria-label="${t('mapPhotos', { n: photos.length })}"><img src="${u}" alt="" loading="lazy">${i === shown.length - 1 && photos.length > shown.length ? `<span>+${photos.length - shown.length}</span>` : ''}</button>`).join('')}
    </div>` : ''}
    <h3>${esc(name)} <span class="stage ${o.stage}">${stage(o.stage)}</span></h3>
    <p class="sub">${sub}</p>
    <p class="metrics">${metrics(o)}</p>
    ${action}
  </div>`;
}

// ---------- photo viewer ----------

const viewer = $('#viewer');
let gallery = [], gi = 0, gcap = '';
function showPhoto(i) {
  gi = (i + gallery.length) % gallery.length;
  $('#viewer-img').src = gallery[gi];
  $('#viewer-cap').textContent = gallery.length > 1 ? `${gcap} · ${gi + 1} / ${gallery.length}` : gcap;
  $('#viewer-prev').hidden = $('#viewer-next').hidden = gallery.length < 2;
}
// Any element with data-photos (a JSON list of URLs): its buttons or images open the viewer at their index.
function wirePhotos(root) {
  root?.querySelectorAll('[data-photos] :is(button, img)').forEach((el, _, all) => el.onclick = e => {
    e.stopPropagation();
    const box = el.closest('[data-photos]');
    gallery = JSON.parse(box.dataset.photos);
    gcap = box.dataset.cap;
    showPhoto(+(el.dataset.i ?? [...box.querySelectorAll('img')].indexOf(el)));
    viewer.showModal();
  });
}
$('#viewer-prev').onclick = () => showPhoto(gi - 1);
$('#viewer-next').onclick = () => showPhoto(gi + 1);
$('#viewer-close').onclick = () => viewer.close();
viewer.onclick = e => e.target === viewer && viewer.close(); // backdrop
viewer.onkeydown = e => {
  if (e.key === 'ArrowLeft') showPhoto(gi - 1);
  if (e.key === 'ArrowRight') showPhoto(gi + 1);
};
let swipeX; // phones: swipe left or right
viewer.onpointerdown = e => { swipeX = e.clientX; };
viewer.onpointerup = e => { const dx = e.clientX - swipeX; if (Math.abs(dx) > 50 && gallery.length > 1) showPhoto(gi + (dx < 0 ? 1 : -1)); };

// Litter per 100 m on 8 Greek beaches, autumn-winter 2018 (MIO-ECSDE & HELMEPA, "Marine litter on Mediterranean beaches", 2019).
// Same beaches as the Preset rows in Community.
const SURVEY = [989, 840, 539, 267, 230, 210, 151, 108];

// Plain-language findings computed from the data. Each may carry a link to where the student can act on it.
// `only` limits them to one beach (the printed report).
function insights(only) {
  const out = [];
  for (const site of only ? [only] : sites().keys()) {
    const v = visitsAt(site);
    const before = v.findLast(o => o.stage === 'before'), after = v.findLast(o => o.stage === 'after');
    if (before?.litter != null && after?.litter != null) {
      const a = before.litter, b = after.litter;
      const vars = { site: esc(site), a, b, pct: a ? Math.abs(Math.round(((b - a) / a) * 100)) : 0 };
      out.push(b < a ? { tone: 'good', text: t('insLitterDown', vars), go: 'compare' }
        : b > a ? { tone: 'bad', text: t('insLitterUp', vars), go: 'compare' }
        : { text: t('insLitterSame', vars), go: 'compare' });
    } else if (before && !after) out.push({ tone: 'todo', text: t('insNeedAfter', { site: esc(site) }) });
    const days = Math.floor((Date.now() - new Date(v.at(-1).date)) / DAY);
    if (days >= 30 && !v.at(-1).demo) out.push({ text: t('insStale', { site: esc(site), n: days }) });
    const n = v.findLast(o => o.litter != null)?.litter;
    if (n != null) {
      const k = SURVEY.filter(x => x > n).length;
      out.push({ tone: k >= SURVEY.length / 2 ? 'good' : 'bad', text: t('insSurvey', { site: esc(site), n, k, of: SURVEY.length }) });
    }
  }
  if (only) return out;
  const todo = allPhotos().filter(p => !p.label && p.emb).length;
  if (todo) out.push({ tone: 'todo', text: t('insTodo', { n: todo }), go: 'ai' });
  const share = classShare(db.observations);
  if (share.n >= 4) {
    const top = CLASSES.reduce((a, c) => (share.counts[c.id] > share.counts[a.id] ? c : a));
    out.push({ text: t('insTop', { cls: cname(top), pct: Math.round((share.counts[top.id] / share.n) * 100) }) });
  }
  return out;
}

function renderDashboard() {
  $('#demo-banner').hidden = !hasDemo();
  renderGuide();
  const waste = wastePct(db.observations);
  $('#tiles').innerHTML =
    tile(sites().size, t('beaches')) +
    tile(db.observations.length, t('visits')) +
    tile(allPhotos().length, t('photos')) +
    tile(waste == null ? '—' : waste + '%', t('wastePhotos'));

  const found = insights();
  $('#insights').hidden = !found.length;
  $('#insights').innerHTML = `<h2>${t('insights')}</h2><ul>${found.map(f => `
    <li class="${f.tone ?? ''}"><i class="dot"></i><span>${f.text}</span>
      ${f.go ? `<button data-go="${f.go}">${t('tab' + { ai: 'Ai', compare: 'Compare' }[f.go])}${icon('arrow')}</button>` : ''}</li>`).join('')}</ul>`;
  document.querySelectorAll('#insights button').forEach(b => b.onclick = () => show(b.dataset.go));

  map ??= newMap('map');
  map.pins.clearLayers();
  const pts = [];
  for (const [name, o] of sites()) {
    if (o.lat == null) continue;
    pts.push([o.lat, o.lon]);
    const photos = visitsAt(name).flatMap(v => v.photos.map(p => api.photoUrl(p.file)));
    addPin(map, [o.lat, o.lon], o.litter, name, popupHtml({ name, o, photos,
      sub: `${fmtDate(o.date)} · ${t('nPhotos', { n: photos.length })}`,
      action: `<button class="btn" data-cmp="${esc(name)}">${t('tabCompare')}${icon('arrow')}</button>` }));
  }
  setTimeout(() => fitTo(map, pts));

  const sel = $('#dash-site');
  fillSiteSelect(sel);
  sel.onchange = renderSiteCharts;
  $('#charts').hidden = !db.observations.length;
  $('#charts-empty').hidden = !!db.observations.length;
  if (db.observations.length) renderSiteCharts();
}

Chart.defaults.maintainAspectRatio = false; // size comes from the .chart box
function themeCharts() {
  Chart.defaults.color = css('var(--muted)');
  Chart.defaults.borderColor = css('var(--line)');
  Chart.defaults.font.family = getComputedStyle(document.body).fontFamily;
}
themeCharts();
function chart(id, config) {
  charts[id]?.destroy();
  charts[id] = new Chart($('#' + id), config);
}

function renderSiteCharts() {
  const obs = visitsAt($('#dash-site').value);
  const labels = obs.map(o => new Date(o.date).toLocaleDateString(LOCALE) + (o.stage !== 'monitor' ? ` (${stage(o.stage)})` : ''));
  const warm = css('var(--warm)'), accent = css('var(--accent)');
  const legend = { labels: { usePointStyle: true, boxHeight: 6 } };
  chart('chart-sensors', {
    type: 'line',
    data: {
      labels,
      datasets: [
        { label: t('temp'), data: obs.map(o => o.temp), borderColor: warm, backgroundColor: warm, yAxisID: 'y', spanGaps: true, tension: 0.3 },
        { label: 'pH', data: obs.map(o => o.ph), borderColor: accent, backgroundColor: accent, yAxisID: 'y1', spanGaps: true, tension: 0.3 },
      ],
    },
    options: {
      plugins: { legend: { ...legend, align: 'end' } },
      scales: {
        x: { grid: { display: false } },
        y: { position: 'left', title: { display: true, text: '°C' } },
        y1: { position: 'right', grid: { drawOnChartArea: false }, title: { display: true, text: 'pH' } },
      },
    },
  });
  chart('chart-litter', {
    type: 'bar',
    data: { labels, datasets: [{ label: t('litterItems'), data: obs.map(o => o.litter), backgroundColor: accent, borderRadius: 6, maxBarThickness: 36 }] },
    options: { plugins: { legend: { display: false } }, scales: { x: { grid: { display: false } } } },
  });
  const share = classShare(obs);
  $('#classes-count').textContent = `(${share.n})`;
  chart('chart-classes', {
    type: 'doughnut',
    data: {
      labels: CLASSES.map(cname),
      datasets: [{ data: CLASSES.map(c => share.counts[c.id]), backgroundColor: CLASSES.map(c => css(c.color)), borderColor: css('var(--surface)'), borderWidth: 2 }],
    },
    options: { cutout: '62%', plugins: { legend: { ...legend, position: 'bottom' } } },
  });
}

// ---------- observations ----------

function renderObservations() {
  const list = [...db.observations].sort((a, b) => b.date.localeCompare(a.date));
  $('#obs-list').innerHTML = list.length ? list.map(o => {
    const share = classShare([o]);
    return `
      <div class="obs card" data-id="${o.id}" tabindex="0" role="button">
        ${thumbs(o)}
        <div class="grow">
          <h3>${esc(o.site)} <span class="stage ${o.stage}">${stage(o.stage)}</span>${o.demo ? `<span class="example">${t('example')}</span>` : ''}</h3>
          <p>${fmtDate(o.date)} · ${t('nPhotos', { n: o.photos.length })}</p>
          <p class="metrics">
            ${metrics(o)}
            ${CLASSES.filter(c => share.counts[c.id]).map(c => `<span style="--c:${c.color}"><i class="dot"></i>${cname(c)}: ${share.counts[c.id]}</span>`).join('')}
          </p>
          ${o.notes ? `<p class="notes">${esc(o.notes)}</p>` : ''}
        </div>
        ${o.demo ? '' : o.shared
          ? `<button class="btn shared" data-unshare="${o.id}" title="${t('unshare')}">${icon('check')}${t('shared')}</button>`
          : `<button class="btn" data-share="${o.id}">${icon('share')}${t('share')}</button>`}
      </div>`;
  }).join('') : emptyState(t('visitsEmpty'), icon('plus') + t('newVisit'), 'empty-new');
  $('#empty-new')?.addEventListener('click', () => openObs(null));
  const byId = id => db.observations.find(o => o.id === id);
  document.querySelectorAll('#obs-list .obs').forEach(el => {
    el.onclick = () => openObs(byId(el.dataset.id));
    el.onkeydown = e => e.key === 'Enter' && e.target === el && el.click();
  });
  // The buttons sit inside the clickable card: stop the click from also opening the editor.
  document.querySelectorAll('[data-share]').forEach(b => b.onclick = e => { e.stopPropagation(); openShare(byId(b.dataset.share)); });
  document.querySelectorAll('[data-unshare]').forEach(b => b.onclick = e => { e.stopPropagation(); unshare(byId(b.dataset.unshare)); });
}

let obsMap, obsMarker, draft, original, addedFiles;
const dlg = $('#obs-dialog');
const form = $('#obs-form').elements;

// `preset` pre-fills a new observation, e.g. the beach and stage when coming from Before / After.
function openObs(obs, preset = {}) {
  original = obs;
  draft = obs ? structuredClone(obs) : {
    id: crypto.randomUUID(), site: '', lat: null, lon: null, stage: 'monitor', date: localIso(Date.now()),
    temp: null, ph: null, litter: null, notes: '', photos: [], ...preset,
  };
  addedFiles = [];
  for (const k of ['site', 'date', 'stage', 'temp', 'ph', 'litter', 'notes']) form[k].value = draft[k] ?? '';
  $('#obs-title').textContent = t(obs ? 'editVisit' : 'newVisit');
  $('#obs-delete').hidden = !obs;
  $('#photo-note').textContent = '';
  $('#sites').innerHTML = [...sites().keys()].map(n => `<option value="${esc(n)}">`).join('');
  form.stage.onchange();
  dlg.showModal();

  if (!obsMap) {
    obsMap = newMap('obs-map', false);
    obsMap.on('click', e => setLoc(e.latlng.lat, e.latlng.lng));
  }
  obsMarker?.remove();
  obsMarker = null;
  setTimeout(() => {
    obsMap.invalidateSize();
    form.site.onchange(); // a new visit at a known beach starts from that beach's location
    if (draft.lat != null) setLoc(draft.lat, draft.lon);
    else { $('#obs-loc').textContent = ''; obsMap.setView(...DEFAULT_VIEW); }
  });
  renderDraftPhotos();
}
form.stage.onchange = () => { $('#stage-help').textContent = t('stageHelp_' + form.stage.value); };
form.site.onchange = () => {
  const prev = sites().get(form.site.value.trim());
  if (draft.lat == null && prev?.lat != null) setLoc(prev.lat, prev.lon);
};

function setLoc(lat, lon) {
  draft.lat = Math.round(lat * 1e6) / 1e6;
  draft.lon = Math.round(lon * 1e6) / 1e6;
  obsMarker ??= L.circleMarker([lat, lon], PIN).addTo(obsMap);
  obsMarker.setLatLng([lat, lon]);
  obsMap.flyTo([lat, lon], Math.max(obsMap.getZoom(), 14), { duration: .6 }); // flies in an arc, not a straight jump
  $('#obs-loc').innerHTML = `${icon('pin')}${draft.lat}, ${draft.lon}`;
}

// Browser geolocation needs a Google key inside Electron, so the button is website-only.
$('#obs-locate').hidden = api.platform !== 'web' || !navigator.geolocation;
$('#obs-locate').onclick = () => navigator.geolocation.getCurrentPosition(
  pos => setLoc(pos.coords.latitude, pos.coords.longitude),
  () => { $('#obs-loc').textContent = t('locateFail'); },
  { enableHighAccuracy: true, timeout: 10000 });

function renderDraftPhotos() {
  $('#obs-photos').replaceChildren(...draft.photos.map(p => photoCard(p, {
    onChange: renderDraftPhotos,
    onRemove: photo => { draft.photos = draft.photos.filter(x => x !== photo); renderDraftPhotos(); },
  })));
}

async function addFiles(files) {
  const mine = draft; // the dialog may be closed or reopened while photos are still being stored
  let bad = 0;
  const photos = [];
  for (const f of files) {
    try {
      const file = await storePhoto(f);
      if (mine !== draft) { api.removePhotos([file]); continue; }
      addedFiles.push(file);
      photos.push({ file, emb: null, label: null });
    } catch { bad++; }
  }
  if (mine !== draft) return;
  $('#photo-note').textContent = bad ? t('badFiles', { n: bad }) : '';
  draft.photos.push(...photos);
  renderDraftPhotos();
  await analyzeAll(photos, renderDraftPhotos);
}

const filePhotos = $('#file-photos');
$('#obs-add-photos').onclick = $('#obs-drop').onclick = () => filePhotos.click();
filePhotos.onchange = () => { addFiles([...filePhotos.files]); filePhotos.value = ''; };
dlg.ondragover = e => { e.preventDefault(); dlg.classList.add('dragging'); };
dlg.ondragleave = () => dlg.classList.remove('dragging');
dlg.ondrop = e => { e.preventDefault(); dlg.classList.remove('dragging'); addFiles([...e.dataTransfer.files]); };

$('#new-obs').onclick = () => openObs(null);
const discardDraft = () => { api.removePhotos(addedFiles); draft = null; }; // photos picked for a visit that was never saved
$('#obs-cancel').onclick = () => { discardDraft(); dlg.close(); };
dlg.addEventListener('cancel', discardDraft); // Esc key

$('#obs-form').onsubmit = () => {
  Object.assign(draft, {
    site: form.site.value.trim(), date: form.date.value, stage: form.stage.value,
    temp: num(form.temp.value), ph: num(form.ph.value), litter: num(form.litter.value), notes: form.notes.value.trim(),
  });
  delete draft.demo; // an edited example becomes the student's own visit
  const kept = new Set(draft.photos.map(p => p.file));
  api.removePhotos([...(original?.photos ?? []).map(p => p.file), ...addedFiles].filter(f => !kept.has(f)));
  if (original) db.observations[db.observations.indexOf(original)] = draft;
  else db.observations.push(draft);
  draft = null;
  refresh();
};

$('#obs-delete').onclick = () => {
  if (!confirm(t('confirmDelete', { site: draft.site }))) return;
  api.removePhotos([...original.photos.map(p => p.file), ...addedFiles]);
  // The edit key lives in this visit: remove the shared copy now, or nobody could later.
  if (original.shared) unshareVisit(original.shared.id, original.shared.key).catch(() => {});
  db.observations = db.observations.filter(o => o !== original);
  draft = null;
  dlg.close();
  refresh();
};

// ---------- BlueVision AI ----------

let filter = 'todo';
document.querySelectorAll('#ai-filter button').forEach(b => b.onclick = () => {
  document.querySelectorAll('#ai-filter button').forEach(x => x.classList.remove('active'));
  b.classList.add('active');
  placeKnob(b.parentElement, true);
  filter = b.dataset.filter;
  renderAi();
});

function renderAi() {
  const photos = allPhotos();
  const verified = photos.filter(p => p.label && p.emb);
  // Leave-one-out: would the AI have got each verified photo right without seeing it?
  const agree = verified.filter(p => classify(p.ref).ai === p.label).length;
  $('#ai-tiles').innerHTML =
    tile(photos.length, t('photos')) +
    tile(`${verified.length}<small> / ${photos.length}</small>`, t('checked')) +
    tile(verified.length ? Math.round((agree / verified.length) * 100) + '%' : '—', t('agreement'));
  $('#ai-legend').innerHTML = t('examples') + CLASSES.map(c =>
    `<span style="--c:${c.color}"><i class="dot"></i>${cname(c)} <b>${verified.filter(p => p.label === c.id).length}</b></span>`).join('');
  $('#ai-legend').hidden = $('#ai-filter').hidden = !photos.length;
  placeKnob($('#ai-filter'));

  let shown = photos;
  if (filter === 'todo') shown = photos.filter(p => !p.label)
    .sort((a, b) => Math.max(...(classify(a.ref)?.probs ?? [0])) - Math.max(...(classify(b.ref)?.probs ?? [0]))); // least sure first
  if (filter === 'verified') shown = verified;

  const grid = $('#ai-grid');
  grid.replaceChildren(...shown.map(p => {
    const card = photoCard(p.ref, { onChange: refresh });
    card.insertAdjacentHTML('beforeend', `<small class="from">${esc(p.obs.site)} · ${fmtDate(p.obs.date)}</small>`);
    return card;
  }));
  if (!photos.length) {
    grid.innerHTML = emptyState(t('aiEmpty'), icon('plus') + t('newVisit'), 'ai-new');
    $('#ai-new').onclick = () => openObs(null);
  } else if (!shown.length) grid.innerHTML = emptyState(t(filter === 'todo' ? 'allChecked' : 'noneChecked'));
  // Photos added before the model was available get analysed now.
  analyzeAll(photos.map(p => p.ref), renderAi);
}

// ---------- solutions: 3D lab + game (ideas.js) ----------

let sub = 'lab';
function setSub(name) {
  sub = name;
  document.querySelectorAll('#ideas-seg button').forEach(x => x.classList.toggle('active', x.dataset.sub === name));
}
document.querySelectorAll('#ideas-seg button').forEach(b => b.onclick = () => {
  setSub(b.dataset.sub);
  placeKnob(b.parentElement, true);
  renderIdeas();
});
function renderIdeas() {
  placeKnob($('#ideas-seg'));
  $('#lab-view').hidden = sub !== 'lab';
  $('#game-view').hidden = sub !== 'game';
  (sub === 'lab' ? renderLab : renderGame)();
}

// ---------- before / after ----------

function renderCompare() {
  const sel = $('#cmp-site');
  fillSiteSelect(sel);
  sel.onchange = renderCompare;
  const site = sel.value;
  $('#cmp-report').hidden = true;
  if (!site) {
    $('#cmp').innerHTML = emptyState(t('visitsEmpty'), icon('plus') + t('newVisit'), 'cmp-new');
    $('#cmp-new').onclick = () => openObs(null);
    return;
  }
  const obs = visitsAt(site);
  const last = s => obs.findLast(o => o.stage === s);
  const before = last('before'), after = last('after');
  $('#cmp-report').hidden = false;
  $('#cmp-report').onclick = () => printReport(site);

  $('#cmp').innerHTML = `
    <div class="cmp">${['before', 'action', 'after'].map(s => {
      const o = last(s), pct = o && wastePct([o]);
      return `
      <div class="card col">
        <h2><span class="stage ${s}">${stage(s)}</span></h2>
        ${o ? `
          <p class="date">${fmtDate(o.date)}</p>
          ${thumbs(o, 'big')}
          <p class="metrics">${metrics(o)}${pct != null ? `<span>${t('pctWaste', { n: pct })}</span>` : ''}</p>
          ${o.notes ? `<p class="notes">${esc(o.notes)}</p>` : ''}`
        : `<div class="empty"><p>${t('noStage', { stage: stage(s) })}</p>
             <button class="btn" data-add="${s}">${icon('plus')}${t('addStage', { stage: stage(s) })}</button></div>`}
      </div>`;
    }).join('')}
    </div>
    ${before && after ? `<div class="card result"><h2>${t('result')}</h2>${deltas(before, after)}</div>` : ''}`;
  document.querySelectorAll('#cmp [data-add]').forEach(b => b.onclick = () => openObs(null, { site, stage: b.dataset.add }));
}

function delta(label, a, b, unit = '', lowerIsBetter = true) {
  if (a == null || b == null) return '';
  const d = Math.round((b - a) * 100) / 100;
  const tone = !lowerIsBetter || d === 0 ? '' : d < 0 ? 'good' : 'bad';
  const rel = a ? ` (${d > 0 ? '+' : ''}${Math.round((d / a) * 100)}%)` : '';
  return `<div class="delta ${tone}"><span>${label}</span><b>${a}${unit} → ${b}${unit}</b><small>${rel}</small></div>`;
}
const deltas = (before, after) =>
  delta(t('litterItems'), before.litter, after.litter) +
  delta(t('wastePhotos'), wastePct([before]), wastePct([after]), '%') +
  delta(t('waterTemp'), before.temp, after.temp, ' °C', false) +
  delta('pH', before.ph, after.ph, '', false);

// ---------- printable report ----------

// A link that opens a new visit at this beach: printed as a QR code on the report and on a sign at the beach.
const visitLink = o => 'https://blueguardianai.gr/app/#visit?' + new URLSearchParams({ site: o.site, ...(o.lat != null && { lat: o.lat, lon: o.lon }) });
function qrSvg(text) {
  const q = qrcode(0, 'M'); // global from vendor/qrcode.js
  q.addData(text, 'Byte'); // UTF-8 for Greek beach names
  q.make();
  return q.createSvgTag({ cellSize: 4, margin: 0, scalable: true });
}

// Chart.js draws on a canvas, which doesn't print reliably: draw each chart offscreen in print colours and keep a picture.
function chartImage(config) {
  const canvas = document.createElement('canvas');
  canvas.width = 760; canvas.height = 260;
  const c = new Chart(canvas, { ...config, options: { ...config.options, responsive: false, animation: false, devicePixelRatio: 2,
    color: '#444', borderColor: '#ddd', scales: Object.fromEntries(Object.entries(config.options.scales ?? {}).map(([k, v]) => [k, { ...v, ticks: { color: '#444' }, grid: { ...v.grid, color: '#e4e4e4' } }])) } });
  const url = c.toBase64Image();
  c.destroy();
  return `<img src="${url}" alt="">`;
}

function printReport(site) {
  const obs = visitsAt(site), last = obs.at(-1);
  const before = obs.findLast(o => o.stage === 'before'), after = obs.findLast(o => o.stage === 'after');
  const labels = obs.map(o => new Date(o.date).toLocaleDateString(LOCALE) + (o.stage !== 'monitor' ? ` (${stage(o.stage)})` : ''));
  const blue = '#2563eb', warm = '#ea580c';
  const withData = k => obs.some(o => o[k] != null);
  const photos = ['before', 'after'].map(s => obs.findLast(o => o.stage === s && o.photos.length)).filter(Boolean);
  $('#report').innerHTML = `
    <header>
      <img class="logo" src="${$('.brand img').src}" alt="">
      <div class="grow"><small>BlueGuardian AI · ${t('beachReport')}</small><h1>${esc(site)}</h1>
        <p>${t('reportMade', { date: new Date().toLocaleDateString(LOCALE, { dateStyle: 'long' }) })}</p></div>
      <figure>${qrSvg(visitLink(last))}<figcaption>${t('reportQr')}</figcaption></figure>
    </header>
    <div class="tiles">${tile(obs.length, t('visits'))}${tile(obs.reduce((n, o) => n + o.photos.length, 0), t('photos'))}${tile(last.litter ?? '—', t('litterItems'))}${tile(wastePct(obs) == null ? '—' : wastePct(obs) + '%', t('wastePhotos'))}</div>
    <h2>${t('insights')}</h2>
    <ul>${insights(site).map(f => `<li>${f.text}</li>`).join('')}</ul>
    ${before && after ? `<h2>${t('result')}</h2><div class="result">${deltas(before, after)}</div>` : ''}
    ${withData('litter') ? `<h2>${t('chartLitter')}</h2>${chartImage({ type: 'bar',
      data: { labels, datasets: [{ data: obs.map(o => o.litter), backgroundColor: blue, borderRadius: 4, maxBarThickness: 36 }] },
      options: { plugins: { legend: { display: false } }, scales: { x: { grid: { display: false } }, y: {} } } })}` : ''}
    ${withData('temp') || withData('ph') ? `<h2>${t('chartSensors')}</h2>${chartImage({ type: 'line',
      data: { labels, datasets: [
        { label: t('temp'), data: obs.map(o => o.temp), borderColor: warm, backgroundColor: warm, yAxisID: 'y', spanGaps: true },
        { label: 'pH', data: obs.map(o => o.ph), borderColor: blue, backgroundColor: blue, yAxisID: 'y1', spanGaps: true }] },
      options: { plugins: { legend: { labels: { color: '#444' } } }, scales: { x: { grid: { display: false } }, y: { position: 'left' }, y1: { position: 'right', grid: { drawOnChartArea: false } } } } })}` : ''}
    ${photos.length ? `<h2>${t('reportPhotos')}</h2>${photos.map(o => `<p><b>${stage(o.stage)}</b> · ${fmtDate(o.date)}</p>${thumbs(o)}`).join('')}` : ''}
    <h2>${t('reportVisits')}</h2>
    <table><thead><tr><th>${t('fDate')}</th><th>${t('fStage')}</th><th>°C</th><th>pH</th><th>${t('fLitter')}</th><th>${t('photos')}</th></tr></thead>
      <tbody>${obs.map(o => `<tr><td>${fmtDate(o.date)}</td><td>${stage(o.stage)}</td><td>${o.temp ?? ''}</td><td>${o.ph ?? ''}</td><td>${o.litter ?? ''}</td><td>${o.photos.length}</td></tr>`).join('')}</tbody></table>
    <footer>${t('reportSource')} · blueguardianai.gr</footer>`;
  // Wait for the photos, or the print preview shows empty boxes.
  Promise.all([...$('#report').querySelectorAll('img')].map(i => i.decode().catch(() => {}))).then(() => print());
}
addEventListener('afterprint', () => { $('#report').innerHTML = ''; });

// ---------- community: share, browse, report ----------

const shareDlg = $('#share-dialog');
const shareForm = $('#share-form').elements;
let sharing; // the visit in the share dialog

function openShare(o) {
  sharing = o;
  $('#share-what').textContent = t('shareWhat', { site: o.site, date: fmtDate(o.date) });
  shareForm.school.value = localStorage.school ?? '';
  shareForm.photos.checked = true;
  shareForm.photos.closest('label').hidden = !o.photos.length;
  $('#share-photos-label').textContent = t('sharePhotos', { n: o.photos.length });
  $('#share-note').textContent = '';
  $('#share-send').disabled = false;
  shareDlg.showModal();
}
$('#share-cancel').onclick = () => shareDlg.close();

// Shared photos are smaller than the stored ones: 1024px is plenty for a public map.
async function photoForSharing(p) {
  const bmp = await createImageBitmap(await (await fetch(api.photoUrl(p.file))).blob());
  const s = Math.min(1, 1024 / Math.max(bmp.width, bmp.height));
  const canvas = new OffscreenCanvas(Math.round(bmp.width * s), Math.round(bmp.height * s));
  canvas.getContext('2d').drawImage(bmp, 0, 0, canvas.width, canvas.height);
  const url = await dataUrl(await canvas.convertToBlob({ type: 'image/jpeg', quality: 0.8 }));
  return { data: url.slice(url.indexOf(',') + 1), class: classify(p)?.final ?? null };
}

$('#share-form').onsubmit = async e => {
  e.preventDefault(); // keep the dialog open until the server answers
  const o = sharing, note = $('#share-note');
  const school = shareForm.school.value.trim();
  localStorage.school = school;
  $('#share-send').disabled = true;
  note.textContent = t('sharing');
  try {
    const photos = shareForm.photos.checked ? await Promise.all(o.photos.slice(0, 8).map(photoForSharing)) : [];
    const key = crypto.randomUUID() + crypto.randomUUID(); // proves later that this device shared it
    const visit = { site: o.site, lat: o.lat, lon: o.lon, date: new Date(o.date).toISOString(), stage: o.stage, temp: o.temp, ph: o.ph, litter: o.litter, notes: o.notes };
    const res = await shareVisit(school, visit, photos, key);
    o.shared = { id: res.id, key };
    refresh();
    note.textContent = t(res.photos === 'disabled' ? 'shareOkNoPhotos' : 'shareOk');
    $('#share-send').classList.add('ok');
    navigator.vibrate?.(12);
    setTimeout(() => $('#share-send').classList.remove('ok'), 600);
    setTimeout(() => shareDlg.close(), res.photos === 'disabled' ? 3500 : 1200);
  } catch (err) {
    const key = 'err_' + err.message;
    note.textContent = t(key) === key ? t('err_other') : t(key);
    $('#share-send').disabled = false;
  }
};

async function unshare(o) {
  if (!confirm(t('confirmUnshare', { site: o.site }))) return;
  try {
    await unshareVisit(o.shared.id, o.shared.key);
  } catch (err) {
    if (err.message !== 'not_yours') return alert(t('err_other')); // not_yours: already gone (hidden or deleted)
  }
  delete o.shared;
  refresh();
}

// Moderator mode lasts for this browser session only. The server checks the key on every request.
let modKey = sessionStorage.getItem('modKey');
$('#mod-enter').onclick = () => {
  const key = prompt(t('modPrompt'))?.trim();
  if (!key) return;
  sessionStorage.setItem('modKey', modKey = key);
  show('community');
};
$('#mod-exit').onclick = () => {
  sessionStorage.removeItem('modKey');
  modKey = null;
  renderCommunity();
};
const modButtons = v => `<div class="row">
  ${v.status === 'hidden' ? `<span class="example">${t('modHidden')}</span>` : ''}
  ${v.reports ? `<span class="example">${t('modReports', { n: v.reports })}</span>` : ''}
  <button class="btn quiet" data-mod="${v.status === 'hidden' ? 'show' : 'hide'}" data-id="${v.id}">${t(v.status === 'hidden' ? 'modShow' : 'modHide')}</button>
  <button class="btn quiet" data-mod="delete" data-id="${v.id}">${t('modDelete')}</button>
</div>`;

let comMap;
const comPins = new Map(); // shared visit id -> its pin
async function renderCommunity() {
  const list = $('#com-list');
  comMap ??= newMap('com-map');
  setTimeout(() => comMap.invalidateSize());
  if (!list.children.length) list.innerHTML = emptyState(t('comLoading'));
  let visits;
  try { visits = modKey ? await moderate(modKey, 'list') : await listShared(); }
  catch (err) {
    if (err.message !== 'not_moderator') { list.innerHTML = emptyState(t('comError')); return; }
    sessionStorage.removeItem('modKey');
    modKey = null;
    alert(t('modBad'));
    return renderCommunity();
  }
  if (current !== 'community') return;
  $('#mod-bar').hidden = !modKey;

  $('#com-tiles').innerHTML =
    tile(new Set(visits.map(v => v.school)).size, t('schools')) +
    tile(visits.length, t('sharedVisits')) +
    tile(visits.reduce((n, v) => n + (v.litter ?? 0), 0), t('litterCounted'));
  comMap.pins.clearLayers();
  comPins.clear();
  const photosOf = v => v.shared_photos.map(p => sharedPhotoUrl(p.path));
  const pts = visits.filter(v => v.lat != null).map(v => {
    comPins.set(String(v.id), addPin(comMap, [v.lat, v.lon], v.litter, v.site, popupHtml({ name: v.site, o: v, photos: photosOf(v),
      sub: `${esc(v.school)} · ${fmtDate(v.visited_at)}`,
      action: `<button class="btn" data-card="${v.id}">${t('mapList')}${icon('arrow')}</button>` })));
    return [v.lat, v.lon];
  });
  fitTo(comMap, pts);

  const mine = new Set(db.observations.map(o => o.shared?.id));
  list.innerHTML = visits.length ? visits.map(v => `
    <div class="obs card static${comPins.has(String(v.id)) ? ' on-map' : ''}" data-vid="${v.id}">
      <div class="thumbs" data-photos="${esc(JSON.stringify(photosOf(v)))}" data-cap="${esc(v.site)}">${photosOf(v).slice(0, 4).map(u => `<img src="${u}" loading="lazy" alt="">`).join('')}</div>
      <div class="grow">
        <h3>${esc(v.site)} <span class="stage ${v.stage}">${stage(v.stage)}</span></h3>
        <p>${esc(v.school)} · ${fmtDate(v.visited_at)}</p>
        <p class="metrics">
          ${metrics(v)}
          ${CLASSES.filter(c => v.counts?.[c.id]).map(c => `<span style="--c:${c.color}"><i class="dot"></i>${cname(c)}: ${Number(v.counts[c.id])}</span>`).join('')}
        </p>
        ${v.notes ? `<p class="notes">${esc(v.notes)}</p>` : ''}
      </div>
      ${modKey ? modButtons(v) : mine.has(v.id) ? `<span class="example">${t('shared')}</span>`
        : `<button class="btn quiet" data-report="${v.id}" title="${t('report')}" aria-label="${t('report')}">${icon('flag')}</button>`}
    </div>`).join('') : emptyState(t('comEmpty'));
  wirePhotos(list);
  // A card shows its pin: the map scrolls into view and flies there.
  list.querySelectorAll('.on-map').forEach(el => el.onclick = e => {
    if (e.target.closest('button, a')) return;
    $('#com-map').scrollIntoView({ behavior: 'smooth', block: 'center' });
    comPins.get(el.dataset.vid).fire('click');
  });
  document.querySelectorAll('[data-report]').forEach(b => b.onclick = async () => {
    if (!confirm(t('confirmReport'))) return;
    await reportVisit(b.dataset.report).catch(() => {});
    b.outerHTML = `<span class="example">${t('reported')}</span>`;
  });
  document.querySelectorAll('[data-mod]').forEach(b => b.onclick = async () => {
    if (b.dataset.mod === 'delete' && !confirm(t('confirmModDelete'))) return;
    try { await moderate(modKey, b.dataset.mod, b.dataset.id); }
    catch { return alert(t('err_other')); }
    renderCommunity();
  });
}

// ---------- data: export, backup, restore ----------

function renderData() {
  $('#storage-text').textContent = t('storage_' + api.platform);
  $('#demo-toggle').textContent = t(hasDemo() ? 'demoRemove' : 'demoLoad');
}

const today = () => new Date().toISOString().slice(0, 10);
const flashDone = btn => { // download icon blurs into a check for a moment
  const sw = btn.querySelector('.swap');
  sw.classList.add('on');
  btn.classList.add('ok'); // one pulse to confirm, with a short buzz on phones in the same frame
  navigator.vibrate?.(12);
  setTimeout(() => { sw.classList.remove('on'); btn.classList.remove('ok'); }, 1600);
};

$('#export').onclick = async () => {
  const head = ['site', 'date', 'stage', 'lat', 'lon', 'water_temp_c', 'ph', 'litter_items', 'photos',
    ...CLASSES.map(c => 'photos_' + c.id), 'notes'];
  const q = v => (v == null ? '' : /[",\n]/.test(String(v)) ? `"${String(v).replace(/"/g, '""')}"` : v);
  const rows = db.observations.map(o => {
    const s = classShare([o]);
    return [o.site, o.date, o.stage, o.lat, o.lon, o.temp, o.ph, o.litter, s.n, ...CLASSES.map(c => s.counts[c.id]), o.notes];
  });
  // BOM so Excel shows Greek correctly
  if (await api.saveFile(`blueguardian-${today()}.csv`, '﻿' + [head, ...rows].map(r => r.map(q).join(',')).join('\n')))
    flashDone($('#export'));
};

// One JSON file: the database plus every photo as a data URL. Photos are already shrunk, so this stays manageable.
// ponytail: whole backup is built in memory; switch to a streamed zip if schools reach thousands of photos.
const dataUrl = blob => new Promise(resolve => {
  const r = new FileReader();
  r.onload = () => resolve(r.result);
  r.readAsDataURL(blob);
});
$('#backup').onclick = async () => {
  const photos = {};
  for (const p of allPhotos()) photos[p.file] = await dataUrl(await (await fetch(api.photoUrl(p.file))).blob());
  if (await api.saveFile(`blueguardian-backup-${today()}.json`, JSON.stringify({ app: 'blueguardian', version: 1, db, photos })))
    flashDone($('#backup'));
};

// Restore adds the visits that aren't here yet. It never overwrites or deletes anything.
const fileRestore = $('#file-restore');
$('#restore').onclick = () => fileRestore.click();
fileRestore.onchange = async () => {
  const note = $('#restore-note');
  try {
    const backup = JSON.parse(await fileRestore.files[0].text());
    if (backup.app !== 'blueguardian' || !Array.isArray(backup.db?.observations)) throw new Error('not a backup');
    const sameModel = backup.db.model === TEXT.model;
    const have = new Set(db.observations.map(o => o.id));
    let n = 0;
    for (const o of backup.db.observations.filter(o => !have.has(o.id))) {
      const photos = [];
      for (const p of o.photos ?? []) {
        if (!backup.photos?.[p.file]) continue;
        const file = await storePhoto(await (await fetch(backup.photos[p.file])).blob());
        photos.push({ file, emb: sameModel ? p.emb : null, label: CLASSES.some(c => c.id === p.label) ? p.label : null });
      }
      db.observations.push({
        id: String(o.id), site: String(o.site ?? ''), date: String(o.date ?? ''), lat: num(o.lat), lon: num(o.lon),
        stage: ['monitor', 'before', 'action', 'after'].includes(o.stage) ? o.stage : 'monitor',
        temp: num(o.temp), ph: num(o.ph), litter: num(o.litter), notes: String(o.notes ?? ''), photos, ...(o.demo && { demo: true }),
        ...(typeof o.shared?.id === 'string' && typeof o.shared?.key === 'string' && { shared: { id: o.shared.id, key: o.shared.key } }),
      });
      n++;
    }
    note.textContent = t('restored', { n });
    refresh();
    analyzeAll(allPhotos().map(p => p.ref), render);
  } catch {
    note.textContent = t('restoreBad');
  }
  fileRestore.value = '';
};

// ---------- theme + language ----------

// Charts are canvas: they need their colors re-resolved when the theme changes.
const syncTheme = () => {
  $('#theme .swap').classList.toggle('on', document.documentElement.dataset.theme === 'dark');
  themeCharts();
  render();
};
$('#theme').onclick = e => revealTheme(e.currentTarget, () => {
  localStorage.theme = document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark';
  applyTheme();
  syncTheme();
});
systemDark.addEventListener('change', syncTheme);
$('#theme .swap').classList.toggle('on', document.documentElement.dataset.theme === 'dark');

$('#lang').onclick = () => {
  localStorage.lang = lang === 'el' ? 'en' : 'el';
  clearTimeout(saveTimer);
  api.saveDb(JSON.stringify(db)).then(() => location.reload());
};

// ---------- start ----------

const hash = location.hash.slice(1);
// QR code from a beach report: start a new visit at that beach.
const link = hash.startsWith('visit?') && Object.fromEntries(new URLSearchParams(hash.slice(6)));
if (link) {
  history.replaceState(null, '', location.pathname);
  const lat = Number(link.lat), lon = Number(link.lon), ok = link.lat && link.lon && Number.isFinite(lat) && Number.isFinite(lon);
  render();
  openObs(null, { site: String(link.site ?? '').slice(0, 120), ...(ok && { lat, lon }) });
} else if (hash === 'lab' || hash === 'game') { setSub(hash); show('ideas'); } // links from the website
else if (hash in pages) show(hash); // e.g. app/#community from the website
else render();
// Photos whose analysis never finished (app closed, model error) get analysed now.
analyzeAll(allPhotos().map(p => p.ref), render);

// First launch: offer the example beach (not when a QR code already opened a visit).
if (link && !stored) save();
else if (!stored) {
  const welcome = $('#welcome');
  welcome.showModal();
  welcome.addEventListener('close', save);
  $('#welcome-empty').onclick = () => welcome.close();
  $('#welcome-demo').onclick = () => { welcome.close(); loadDemo(); };
}
