(function () {
  'use strict';
  var PHONE_WORK = { open: 8 * 60 + 30, close: 17 * 60 + 30 };

  function safe(fn) { try { fn(); } catch (e) { if (window.console) console.error(e); } }

  safe(function () {
    var btn = document.querySelector('.burger'), nav = document.getElementById('nav');
    if (!btn || !nav) return;
    function set(open) {
      nav.classList.toggle('open', open);
      btn.setAttribute('aria-expanded', String(open));
      btn.setAttribute('aria-label', open ? 'Закрыть меню' : 'Открыть меню');
    }
    btn.addEventListener('click', function () { set(btn.getAttribute('aria-expanded') !== 'true'); });
    nav.addEventListener('click', function (e) { if (e.target.closest('a')) set(false); });
    document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && btn.getAttribute('aria-expanded') === 'true') { set(false); btn.focus(); } });
    window.addEventListener('resize', function () { if (window.innerWidth > 980) set(false); });
  });

  safe(function () {
    var items = document.querySelectorAll('.faq details');
    items.forEach(function (d) {
      d.addEventListener('toggle', function () {
        if (d.open) items.forEach(function (o) { if (o !== d) o.open = false; });
      });
    });
  });

  safe(function () {
    var box = document.getElementById('status'), text = document.getElementById('status-text');
    if (!box || !text) return;
    var parts = new Intl.DateTimeFormat('ru-RU', { timeZone: 'Europe/Moscow', hour: '2-digit', minute: '2-digit', hour12: false }).formatToParts(new Date());
    var h = +parts.find(function (p) { return p.type === 'hour'; }).value % 24;
    var m = +parts.find(function (p) { return p.type === 'minute'; }).value;
    var now = h * 60 + m, open = now >= PHONE_WORK.open && now < PHONE_WORK.close;
    box.hidden = false;
    box.classList.toggle('is-open', open);
    text.textContent = open ? 'Сейчас открыто до 17:30' : 'Сейчас закрыто. Откроемся в 08:30';
  });
})();
