// Classic script in <head>: sets the theme before first paint so the page never flashes.
const systemDark = matchMedia('(prefers-color-scheme: dark)');
const applyTheme = () => {
  document.documentElement.dataset.theme = localStorage.theme ?? (systemDark.matches ? 'dark' : 'light');
};
systemDark.addEventListener('change', applyTheme);
applyTheme();

// Theme switch: the new colours spread out from the pressed button in a growing circle (a masked view transition).
const revealTheme = (btn, change) => {
  if (!document.startViewTransition || matchMedia('(prefers-reduced-motion: reduce)').matches) return change();
  const r = btn.getBoundingClientRect(), x = r.left + r.width / 2, y = r.top + r.height / 2;
  const end = Math.hypot(Math.max(x, innerWidth - x), Math.max(y, innerHeight - y));
  const root = document.documentElement;
  root.classList.add('theme-vt');
  const vt = document.startViewTransition(change);
  vt.ready.then(() => root.animate({ clipPath: [`circle(0 at ${x}px ${y}px)`, `circle(${end}px at ${x}px ${y}px)`] },
    { duration: 450, easing: 'cubic-bezier(.65, 0, .35, 1)', pseudoElement: '::view-transition-new(root)' }));
  vt.finished.finally(() => root.classList.remove('theme-vt'));
};
