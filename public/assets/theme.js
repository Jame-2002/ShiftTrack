(() => {
  const key = 'shifttrack-theme';
  const system = window.matchMedia('(prefers-color-scheme: dark)');
  let preference = null;
  try { preference = localStorage.getItem(key); } catch {}
  if (!['light', 'dark'].includes(preference)) preference = null;
  function apply(theme) {
    document.documentElement.dataset.bsTheme = theme;
    const meta = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.content = theme === 'dark' ? '#13283e' : '#102d4d';
    const button = document.getElementById('theme-toggle');
    if (button) {
      const dark = theme === 'dark';
      button.setAttribute('aria-label', dark ? 'เปลี่ยนเป็นโหมดสว่าง' : 'เปลี่ยนเป็นโหมดมืด');
      button.setAttribute('aria-pressed', String(dark));
      button.querySelector('.theme-symbol').textContent = dark ? '☾' : '☀';
      button.querySelector('.theme-label').textContent = dark ? 'Dark' : 'Light';
    }
  }
  apply(preference || (system.matches ? 'dark' : 'light'));
  document.addEventListener('DOMContentLoaded', () => {
    apply(document.documentElement.dataset.bsTheme);
    requestAnimationFrame(() => document.documentElement.classList.add('motion-ready'));
    document.getElementById('theme-toggle')?.addEventListener('click', () => {
      preference = document.documentElement.dataset.bsTheme === 'dark' ? 'light' : 'dark';
      try { localStorage.setItem(key, preference); } catch {}
      apply(preference);
      const symbol = document.querySelector('.theme-symbol');
      if (symbol && !window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
        symbol.getAnimations().forEach(animation => animation.cancel());
        symbol.animate([
          { opacity: 0.25, transform: 'rotate(-35deg) scale(.75)' },
          { opacity: 1, transform: 'rotate(0deg) scale(1)' }
        ], { duration: 320, easing: 'cubic-bezier(.22,1,.36,1)' });
      }
    });
  });
  system.addEventListener('change', event => { if (!preference) apply(event.matches ? 'dark' : 'light'); });
  window.addEventListener('storage', event => {
    if (event.key !== key) return;
    preference = ['light', 'dark'].includes(event.newValue) ? event.newValue : null;
    apply(preference || (system.matches ? 'dark' : 'light'));
  });
})();
