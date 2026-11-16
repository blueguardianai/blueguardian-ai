// Classic script in <head>: sets the theme before first paint so the page never flashes.
const systemDark = matchMedia('(prefers-color-scheme: dark)');
const applyTheme = () => {
  document.documentElement.dataset.theme = localStorage.theme ?? (systemDark.matches ? 'dark' : 'light');
};
systemDark.addEventListener('change', applyTheme);
applyTheme();
