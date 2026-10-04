(function () {
  var KEY = 'es_lang';

  var I18N = {
    en: {
      app_name: 'Edge Mail',
      app_tagline: 'Your private email on your own domain',
      // Auth page
      login: 'Log in',
      signup: 'Sign up',
      email: 'Email',
      password: 'Password',
      password_hint: 'At least 8 characters',
      email_placeholder: 'you@example.com',
      password_placeholder: '••••••••',
      login_action: 'Log in',
      signup_action: 'Create account',
      auth_error_generic: 'Invalid email or password.',
      auth_error_exists: 'This email is already registered.',
      auth_error_weak: 'Password must be at least 8 characters.',
      auth_welcome: 'Welcome back',
      auth_welcome_new: 'Create your account',
      // Inbox
      inbox: 'Inbox',
      logout: 'Log out',
      your_address: 'Your address',
      copy_address: 'Copy address',
      copied: 'Copied!',
      new_address: 'New address',
      no_addresses: 'You have not claimed an address yet.',
      no_emails: 'No emails yet. Share your address with others.',
      unread_only: 'Unread only',
      refresh: 'Refresh',
      // Address claim
      claim_address: 'Claim address',
      local_part: 'Local part',
      local_part_hint: 'Letters, numbers, dots, dashes. Lowercase only.',
      available: 'Available',
      taken: 'Already taken',
      reserved: 'This name is reserved.',
      checking: 'Checking…',
      claim_action: 'Claim',
      cancel: 'Cancel',
      max_addresses: 'You can claim at most 5 addresses.',
      // Email actions
      mark_read: 'Mark as read',
      mark_unread: 'Mark as unread',
      delete: 'Delete',
      reply: 'Reply',
      from: 'From',
      to: 'To',
      subject: 'Subject',
      received: 'Received',
      no_subject: '(no subject)',
      // Errors / notices
      error: 'Error',
      loading: 'Loading…',
      session_expired: 'Your session expired. Please log in again.',
      network_error: 'Network error. Please try again.',
      delete_confirm: 'Delete this email?',
      delete_address_confirm: 'Release this address? Emails sent to it will no longer be delivered.',
      // Security note
      security_note: 'Passwords are hashed with PBKDF2-SHA256. Your session uses an HTTP-only cookie.',
      // Footer
      made_by: 'made by',
      privacy: 'Privacy',
      terms: 'Terms',
      // Relative time
      just_now: 'just now',
      minutes_ago: '{n} min ago',
      hours_ago: '{n} h ago',
      days_ago: '{n} d ago',
      // Additional UI strings
      new_badge: 'New',
      messages_count: '{n} messages',
      unread_count: '{n} unread',
      load_more: 'Load more',
      close: 'Close',
      confirm_yes: 'Yes, continue',
      address_invalid: 'Use 1–64 lowercase letters, numbers, dots, dashes or underscores.',
      claim_failed: 'Could not claim this address.',
      rate_limited: 'Too many attempts. Please wait a minute.',
      auth_error_email: 'Please enter a valid email address.',
      no_body: '(this message has no content)',
      attachments: 'Attachments',
      show_all: 'Show all addresses',
      footer_created_with: 'Created with',
      footer_by: 'by',
      // Compose / send
      compose: 'Compose',
      send: 'Send',
      sending: 'Sending…',
      sent_ok: 'Message sent.',
      message_body: 'Message',
      to_placeholder: 'recipient@example.com',
      subject_placeholder: 'Subject',
      body_placeholder: 'Write your message…',
      invalid_recipient: 'Please enter a valid recipient address.',
      send_need_subject: 'Please enter a subject.',
      send_need_body: 'Please write a message.',
      send_failed: 'The message could not be sent. Please try again.',
      sender_not_verified: 'Sending is not set up for this domain yet. The site owner must onboard the domain in Cloudflare Email Service.',
      sending_unavailable: 'Sending is not enabled on this server.',
      daily_limit: 'Daily sending limit reached. Try again tomorrow.',
      not_your_address: 'You can only send from your own addresses.',
      reply_wrote: 'On {date}, {name} wrote:',
      raw_fallback: 'No readable body was stored for this message. Showing its raw source instead.',
      need_address_to_send: 'Claim an address first to send mail.',
      recipient_not_allowed: 'This recipient is not allowed yet. Until the site owner finishes onboarding the domain in Cloudflare Email Service, mail can only be sent to verified addresses.',
      recipient_suppressed: 'This recipient cannot receive mail right now (previous delivery to it bounced or was reported).',
      send_rejected: 'The mail service rejected this message. Check the addresses and subject, then try again.',
      content_too_large: 'The message is too large to send.',
      delivery_failed: 'The recipient\'s mail server refused or could not receive the message.',
      // Legal pages
      back_home: 'Back to Edge Mail',
    },
    fa: {
      app_name: 'ایمیل لبه',
      app_tagline: 'ایمیل خصوصی شما روی دامنهٔ خودتان',
      login: 'ورود',
      signup: 'ثبت‌نام',
      email: 'ایمیل',
      password: 'رمز عبور',
      password_hint: 'حداقل ۸ کاراکتر',
      email_placeholder: 'you@example.com',
      password_placeholder: '••••••••',
      login_action: 'ورود',
      signup_action: 'ایجاد حساب',
      auth_error_generic: 'ایمیل یا رمز عبور نادرست است.',
      auth_error_exists: 'این ایمیل قبلاً ثبت شده است.',
      auth_error_weak: 'رمز عبور باید حداقل ۸ کاراکتر باشد.',
      auth_welcome: 'خوش آمدید',
      auth_welcome_new: 'حساب خود را بسازید',
      inbox: 'صندوق ورودی',
      logout: 'خروج',
      your_address: 'آدرس شما',
      copy_address: 'کپی آدرس',
      copied: 'کپی شد!',
      new_address: 'آدرس جدید',
      no_addresses: 'هنوز آدرسی انتخاب نکرده‌اید.',
      no_emails: 'هنوز ایمیلی دریافت نکرده‌اید. آدرس خود را با دیگران به اشتراک بگذارید.',
      unread_only: 'فقط خوانده‌نشده‌ها',
      refresh: 'به‌روزرسانی',
      claim_address: 'دریافت آدرس',
      local_part: 'بخش محلی',
      local_part_hint: 'حروف، اعداد، نقطه، خط تیره. فقط حروف کوچک.',
      available: 'در دسترس',
      taken: 'قبلاً گرفته شده',
      reserved: 'این نام رزرو شده است.',
      checking: 'در حال بررسی…',
      claim_action: 'دریافت',
      cancel: 'انصراف',
      max_addresses: 'حداکثر می‌توانید ۵ آدرس داشته باشید.',
      mark_read: 'علامت‌گذاری خوانده‌شده',
      mark_unread: 'علامت‌گذاری خوانده‌نشده',
      delete: 'حذف',
      reply: 'پاسخ',
      from: 'از',
      to: 'به',
      subject: 'موضوع',
      received: 'دریافت',
      no_subject: '(بدون موضوع)',
      error: 'خطا',
      loading: 'در حال بارگذاری…',
      session_expired: 'نشست شما منقضی شد. لطفاً دوباره وارد شوید.',
      network_error: 'خطای شبکه. لطفاً دوباره تلاش کنید.',
      delete_confirm: 'این ایمیل حذف شود؟',
      delete_address_confirm: 'این آدرس آزاد شود؟ ایمیل‌های ارسالی به آن دیگر تحویل داده نخواهند شد.',
      security_note: 'رمزهای عبور با PBKDF2-SHA256 درهم‌سازی می‌شوند. نشست شما از کوکی HTTP-only استفاده می‌کند.',
      made_by: 'ساخته‌شده توسط',
      privacy: 'حریم خصوصی',
      terms: 'شرایط',
      just_now: 'همین حالا',
      minutes_ago: '{n} دقیقه پیش',
      hours_ago: '{n} ساعت پیش',
      days_ago: '{n} روز پیش',
      new_badge: 'جدید',
      messages_count: '{n} پیام',
      unread_count: '{n} خوانده‌نشده',
      load_more: 'نمایش بیشتر',
      close: 'بستن',
      confirm_yes: 'بله، ادامه',
      address_invalid: 'از ۱ تا ۶۴ حرف کوچک، عدد، نقطه، خط تیره یا زیرخط استفاده کنید.',
      claim_failed: 'دریافت این آدرس ممکن نشد.',
      rate_limited: 'تلاش‌های زیاد. لطفاً یک دقیقه صبر کنید.',
      auth_error_email: 'لطفاً یک ایمیل معتبر وارد کنید.',
      no_body: '(این پیام محتوایی ندارد)',
      attachments: 'پیوست‌ها',
      show_all: 'نمایش همهٔ آدرس‌ها',
      footer_created_with: 'ساخته‌شده با',
      footer_by: 'توسط',
      compose: 'نوشتن ایمیل',
      send: 'ارسال',
      sending: 'در حال ارسال…',
      sent_ok: 'پیام ارسال شد.',
      message_body: 'پیام',
      to_placeholder: 'recipient@example.com',
      subject_placeholder: 'موضوع',
      body_placeholder: 'پیام خود را بنویسید…',
      invalid_recipient: 'لطفاً یک آدرس گیرندهٔ معتبر وارد کنید.',
      send_need_subject: 'لطفاً موضوع را وارد کنید.',
      send_need_body: 'لطفاً پیام را بنویسید.',
      send_failed: 'ارسال پیام ممکن نشد. لطفاً دوباره تلاش کنید.',
      sender_not_verified: 'ارسال برای این دامنه هنوز راه‌اندازی نشده است. مدیر سایت باید دامنه را در سرویس ایمیل کلودفلر ثبت کند.',
      sending_unavailable: 'ارسال ایمیل روی این سرور فعال نیست.',
      daily_limit: 'به سقف ارسال روزانه رسیده‌اید. فردا دوباره تلاش کنید.',
      not_your_address: 'فقط از آدرس‌های خودتان می‌توانید ارسال کنید.',
      reply_wrote: 'در تاریخ {date}، {name} نوشت:',
      raw_fallback: 'برای این پیام متن قابل‌خواندنی ذخیره نشده است. به‌جای آن متن خام پیام نمایش داده می‌شود.',
      need_address_to_send: 'برای ارسال ایمیل ابتدا یک آدرس بگیرید.',
      recipient_not_allowed: 'ارسال به این گیرنده هنوز مجاز نیست. تا زمانی که مدیر سایت دامنه را در سرویس ایمیل کلودفلر ثبت نکرده، فقط می‌توان به آدرس‌های تأییدشده ایمیل فرستاد.',
      recipient_suppressed: 'این گیرنده فعلاً نمی‌تواند ایمیل دریافت کند (ارسال قبلی به آن برگشت خورده یا گزارش شده است).',
      send_rejected: 'سرویس ایمیل این پیام را نپذیرفت. آدرس‌ها و موضوع را بررسی کنید و دوباره تلاش کنید.',
      content_too_large: 'حجم پیام برای ارسال بیش از حد است.',
      delivery_failed: 'سرور ایمیل گیرنده پیام را نپذیرفت یا نتوانست آن را دریافت کند.',
      back_home: 'بازگشت به ایمیل لبه',
    },
  };

  function getLang() {
    var l = null;
    try { l = localStorage.getItem(KEY); } catch (e) {}
    return l === 'fa' ? 'fa' : 'en';
  }

  // Converts [0-9] to Persian digits, only while Persian is active.
  function toFaDigits(str) {
    var s = String(str);
    if (getLang() !== 'fa') return s;
    return s.replace(/[0-9]/g, function (d) { return '۰۱۲۳۴۵۶۷۸۹'.charAt(Number(d)); });
  }

  function t(key, vars) {
    var dict = I18N[getLang()] || I18N.en;
    var s = dict[key];
    if (s === undefined) s = I18N.en[key];
    if (s === undefined) s = key;
    if (vars) {
      s = s.replace(/\{(\w+)\}/g, function (m, k) {
        return vars[k] === undefined ? m : toFaDigits(vars[k]);
      });
    }
    return s;
  }

  function locale() { return getLang() === 'fa' ? 'fa-IR' : 'en-US'; }

  // ts = unix seconds
  function formatDate(ts) {
    try {
      return new Intl.DateTimeFormat(locale(), { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(ts * 1000));
    } catch (e) {
      return new Date(ts * 1000).toLocaleString();
    }
  }

  function relTime(ts) {
    var diff = Math.max(0, Math.floor(Date.now() / 1000) - ts);
    if (diff < 60) return t('just_now');
    if (diff < 3600) return t('minutes_ago', { n: Math.floor(diff / 60) });
    if (diff < 86400) return t('hours_ago', { n: Math.floor(diff / 3600) });
    if (diff < 86400 * 7) return t('days_ago', { n: Math.floor(diff / 86400) });
    return formatDate(ts);
  }

  function applyTranslations() {
    var lang = getLang();
    var pageKey = document.body && document.body.getAttribute('data-page-title');
    document.title = pageKey ? t(pageKey) + ' \u2013 ' + t('app_name') : t('app_name');

    document.querySelectorAll('[data-i18n]').forEach(function (el) {
      el.textContent = t(el.getAttribute('data-i18n'));
    });
    // data-i18n-attr="placeholder:key;title:key2"
    document.querySelectorAll('[data-i18n-attr]').forEach(function (el) {
      el.getAttribute('data-i18n-attr').split(';').forEach(function (pair) {
        var i = pair.indexOf(':');
        if (i < 1) return;
        el.setAttribute(pair.slice(0, i).trim(), t(pair.slice(i + 1).trim()));
      });
    });
    document.querySelectorAll('[data-i18n-title]').forEach(function (el) {
      var v = t(el.getAttribute('data-i18n-title'));
      el.setAttribute('title', v);
      el.setAttribute('aria-label', v);
    });

    var btn = document.getElementById('langToggle');
    if (btn) btn.textContent = lang === 'fa' ? 'EN' : 'فا'; // shows the language you can switch TO
  }

  // RTL toggling: <html dir> drives all logical-property CSS.
  function applyDirection(lang) {
    var root = document.documentElement;
    root.setAttribute('lang', lang);
    root.setAttribute('dir', lang === 'fa' ? 'rtl' : 'ltr');
  }

  function setLang(lang, opts) {
    if (lang !== 'en' && lang !== 'fa') return;
    try { localStorage.setItem(KEY, lang); } catch (e) {}
    applyDirection(lang);
    applyTranslations();
    document.dispatchEvent(new CustomEvent('i18n:changed', { detail: { lang: lang } }));
    if (opts && opts.push && window.API && API.patch) {
      API.patch('/api/auth/preferences', { language: lang }).catch(function () {});
    }
  }

  window.I18N = I18N;
  window.t = t;
  window.applyTranslations = applyTranslations;
  window.toFaDigits = toFaDigits;
  window.getLang = getLang;
  window.setLang = setLang;
  window.formatDate = formatDate;
  window.relTime = relTime;

  var toggle = document.getElementById('langToggle');
  if (toggle) {
    toggle.addEventListener('click', function () {
      setLang(getLang() === 'fa' ? 'en' : 'fa', { push: true });
    });
  }

  applyDirection(getLang());
  applyTranslations();
})();
