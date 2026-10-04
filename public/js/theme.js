(function () {
  var KEY = 'es_theme';
  var root = document.documentElement;
  var tzTimer = null;

  // Applies a theme with the short colour cross-fade (`html.tz`).
  function setTheme(next, opts) {
    if (next !== 'dark' && next !== 'light') return;
    root.classList.add('tz');
    clearTimeout(tzTimer);
    tzTimer = setTimeout(function () { root.classList.remove('tz'); }, 450);
    root.setAttribute('data-theme', next);
    try { localStorage.setItem(KEY, next); } catch (e) {}
    // Fire-and-forget sync with the server (ignored when logged out).
    if (opts && opts.push && window.API && API.patch) {
      API.patch('/api/auth/preferences', { theme: next }).catch(function () {});
    }
  }
  window.setTheme = setTheme;

  var btn = document.getElementById('themeToggle');
  if (!btn) return;
  btn.addEventListener('click', function () {
    var next = root.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
    setTheme(next, { push: true });
  });
})();
