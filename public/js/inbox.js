(function () {
  var PAGE = 20;
  var REFRESH_MS = 30000;

  var $ = function (id) { return document.getElementById(id); };
  var state = {
    user: null,
    domain: '',
    addresses: [],
    emails: [],
    total: 0,
    filter: null,      // selected address (string) or null for all
    unreadOnly: false,
    current: null,     // email currently open in the modal
    confirmYes: null,
  };

  // ---------- helpers ----------

  function h(tag, cls, text) {
    var e = document.createElement(tag);
    if (cls) e.className = cls;
    if (text !== undefined && text !== null) e.textContent = text;
    return e;
  }

  // Static, trusted icon markup only (never user data).
  function icon(path) {
    var s = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    s.setAttribute('viewBox', '0 0 24 24');
    s.setAttribute('fill', 'none');
    s.setAttribute('stroke', 'currentColor');
    s.setAttribute('stroke-width', '2');
    s.setAttribute('stroke-linecap', 'round');
    s.setAttribute('stroke-linejoin', 'round');
    s.setAttribute('aria-hidden', 'true');
    s.innerHTML = path;
    return s;
  }
  var ICON_MAIL = '<path d="M4 4h16a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2z"/><polyline points="22,6 12,13 2,6"/>';
  var ICON_CHEVRON = '<polyline points="9 18 15 12 9 6"/>';
  var ICON_TRASH = '<polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6M14 11v6"/><path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/>';

  function sessionExpired() { location.href = '/'; }

  function handleError(err) {
    if (err && err.status === 401) return sessionExpired();
    window.alert(t('error') + ': ' + (err && err.status ? t('network_error') : t('network_error')));
  }

  function num(n) { return toFaDigits(String(n)); }

  function primary() {
    for (var i = 0; i < state.addresses.length; i++) if (state.addresses[i].is_primary) return state.addresses[i];
    return state.addresses[0] || null;
  }

  // ---------- modals ----------

  var overlay = $('notice-overlay');
  var cards = ['claimModal', 'emailModal', 'composeModal', 'confirmModal'];

  function openModal(id) {
    cards.forEach(function (c) { $(c).hidden = c !== id; });
    overlay.classList.remove('hidden');
  }
  function closeModals() {
    overlay.classList.add('hidden');
    cards.forEach(function (c) { $(c).hidden = true; });
    $('emailFrame').srcdoc = '';
    state.current = null;
    state.confirmYes = null;
  }
  function modalOpen() { return !overlay.classList.contains('hidden'); }

  overlay.addEventListener('click', function (e) {
    // A click on the backdrop closes everything except the compose window (so a draft isn't lost by accident).
    if (e.target === overlay && $('composeModal').hidden) closeModals();
  });
  document.querySelectorAll('[data-close]').forEach(function (b) { b.addEventListener('click', closeModals); });
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && modalOpen()) closeModals();
  });

  function confirmAsk(messageKey, onYes) {
    $('confirmText').textContent = t(messageKey);
    $('confirmText').setAttribute('data-i18n', messageKey);
    state.confirmYes = onYes;
    openModal('confirmModal');
  }
  $('confirmYes').addEventListener('click', function () {
    var fn = state.confirmYes;
    closeModals();
    if (fn) fn();
  });

  // ---------- rendering ----------

  function renderHeader() {
    $('userEmail').textContent = state.user ? state.user.email : '';
    var p = primary();
    var addrEl = $('primaryAddress');
    if (p) {
      addrEl.textContent = p.address;
      addrEl.removeAttribute('data-i18n');
      $('userAvatar').textContent = p.address.charAt(0);
    } else {
      addrEl.textContent = t('no_addresses');
      addrEl.setAttribute('data-i18n', 'no_addresses');
      $('userAvatar').textContent = '?';
    }
    $('addressCount').textContent = num(state.addresses.length) + '/' + num(5);
    $('pst').disabled = !p;
    $('newAddressBtn').disabled = state.addresses.length >= 5;
    $('composeBtn').disabled = state.addresses.length === 0;
    $('domainTag').textContent = '@' + state.domain;
  }

  function renderAddresses() {
    var box = $('addressList');
    box.textContent = '';
    state.addresses.forEach(function (a) {
      var card = h('div', 'qc' + (state.filter === a.address ? ' sel' : ''));
      card.tabIndex = 0;
      card.setAttribute('role', 'button');

      var qi = h('span', 'qi'); qi.appendChild(icon(ICON_MAIL));
      var qt = h('div', 'qt');
      qt.appendChild(h('b', null, a.address));
      var sub = t('messages_count', { n: a.message_count || 0 });
      if (a.unread_count) sub += ' · ' + t('unread_count', { n: a.unread_count });
      qt.appendChild(h('small', null, sub));

      var del = h('button', 'qx'); del.type = 'button';
      del.title = t('delete'); del.setAttribute('aria-label', t('delete'));
      del.appendChild(icon(ICON_TRASH));
      del.addEventListener('click', function (e) {
        e.stopPropagation();
        confirmAsk('delete_address_confirm', function () {
          API.del('/api/addresses/' + a.id).then(function () {
            if (state.filter === a.address) state.filter = null;
            return reloadAll();
          }).catch(handleError);
        });
      });

      var qg = h('span', 'qg'); qg.appendChild(icon(ICON_CHEVRON));
      card.appendChild(qi); card.appendChild(qt); card.appendChild(del); card.appendChild(qg);

      function select() {
        state.filter = state.filter === a.address ? null : a.address; // click again to clear
        renderAddresses();
        loadEmails(false).catch(handleError);
      }
      card.addEventListener('click', select);
      card.addEventListener('keydown', function (e) {
        if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); select(); }
      });
      box.appendChild(card);
    });
  }

  function senderName(e) { return e.from_name || e.from_address || '?'; }

  function renderEmails() {
    var list = $('emailList');
    list.textContent = '';
    var empty = state.emails.length === 0;
    $('emptyState').hidden = !empty;
    list.hidden = empty;
    if (empty) return;

    state.emails.forEach(function (e) {
      var row = h('div', 'feat erow' + (e.is_read ? '' : ' unread'));
      row.tabIndex = 0;
      row.setAttribute('role', 'button');

      var name = senderName(e);
      row.appendChild(h('div', 'lg', name.charAt(0)));

      var ft = h('div', 'ft2');
      var b = h('b', null, name);
      if (!e.is_read) b.appendChild(h('span', 'ptag ac', t('new_badge')));
      ft.appendChild(b);
      ft.appendChild(h('small', null, e.subject || t('no_subject')));
      var snippet = (e.snippet || '').replace(/\s+/g, ' ').trim();
      if (snippet) ft.appendChild(h('span', 'hint', snippet));
      row.appendChild(ft);

      row.appendChild(h('span', 'when', relTime(e.received_at)));

      function open() { openEmail(e.id).catch(handleError); }
      row.addEventListener('click', open);
      row.addEventListener('keydown', function (ev) {
        if (ev.key === 'Enter' || ev.key === ' ') { ev.preventDefault(); open(); }
      });
      list.appendChild(row);
    });

    if (state.emails.length < state.total) {
      var more = h('div', 'list-more');
      var btn = h('button', 'b bs', t('load_more')); btn.type = 'button';
      btn.addEventListener('click', function () { loadEmails(true).catch(handleError); });
      more.appendChild(btn);
      list.appendChild(more);
    }
  }

  function renderAll() { renderHeader(); renderAddresses(); renderEmails(); }

  // ---------- data ----------

  function loadMe() {
    return API.get('/api/auth/me').then(function (res) {
      state.user = res.data.user;
      state.domain = res.data.domain;
      state.addresses = res.data.addresses;
    });
  }

  function loadEmails(append) {
    var offset = append ? state.emails.length : 0;
    var q = '/api/emails?limit=' + PAGE + '&offset=' + offset + '&unreadOnly=' + state.unreadOnly;
    if (state.filter) q += '&address=' + encodeURIComponent(state.filter);
    return API.get(q).then(function (res) {
      state.total = res.data.total;
      state.emails = append ? state.emails.concat(res.data.emails) : res.data.emails;
      renderEmails();
    });
  }

  function reloadAll() {
    return loadMe().then(function () { renderHeader(); renderAddresses(); return loadEmails(false); });
  }

  // ---------- email viewer ----------

  // Defence in depth: the iframe is sandboxed (no scripts) AND the markup is cleaned first.
  function sanitizeHtml(html) {
    var doc = new DOMParser().parseFromString(html, 'text/html');
    doc.querySelectorAll('script, iframe, frame, frameset, object, embed, link, meta, base, form, applet, noscript').forEach(function (n) { n.remove(); });
    doc.querySelectorAll('*').forEach(function (el) {
      Array.prototype.slice.call(el.attributes).forEach(function (attr) {
        var name = attr.name.toLowerCase();
        var value = attr.value.replace(/[\u0000- ]+/g, '').toLowerCase();
        if (name.indexOf('on') === 0) { el.removeAttribute(attr.name); return; }
        if (['href', 'src', 'xlink:href', 'action', 'formaction', 'background', 'poster', 'srcset'].indexOf(name) !== -1 &&
            (value.indexOf('javascript:') === 0 || value.indexOf('vbscript:') === 0 || value.indexOf('data:text/html') === 0)) {
          el.removeAttribute(attr.name);
          return;
        }
        if (name === 'style' && /expression\s*\(|javascript:|url\s*\(\s*['"]?\s*javascript:/i.test(attr.value)) {
          el.removeAttribute(attr.name);
        }
      });
    });
    doc.querySelectorAll('a[href]').forEach(function (a) { a.setAttribute('rel', 'noopener noreferrer'); a.setAttribute('target', '_blank'); });
    // Many emails keep their CSS in <head>; carry those <style> blocks over (the CSP and sandbox still apply).
    var headStyles = '';
    if (doc.head) doc.head.querySelectorAll('style').forEach(function (st) { headStyles += st.outerHTML; });
    return headStyles + (doc.body ? doc.body.innerHTML : '');
  }

  function escapeHtml(s) {
    return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }

  var FRAME_CSS = 'body{margin:0;padding:16px;font:14px/1.6 system-ui,sans-serif;background:#fff;color:#111;word-wrap:break-word}' +
    'img{max-width:100%;height:auto}pre{white-space:pre-wrap;font:inherit;margin:0}a{color:#2563eb}';

  function frameDoc(email) {
    var body;
    if (email.html_body && email.html_body.trim()) body = sanitizeHtml(email.html_body);
    else if (email.text_body && email.text_body.trim()) body = '<pre>' + escapeHtml(email.text_body) + '</pre>';
    else if (email.raw) body = '<p style="color:#666;font-size:12px">' + escapeHtml(t('raw_fallback')) + '</p><pre>' + escapeHtml(email.raw) + '</pre>';
    else body = '<p style="color:#666">' + escapeHtml(t('no_body')) + '</p>';
    return '<!DOCTYPE html><html><head><meta charset="utf-8"><base target="_blank"><style>' + FRAME_CSS + '</style></head><body>' + body + '</body></html>';
  }

  function renderReadButton() {
    var e = state.current;
    if (!e) return;
    var key = e.is_read ? 'mark_unread' : 'mark_read';
    $('markReadBtn').setAttribute('data-i18n', key);
    $('markReadBtn').textContent = t(key);
  }

  function renderOpenEmail() {
    var e = state.current;
    if (!e) return;
    var subj = $('emailSubject');
    if (e.subject) { subj.removeAttribute('data-i18n'); subj.textContent = e.subject; }
    else { subj.setAttribute('data-i18n', 'no_subject'); subj.textContent = t('no_subject'); }
    $('metaFrom').textContent = e.from_name ? e.from_name + ' <' + e.from_address + '>' : e.from_address;
    $('metaTo').textContent = e.recipient_address;
    $('metaDate').textContent = formatDate(e.received_at);
    var atts = e.attachments || [];
    $('metaAttWrap').hidden = atts.length === 0;
    $('metaAtt').textContent = atts.map(function (a) { return (a.filename || a.mimeType); }).join(', ');
    renderReadButton();
  }

  function setLocalRead(id, read) {
    state.emails.forEach(function (x) { if (x.id === id) x.is_read = read ? 1 : 0; });
    renderEmails();
  }

  function openEmail(id) {
    return API.get('/api/emails/' + id).then(function (res) {
      state.current = res.data.email;
      renderOpenEmail();
      $('emailFrame').srcdoc = frameDoc(state.current); // property assignment, never string-concatenated into the page
      openModal('emailModal');
      if (!state.current.is_read) {
        return API.patch('/api/emails/' + id + '/read', { read: true }).then(function () {
          state.current.is_read = 1;
          renderReadButton();
          setLocalRead(id, true);
          return loadMe().then(renderAddresses);
        });
      }
    });
  }

  $('markReadBtn').addEventListener('click', function () {
    var e = state.current;
    if (!e) return;
    var read = !e.is_read;
    API.patch('/api/emails/' + e.id + '/read', { read: read }).then(function () {
      e.is_read = read ? 1 : 0;
      renderReadButton();
      setLocalRead(e.id, read);
      return loadMe().then(renderAddresses);
    }).catch(handleError);
  });

  $('deleteBtn').addEventListener('click', function () {
    var e = state.current;
    if (!e) return;
    var id = e.id;
    confirmAsk('delete_confirm', function () {
      API.del('/api/emails/' + id).then(function () { return reloadAll(); }).catch(handleError);
    });
  });

  // ---------- claim address ----------

  var checkTimer = null;
  var checkSeq = 0;
  var LOCAL_RE = /^[a-z0-9]([a-z0-9._-]{0,62}[a-z0-9])?$/;
  var hint = $('availabilityHint');
  var claimBtn = $('claimBtn');
  var localInput = $('localPart');

  function setHint(key, bad, good) {
    hint.className = 'hint' + (bad ? ' no' : '') + (good ? ' yes' : '');
    if (key) { hint.setAttribute('data-i18n', key); hint.textContent = t(key); }
    else { hint.removeAttribute('data-i18n'); hint.textContent = ''; }
  }

  localInput.addEventListener('input', function () {
    var v = localInput.value.trim().toLowerCase();
    localInput.value = v;
    claimBtn.disabled = true;
    clearTimeout(checkTimer);
    checkSeq++;
    if (!v) return setHint(null);
    if (!LOCAL_RE.test(v) || v.indexOf('..') !== -1) return setHint('address_invalid', true);
    setHint('checking');
    var seq = checkSeq;
    checkTimer = setTimeout(function () {
      API.get('/api/addresses/check?localPart=' + encodeURIComponent(v)).then(function (res) {
        if (seq !== checkSeq) return; // a newer keystroke superseded this check
        var d = res.data;
        if (d.available) { setHint('available', false, true); claimBtn.disabled = false; }
        else if (d.reason === 'reserved') setHint('reserved', true);
        else if (d.reason === 'invalid') setHint('address_invalid', true);
        else setHint('taken', true);
      }).catch(function (err) {
        if (seq !== checkSeq) return;
        setHint(err.status === 429 ? 'rate_limited' : 'network_error', true);
      });
    }, 500);
  });

  $('newAddressBtn').addEventListener('click', function () {
    if (state.addresses.length >= 5) return window.alert(t('max_addresses'));
    localInput.value = '';
    claimBtn.disabled = true;
    setHint(null);
    openModal('claimModal');
    setTimeout(function () { localInput.focus(); }, 50);
  });

  claimBtn.addEventListener('click', function () {
    var v = localInput.value.trim().toLowerCase();
    if (!v) return;
    claimBtn.disabled = true;
    API.post('/api/addresses', { localPart: v }).then(function () {
      closeModals();
      return reloadAll();
    }).catch(function (err) {
      if (err.status === 401) return sessionExpired();
      var map = { taken: 'taken', reserved: 'reserved', max_addresses: 'max_addresses', invalid_local_part: 'address_invalid' };
      setHint(map[err.message] || 'claim_failed', true);
    });
  });
  localInput.addEventListener('keydown', function (e) {
    if (e.key === 'Enter' && !claimBtn.disabled) claimBtn.click();
  });

  // ---------- compose / send ----------

  var composeHint = $('composeHint');
  var sendBtn = $('sendBtn');
  var sendBusy = false;

  function setComposeHint(key, bad, good) {
    composeHint.className = 'hint' + (bad ? ' no' : '') + (good ? ' yes' : '');
    if (key) { composeHint.setAttribute('data-i18n', key); composeHint.textContent = t(key); }
    else { composeHint.removeAttribute('data-i18n'); composeHint.textContent = ''; }
  }
  function setSendLabel(key) {
    sendBtn.setAttribute('data-i18n', key);
    sendBtn.textContent = t(key);
  }

  function openCompose(pre) {
    pre = pre || {};
    if (!state.addresses.length) { window.alert(t('need_address_to_send')); return; }
    var sel = $('composeFrom');
    sel.textContent = '';
    state.addresses.forEach(function (a) {
      var o = document.createElement('option');
      o.value = a.address;
      o.textContent = a.address;
      sel.appendChild(o);
    });
    var p = primary();
    sel.value = pre.from || (p ? p.address : state.addresses[0].address);
    $('composeTo').value = pre.to || '';
    $('composeSubject').value = pre.subject || '';
    $('composeBody').value = pre.body || '';
    setComposeHint(null);
    sendBusy = false;
    sendBtn.disabled = false;
    setSendLabel('send');
    openModal('composeModal');
    setTimeout(function () {
      if (pre.to) { var b = $('composeBody'); b.focus(); b.setSelectionRange(0, 0); b.scrollTop = 0; }
      else $('composeTo').focus();
    }, 50);
  }

  // Plain text for quoting a reply (DOMParser documents are inert: nothing runs or loads).
  function htmlToText(html) {
    var doc = new DOMParser().parseFromString(html || '', 'text/html');
    doc.querySelectorAll('style, script').forEach(function (n) { n.remove(); });
    return (doc.body ? doc.body.textContent : '').replace(/[ \t]+/g, ' ').replace(/\n\s*\n\s*\n+/g, '\n\n').trim();
  }

  $('composeBtn').addEventListener('click', function () { openCompose(); });

  $('jsonBtn').addEventListener('click', function () {
    var e = state.current;
    if (!e) return;
    var subj = e.subject || '';
    var reSubject = /^re:\s*/i.test(subj) ? subj : ('Re: ' + subj).trim();
    var src = (e.text_body && e.text_body.trim()) ? e.text_body : htmlToText(e.html_body);
    var quote = src.slice(0, 4000).split(/\r?\n/).map(function (l) { return '> ' + l; }).join('\n');
    var header = t('reply_wrote', { date: formatDate(e.received_at), name: e.from_name || e.from_address });
    var pre = { from: e.recipient_address, to: e.from_address, subject: reSubject, body: '\n\n' + header + '\n' + quote };
    closeModals();
    openCompose(pre);
  });

  var SEND_ERRORS = {
    sender_not_verified: 'sender_not_verified',
    sending_unavailable: 'sending_unavailable',
    daily_limit: 'daily_limit',
    not_your_address: 'not_your_address',
    invalid_input: 'invalid_recipient',
    rate_limited: 'rate_limited',
    provider_rate_limited: 'rate_limited',
    provider_daily_limit: 'daily_limit',
    recipient_not_allowed: 'recipient_not_allowed',
    recipient_suppressed: 'recipient_suppressed',
    send_rejected: 'send_rejected',
    content_too_large: 'content_too_large',
    delivery_failed: 'delivery_failed',
  };

  sendBtn.addEventListener('click', function () {
    if (sendBusy) return;
    var from = $('composeFrom').value;
    var to = $('composeTo').value.trim();
    var subject = $('composeSubject').value.trim();
    var text = $('composeBody').value;
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(to)) return setComposeHint('invalid_recipient', true);
    if (!subject) return setComposeHint('send_need_subject', true);
    if (!text.trim()) return setComposeHint('send_need_body', true);

    sendBusy = true;
    sendBtn.disabled = true;
    setSendLabel('sending');
    setComposeHint(null);
    API.post('/api/send', { from: from, to: to, subject: subject, text: text }).then(function () {
      setSendLabel('send');
      setComposeHint('sent_ok', false, true);
      setTimeout(function () { if (!$('composeModal').hidden) closeModals(); }, 1000);
    }).catch(function (err) {
      sendBusy = false;
      sendBtn.disabled = false;
      setSendLabel('send');
      if (err.status === 401) return sessionExpired();
      if (!err.status) return setComposeHint('network_error', true);
      setComposeHint(SEND_ERRORS[err.message] || 'send_failed', true);
    });
  });

  // ---------- top-level controls ----------

  function logout() {
    API.post('/api/auth/logout').catch(function () {}).then(function () { location.href = '/'; });
  }
  $('logoutBtn').addEventListener('click', logout);
  $('clr').addEventListener('click', logout);

  $('pst').addEventListener('click', function () {
    var p = primary();
    if (!p) return;
    var btn = $('pst');
    function flash(ok) {
      btn.classList.add(ok ? 'ok' : 'no');
      btn.textContent = ok ? t('copied') : t('error');
      setTimeout(function () {
        btn.classList.remove('ok', 'no');
        btn.textContent = t('copy_address');
      }, 1500);
    }
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(p.address).then(function () { flash(true); }, function () { flash(false); });
    } else flash(false);
  });

  $('unreadOnly').addEventListener('change', function (e) {
    state.unreadOnly = e.target.checked;
    loadEmails(false).catch(handleError);
  });
  $('refreshBtn').addEventListener('click', function () { reloadAll().catch(handleError); });

  // Auto-refresh, paused while a modal is open or the tab is hidden.
  setInterval(function () {
    if (modalOpen() || document.hidden) return;
    reloadAll().catch(function (err) { if (err && err.status === 401) sessionExpired(); });
  }, REFRESH_MS);

  // Labels, counts, digits and timestamps all depend on the language, so redraw everything.
  document.addEventListener('i18n:changed', function () {
    renderAll();
    if (state.current) renderOpenEmail();
    if (!$('confirmModal').hidden) $('confirmText').textContent = t($('confirmText').getAttribute('data-i18n') || 'delete_confirm');
  });

  // ---------- boot ----------

  $('emailList').textContent = t('loading');
  loadMe().then(function () {
    // Server-stored preferences win once the user is known.
    if (state.user.language && state.user.language !== getLang()) setLang(state.user.language);
    if (state.user.theme && state.user.theme !== document.documentElement.getAttribute('data-theme')) setTheme(state.user.theme);
    renderHeader();
    renderAddresses();
    return loadEmails(false);
  }).catch(function (err) {
    if (err && err.status === 401) return sessionExpired();
    $('emailList').textContent = t('network_error');
  });
})();
