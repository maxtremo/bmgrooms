/**
 * Housing BMG — 3-photo room minigallery on house fichas.
 * Photos: https://maxtremo.github.io/bmgrooms/photos/ (not Firebase).
 * WPCode: JavaScript, Auto Insert, Site Wide Footer, Frontend only.
 * Do not paste into snippets 7612 / 7626 / 7632.
 */
(function () {
  var COUNTS = {
    quetzal: { aguila: 3, azulejo: 3, calandria: 3, carpintero: 3, chara: 3, coa: 2, colibri: 3, colorin: 3, flamingo: 3, guajolote: 2, loro: 3, mielero: 3, tucan: 3 },
    xalisco: { guadalajara: 3, guanajuato: 3, huasteca: 3, 'real-de-catorce': 3, 'san-cristobal': 3, tapalpa: 3, tequila: 3, tulum: 3, uruapan: 3, vallarta: 3 }
  };
  var BASE = 'https://maxtremo.github.io/bmgrooms/photos/';
  var WP_FALLBACK = 'https://housingbmg.com/wp-content/uploads/2026/09/';

  function slug(v) {
    return String(v || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
  }
  function houseFromPage() {
    var p = (location.pathname || '').toLowerCase();
    if (p.indexOf('quetzal') !== -1) return 'quetzal';
    if (p.indexOf('xalisco') !== -1) return 'xalisco';
    return '';
  }
  function urls(house, roomName) {
    var room = slug(roomName);
    var n = COUNTS[house] && COUNTS[house][room];
    if (!n) return [];
    var out = [];
    for (var i = 1; i <= n; i++) out.push(BASE + 'casa-' + house + '-cuarto-' + room + '-' + i + '-scaled.jpg');
    return out;
  }
  function injectCss() {
    if (document.getElementById('bmg-room-gallery-css')) return;
    var s = document.createElement('style');
    s.id = 'bmg-room-gallery-css';
    s.textContent = '.bmg-img-wrap{position:relative}.bmg-gallery-thumbs{display:flex;gap:6px;padding:8px 10px 0;position:absolute;left:0;right:0;bottom:8px;z-index:2}.bmg-gallery-thumb{width:44px;height:32px;padding:0;border:2px solid #fff;border-radius:6px;overflow:hidden;opacity:.72;cursor:pointer;background:#fff;box-shadow:0 1px 4px rgba(38,42,69,.35)}.bmg-gallery-thumb.is-active,.bmg-gallery-thumb:hover{opacity:1}.bmg-gallery-thumb img{width:100%;height:100%;object-fit:cover;display:block;pointer-events:none}';
    document.head.appendChild(s);
  }
  function bindFallback(img, fileName) {
    img.onerror = function () {
      if (img.dataset.bmgFb === '1') {
        img.onerror = null;
        return;
      }
      img.dataset.bmgFb = '1';
      img.src = WP_FALLBACK + fileName;
    };
  }
  function applyCard(card, house) {
    if (card.getAttribute('data-bmg-gallery') === '1') return;
    var title = card.querySelector('.bmg-title, .room-name, h4');
    var img = card.querySelector('.bmg-card-img, .room-img, img');
    if (!title || !img) return;
    var name = title.textContent.replace(/^\s*(Room|Cuarto)\s+/i, '').trim();
    var gallery = urls(house, name);
    if (!gallery[0]) return;
    card.setAttribute('data-bmg-gallery', '1');
    var fileName = gallery[0].split('/').pop();
    img.referrerPolicy = 'no-referrer';
    img.src = gallery[0];
    bindFallback(img, fileName);
    var wrap = img.closest('.bmg-img-wrap, .room-img-wrap') || img.parentElement;
    if (wrap && wrap.setAttribute) {
      wrap.setAttribute('data-img', encodeURIComponent(gallery[0]));
      wrap.setAttribute('data-gallery', encodeURIComponent(JSON.stringify(gallery)));
    }
    if (gallery.length < 2 || !wrap) return;
    if (wrap.querySelector('.bmg-gallery-thumbs')) return;
    var bar = document.createElement('div');
    bar.className = 'bmg-gallery-thumbs';
    bar.setAttribute('aria-label', 'Photos of ' + name);
    gallery.forEach(function (url, i) {
      var btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'bmg-gallery-thumb' + (i === 0 ? ' is-active' : '');
      btn.setAttribute('data-gallery-index', String(i));
      btn.setAttribute('aria-label', 'Photo ' + (i + 1));
      var t = document.createElement('img');
      t.src = url;
      t.alt = '';
      t.referrerPolicy = 'no-referrer';
      btn.appendChild(t);
      btn.addEventListener('click', function (e) {
        e.preventDefault();
        e.stopPropagation();
        img.src = url;
        img.dataset.bmgFb = '';
        bindFallback(img, url.split('/').pop());
        if (wrap.setAttribute) wrap.setAttribute('data-img', encodeURIComponent(url));
        bar.querySelectorAll('.bmg-gallery-thumb').forEach(function (b) {
          b.classList.toggle('is-active', b === btn);
        });
      });
      bar.appendChild(btn);
    });
    wrap.appendChild(bar);
  }
  function run() {
    var house = houseFromPage();
    if (!house) return;
    injectCss();
    document.querySelectorAll('.bmg-card, .room-card').forEach(function (card) {
      applyCard(card, house);
    });
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', run);
  else run();
  document.addEventListener('bmg:min-prices', run);
  var n = 0;
  var t = setInterval(function () {
    run();
    n += 1;
    if (n > 20) clearInterval(t);
  }, 1500);
  var list = document.getElementById('list-interior');
  if (list && window.MutationObserver) {
    new MutationObserver(run).observe(list, { childList: true, subtree: true });
  }
})();
