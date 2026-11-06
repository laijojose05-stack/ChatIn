// ChatIn Theme Switcher
(function () {
  const STORAGE_KEY = 'chatin_theme';
  const html = document.documentElement;

  function getPreferredTheme() {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) return saved;
    return window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark';
  }

  function applyTheme(theme) {
    html.setAttribute('data-theme', theme);
    localStorage.setItem(STORAGE_KEY, theme);

    // Update icon if present
    const icon = document.getElementById('themeIcon');
    if (icon) {
      if (theme === 'dark') {
        icon.className = 'bi bi-sun';
      } else {
        icon.className = 'bi bi-moon-stars';
      }
    }
  }

  // Initial application
  const currentTheme = getPreferredTheme();
  applyTheme(currentTheme);

  // Setup toggle listener once DOM is ready
  document.addEventListener('DOMContentLoaded', () => {
    applyTheme(getPreferredTheme());

    const toggleBtn = document.getElementById('themeToggleBtn');
    if (toggleBtn) {
      toggleBtn.addEventListener('click', () => {
        const active = html.getAttribute('data-theme') === 'light' ? 'dark' : 'light';
        applyTheme(active);
      });
    }
  });
})();
