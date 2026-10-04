(function () {
  var mode = 'login';
  var busy = false;

  var tabLogin = document.getElementById('tabLogin');
  var tabSignup = document.getElementById('tabSignup');
  var form = document.getElementById('authForm');
  var email = document.getElementById('email');
  var password = document.getElementById('password');
  var errorEl = document.getElementById('authError');
  var submitBtn = document.getElementById('submitBtn');
  var title = document.getElementById('authTitle');

  function showError(key) {
    errorEl.setAttribute('data-i18n', key);
    errorEl.textContent = t(key);
    errorEl.hidden = false;
  }
  function clearError() {
    errorEl.hidden = true;
    errorEl.removeAttribute('data-i18n');
    errorEl.textContent = '';
  }

  // Swaps tab styling, heading and button label (all via data-i18n so language changes re-translate them).
  function setMode(next) {
    mode = next;
    tabLogin.classList.toggle('ac', mode === 'login');
    tabSignup.classList.toggle('ac', mode === 'signup');
    tabLogin.setAttribute('aria-selected', mode === 'login' ? 'true' : 'false');
    tabSignup.setAttribute('aria-selected', mode === 'signup' ? 'true' : 'false');
    submitBtn.setAttribute('data-i18n', mode === 'login' ? 'login_action' : 'signup_action');
    title.setAttribute('data-i18n', mode === 'login' ? 'auth_welcome' : 'auth_welcome_new');
    password.setAttribute('autocomplete', mode === 'login' ? 'current-password' : 'new-password');
    clearError();
    applyTranslations();
  }

  tabLogin.addEventListener('click', function () { setMode('login'); });
  tabSignup.addEventListener('click', function () { setMode('signup'); });
  [tabLogin, tabSignup].forEach(function (el) {
    el.addEventListener('keydown', function (e) {
      if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); el.click(); }
    });
  });

  // Server preferences override this browser's choices after a login/signup.
  function adoptServerPrefs(user) {
    if (!user) return;
    if (user.language) setLang(user.language);
    if (user.theme) setTheme(user.theme);
  }

  form.addEventListener('submit', function (e) {
    e.preventDefault();
    if (busy) return;
    clearError();

    var body = { email: email.value.trim(), password: password.value };
    if (mode === 'signup') {
      if (body.password.length < 8) return showError('auth_error_weak');
      // A new account starts with whatever the visitor already picked in this browser.
      body.language = getLang();
      body.theme = document.documentElement.getAttribute('data-theme') === 'light' ? 'light' : 'dark';
    }

    busy = true;
    submitBtn.disabled = true;
    API.post(mode === 'signup' ? '/api/auth/signup' : '/api/auth/login', body)
      .then(function (res) {
        if (mode === 'login') adoptServerPrefs(res.data && res.data.user);
        location.href = '/inbox.html';
      })
      .catch(function (err) {
        busy = false;
        submitBtn.disabled = false;
        if (err.status === 409) return showError('auth_error_exists');
        if (err.status === 429) return showError('rate_limited');
        if (err.status === 401) return showError('auth_error_generic');
        if (err.status === 400) {
          if (err.message === 'weak_password') return showError('auth_error_weak');
          return showError(mode === 'signup' ? 'auth_error_email' : 'auth_error_generic');
        }
        showError('network_error');
      });
  });

  // Already signed in? Skip the form.
  API.get('/api/auth/me').then(function () { location.href = '/inbox.html'; }).catch(function () {});

  document.addEventListener('i18n:changed', function () {
    // Error text and button labels carry data-i18n, so applyTranslations() already refreshed them.
    applyTranslations();
  });

  setMode('login');
})();
