// Landing page: language, theme and download links. Loaded in <head> so the language is set before first paint.

// Installers live on GitHub Releases; "latest/download" always points at the newest release.
// The release workflow (.github/workflows/release.yml) uploads files with exactly these names.
const RELEASE = 'https://github.com/blueguardianai/blueguardian-ai/releases/latest/download/';
const DOWNLOADS = {
  windows: RELEASE + 'BlueGuardian-AI-Setup.exe',
  macArm: RELEASE + 'BlueGuardian-AI-mac-arm64.dmg',
  macIntel: RELEASE + 'BlueGuardian-AI-mac-x64.dmg',
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
  document.querySelector('#theme').onclick = () => {
    localStorage.theme = document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark';
    applyTheme();
    syncTheme();
  };
  syncTheme();

  for (const a of document.querySelectorAll('[data-dl]')) a.href = DOWNLOADS[a.dataset.dl];
});
