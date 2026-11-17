// Landing page: language, theme and download links. Loaded in <head> so the language is set before first paint.

// Installers live on GitHub Releases; "latest/download" always points at the newest release.
// The release workflow (.github/workflows/release.yml) uploads files with exactly these names.
const RELEASE = 'https://github.com/blueguardianai/blueguardian-ai/releases/latest/download/';
const DOWNLOADS = {
  windows: RELEASE + 'BlueGuardian-AI-Setup.exe',
  macArm: RELEASE + 'BlueGuardian-AI-mac-arm64.dmg',
  linux: RELEASE + 'BlueGuardian-AI.AppImage',
  linuxDeb: RELEASE + 'BlueGuardian-AI.deb',
};

// Same localStorage keys as the app, so the choice carries over when it opens.
const setLang = () => {
  document.documentElement.lang = localStorage.lang ?? 'el'; // Greek unless the visitor switches
};
setLang();

addEventListener('DOMContentLoaded', () => {
  document.querySelector('#lang').onclick = () => {
    localStorage.lang = document.documentElement.lang === 'el' ? 'en' : 'el';
    setLang();
  };
  const swap = document.querySelector('#theme .swap');
  const syncTheme = () => swap.classList.toggle('on', document.documentElement.dataset.theme === 'dark');
  document.querySelector('#theme').onclick = e => revealTheme(e.currentTarget, () => {
    localStorage.theme = document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark';
    applyTheme();
    syncTheme();
  });
  syncTheme();

  // Phone menu: close it once a link is followed (anchor links stay on the page).
  const menu = document.querySelector('#menu');
  menu.onclick = e => e.target.closest('a') && menu.matches(':popover-open') && menu.hidePopover();

  const buttons = [...document.querySelectorAll('[data-dl]')];
  for (const a of buttons) a.href = DOWNLOADS[a.dataset.dl];
  // Ask GitHub which installers the latest release really has, and mark the missing ones instead of
  // leaving a dead link. If the request fails (offline, rate limit) the links stay as they are.
  fetch('https://api.github.com/repos/blueguardianai/blueguardian-ai/releases/latest')
    .then(r => (r.ok ? r.json() : Promise.reject()))
    .then(release => {
      const have = new Set(release.assets.map(a => a.name));
      for (const a of buttons.filter(a => !have.has(a.href.split('/').pop()))) {
        a.removeAttribute('href');
        a.classList.add('soon');
        a.setAttribute('aria-disabled', 'true');
        a.title = document.documentElement.lang === 'el' ? 'Σύντομα διαθέσιμο' : 'Coming soon';
      }
    })
    .catch(() => {});
});
