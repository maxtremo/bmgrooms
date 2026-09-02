/**
 * Housing BMG — 3-photo room minigallery on house fichas.
 * Photos: https://maxtremo.github.io/bmgrooms/photos/ (not Firebase).
 * Own lightbox #bmg-lb (does not use the widget single-image lightbox).
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

  var lbPics = [];
  var lbIndex = 0;
  var lbTitle = '';
  var captureBound = false;
  var listObserved = false;
  var keyBound = false;

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
  function fileNameOf(url) {
    var s = String(url || '');
    var q = s.split('?')[0];
    var parts = q.split('/');
    return parts[parts.length - 1] || '';
  }
  function injectCss() {
    if (document.getElementById('bmg-room-gallery-css')) return;
    var s = document.createElement('style');
    s.id = 'bmg-room-gallery-css';
    s.textContent = [
      '.bmg-img-wrap,.room-img-wrap{position:relative}',
      '.bmg-gallery-thumbs{display:flex;gap:6px;padding:8px 10px 0;position:absolute;left:0;right:0;bottom:8px;z-index:2;pointer-events:auto}',
      '.bmg-gallery-thumb{flex:0 0 44px;width:44px!important;min-width:44px;height:32px!important;min-height:32px;padding:0!important;border:2px solid #fff!important;border-radius:6px;overflow:hidden;opacity:.72;cursor:pointer;background:#fff center/cover no-repeat;box-shadow:0 1px 4px rgba(38,42,69,.35);appearance:none;-webkit-appearance:none}',
      '.bmg-gallery-thumb.is-active,.bmg-gallery-thumb:hover{opacity:1}',
      '.bmg-gallery-thumb img{width:44px!important;height:32px!important;max-width:none!important;object-fit:cover;display:block!important;pointer-events:none}',
      '#bmg-lb{display:none;position:fixed;inset:0;background:rgba(10,10,20,.88);z-index:10050;align-items:center;justify-content:center;-webkit-backdrop-filter:blur(6px);backdrop-filter:blur(6px)}',
      '#bmg-lb.is-open{display:flex}',
      '#bmg-lb .bmg-lb-wrap{position:relative;max-width:90vw;max-height:88vh}',
      '#bmg-lb .bmg-lb-img{display:block;max-width:90vw;max-height:85vh;border-radius:12px;box-shadow:0 24px 80px rgba(0,0,0,.55);object-fit:contain}',
      '#bmg-lb button.bmg-lb-nav,#bmg-lb button.bmg-lb-close{all:unset;box-sizing:border-box!important;display:flex!important;align-items:center!important;justify-content:center!important;width:44px!important;height:44px!important;min-width:44px!important;min-height:44px!important;max-width:44px!important;padding:0!important;margin:0 10px!important;border:0!important;border-radius:50%!important;background:#fff!important;color:#1E1B4B!important;font:700 28px/1 Nunito,system-ui,sans-serif!important;text-align:center!important;cursor:pointer!important;box-shadow:0 4px 14px rgba(0,0,0,.25)!important;z-index:3}',
      '#bmg-lb button.bmg-lb-close{position:absolute!important;top:8px!important;right:8px!important;width:36px!important;height:36px!important;min-width:36px!important;min-height:36px!important;max-width:36px!important;margin:0!important;font-size:26px!important}',
      '#bmg-lb button svg{display:none!important}',
      '#bmg-lb .bmg-lb-prev::before{content:"\\2039"}',
      '#bmg-lb .bmg-lb-next::before{content:"\\203A"}',
      '#bmg-lb .bmg-lb-close::before{content:"\\00D7"}',
      '#bmg-lb .bmg-lb-name{margin-top:10px;text-align:center;color:rgba(255,255,255,.75);font-size:13px;font-weight:700;white-space:nowrap}',
      '#bmg-lb .bmg-lb-nav[hidden]{display:none!important}',
      '#bmg-lb .bmg-lb-thumbs{display:flex;justify-content:center;gap:8px;margin-top:10px}',
      '#bmg-lb .bmg-lb-thumbs[hidden]{display:none}',
      '#bmg-lb .bmg-lb-thumb{width:54px;height:40px;padding:0;border:2px solid rgba(255,255,255,.55);border-radius:8px;overflow:hidden;background:#fff;cursor:pointer;opacity:.75}',
      '#bmg-lb .bmg-lb-thumb.is-active{opacity:1;border-color:#00B8C4;-webkit-transform:scale(1.06);transform:scale(1.06)}',
      '#bmg-lb .bmg-lb-thumb img{width:100%;height:100%;object-fit:cover;display:block;pointer-events:none}',
      '@media (max-width:600px){#bmg-lb .bmg-lb-nav{position:absolute;top:50%;margin:0;-webkit-transform:translateY(-50%);transform:translateY(-50%)}#bmg-lb .bmg-lb-prev{left:8px}#bmg-lb .bmg-lb-next{right:8px}#bmg-lb .bmg-lb-wrap{max-width:100%}}',

      '.bmg-ficha-hero{display:grid!important;grid-template-columns:minmax(0,1fr) auto;grid-template-areas:"title price" "addr addr";gap:10px 20px;align-items:center;margin:0 0 18px!important;width:100%;}',
      '.bmg-ficha-hero h1,.bmg-ficha-hero .elementor-heading-title{grid-area:title;margin:0!important;padding-right:8px!important;color:#262A45!important;line-height:1.2!important;align-self:center;}',
      '.bmg-ficha-hero .bmg-live-price{grid-area:price;align-self:center!important;margin:0!important;padding:10px 16px!important;border-radius:12px!important;border:1px solid #00B8C4!important;background:#fff!important;box-shadow:0 2px 10px rgba(38,42,69,.12)!important;}',
      '.bmg-ficha-hero .bmg-ficha-addr,.bmg-ficha-hero .bmg-ficha-addr *{grid-area:addr;color:#262A45!important;font-size:14px!important;font-weight:600!important;line-height:1.4!important;margin:0!important;opacity:1!important;}',
      '@media (max-width:700px){.bmg-ficha-hero{grid-template-columns:1fr;grid-template-areas:"title" "price" "addr";}.bmg-ficha-hero .bmg-live-price{justify-self:start;}}',
    ].join('');
    document.head.appendChild(s);
  }
  function bindFallback(img, fileName) {
    img.onerror = function () {
      if (img.getAttribute('data-bmg-fb') === '1') {
        img.onerror = null;
        return;
      }
      img.setAttribute('data-bmg-fb', '1');
      img.src = WP_FALLBACK + fileName;
    };
  }
  function parsePics(wrap) {
    var pics = [];
    if (!wrap) return pics;
    try {
      pics = JSON.parse(decodeURIComponent(wrap.getAttribute('data-gallery') || '')) || [];
    } catch (err) {
      pics = [];
    }
    return pics;
  }
  function indexOfShown(wrap, pics) {
    var img = wrap.querySelector('.bmg-card-img, .room-img, img');
    var current = (img && img.src) || '';
    var encoded = wrap.getAttribute('data-img') || '';
    var fromAttr = '';
    try { fromAttr = decodeURIComponent(encoded); } catch (err) { fromAttr = encoded; }
    var i;
    for (i = 0; i < pics.length; i++) {
      if (pics[i] === current || pics[i] === fromAttr) return i;
    }
    var curFile = fileNameOf(current) || fileNameOf(fromAttr);
    if (curFile) {
      for (i = 0; i < pics.length; i++) {
        if (fileNameOf(pics[i]) === curFile) return i;
      }
    }
    return 0;
  }
  function lbEls() {
    var root = document.getElementById('bmg-lb');
    if (!root) return null;
    return {
      root: root,
      img: root.querySelector('.bmg-lb-img'),
      name: root.querySelector('.bmg-lb-name'),
      prev: root.querySelector('.bmg-lb-prev'),
      next: root.querySelector('.bmg-lb-next'),
      thumbs: root.querySelector('.bmg-lb-thumbs'),
      close: root.querySelector('.bmg-lb-close')
    };
  }
  function renderLb() {
    var els = lbEls();
    if (!els) return;
    var total = lbPics.length;
    var src = lbPics[lbIndex] || '';
    els.img.setAttribute('data-bmg-fb', '');
    els.img.referrerPolicy = 'no-referrer';
    els.img.alt = lbTitle;
    els.img.src = src;
    bindFallback(els.img, fileNameOf(src));
    els.name.textContent = total > 1 ? (lbTitle + ' · ' + (lbIndex + 1) + ' / ' + total) : lbTitle;
    var many = total > 1;
    els.prev.hidden = !many;
    els.next.hidden = !many;
    els.thumbs.hidden = !many;
    if (!many) {
      els.thumbs.innerHTML = '';
      return;
    }
    var html = '';
    var i;
    for (i = 0; i < lbPics.length; i++) {
      html += '<button type="button" class="bmg-lb-thumb' + (i === lbIndex ? ' is-active' : '') + '" data-index="' + i + '" aria-label="Foto ' + (i + 1) + '"><img src="' + lbPics[i] + '" alt="" referrerpolicy="no-referrer"></button>';
    }
    els.thumbs.innerHTML = html;
  }
  function lbStep(delta) {
    var total = lbPics.length;
    if (total < 2) return;
    lbIndex = (lbIndex + delta + total) % total;
    renderLb();
  }
  function openLb(pics, name, start) {
    if (!pics || !pics.length) return;
    ensureLb();
    lbPics = pics.slice();
    var n = Number(start);
    lbIndex = (n === n && n >= 0 && n < lbPics.length) ? n : 0;
    lbTitle = name || '';
    renderLb();
    var els = lbEls();
    els.root.className = 'is-open';
    els.root.setAttribute('aria-hidden', 'false');
    document.body.style.overflow = 'hidden';
  }
  function closeLb() {
    var els = lbEls();
    if (!els) return;
    els.root.className = '';
    els.root.setAttribute('aria-hidden', 'true');
    document.body.style.overflow = '';
    lbPics = [];
    lbIndex = 0;
    setTimeout(function () {
      var e2 = lbEls();
      if (!e2) return;
      e2.img.src = '';
      e2.thumbs.innerHTML = '';
    }, 300);
  }
  function ensureLb() {
    if (document.getElementById('bmg-lb')) return;
    var el = document.createElement('div');
    el.id = 'bmg-lb';
    el.setAttribute('role', 'dialog');
    el.setAttribute('aria-modal', 'true');
    el.setAttribute('aria-label', 'Room photo');
    el.setAttribute('aria-hidden', 'true');
    el.innerHTML = ''
      + '<button type="button" class="bmg-lb-nav bmg-lb-prev" aria-label="Foto anterior"></button>'
      + '<div class="bmg-lb-wrap">'
      + '<img class="bmg-lb-img" src="" alt="Habitación">'
      + '<div class="bmg-lb-thumbs" hidden></div>'
      + '<div class="bmg-lb-name"></div>'
      + '<button type="button" class="bmg-lb-close" aria-label="Cerrar"></button>'
      + '</div>'
      + '<button type="button" class="bmg-lb-nav bmg-lb-next" aria-label="Foto siguiente"></button>';
    document.body.appendChild(el);
    el.querySelector('.bmg-lb-close').addEventListener('click', function (e) {
      e.preventDefault();
      e.stopPropagation();
      closeLb();
    });
    el.querySelector('.bmg-lb-prev').addEventListener('click', function (e) {
      e.preventDefault();
      e.stopPropagation();
      lbStep(-1);
    });
    el.querySelector('.bmg-lb-next').addEventListener('click', function (e) {
      e.preventDefault();
      e.stopPropagation();
      lbStep(1);
    });
    el.querySelector('.bmg-lb-thumbs').addEventListener('click', function (e) {
      var btn = e.target.closest ? e.target.closest('.bmg-lb-thumb') : null;
      if (!btn) return;
      e.preventDefault();
      e.stopPropagation();
      lbIndex = parseInt(btn.getAttribute('data-index'), 10) || 0;
      renderLb();
    });
    el.addEventListener('click', function (e) {
      if (e.target === el) closeLb();
    });
    if (!keyBound) {
      keyBound = true;
      document.addEventListener('keydown', function (e) {
        var root = document.getElementById('bmg-lb');
        if (!root || root.className.indexOf('is-open') === -1) return;
        if (e.key === 'Escape') {
          e.preventDefault();
          closeLb();
        } else if (e.key === 'ArrowLeft') {
          e.preventDefault();
          lbStep(-1);
        } else if (e.key === 'ArrowRight') {
          e.preventDefault();
          lbStep(1);
        }
      });
    }
  }
  function onWrapCapture(e) {
    var t = e.target;
    if (!t || !t.closest) return;
    if (t.closest('#bmg-lb')) return;
    if (t.closest('.bmg-gallery-thumb, .bmg-gallery-thumbs, .room-gallery-thumb, .room-gallery-thumbs')) return;
    var wrap = t.closest('.bmg-img-wrap, .room-img-wrap');
    if (!wrap) return;
    var card = wrap.closest('.bmg-card, .room-card');
    if (!card || card.getAttribute('data-bmg-gallery') !== '1') return;
    var pics = parsePics(wrap);
    if (!pics.length) return;
    var name = '';
    try { name = decodeURIComponent(wrap.getAttribute('data-name') || ''); } catch (err) { name = wrap.getAttribute('data-name') || ''; }
    if (!name) {
      var title = card.querySelector('.bmg-title, .room-name, h4');
      name = title ? title.textContent.replace(/^\s*(Room|Cuarto)\s+/i, '').trim() : '';
    }
    e.preventDefault();
    e.stopPropagation();
    if (e.stopImmediatePropagation) e.stopImmediatePropagation();
    openLb(pics, name, indexOfShown(wrap, pics));
  }
  function bindCapture() {
    if (captureBound) return;
    captureBound = true;
    document.addEventListener('click', onWrapCapture, true);
  }
  function applyCard(card, house) {
    if (card.getAttribute('data-bmg-gallery') === '1') return;
    var title = card.querySelector('.bmg-title, .room-name, h4');
    var img = card.querySelector('.bmg-card-img, .room-img, img');
    if (!title || !img) return;
    var name = title.textContent.replace(/^\s*(Room|Cuarto)\s+/i, '').trim();
    var pics = urls(house, name);
    if (!pics[0]) return;
    card.setAttribute('data-bmg-gallery', '1');
    img.referrerPolicy = 'no-referrer';
    img.src = pics[0];
    img.setAttribute('data-bmg-fb', '');
    bindFallback(img, fileNameOf(pics[0]));
    var wrap = img.closest('.bmg-img-wrap, .room-img-wrap') || img.parentElement;
    if (wrap && wrap.setAttribute) {
      wrap.setAttribute('data-img', encodeURIComponent(pics[0]));
      wrap.setAttribute('data-gallery', encodeURIComponent(JSON.stringify(pics)));
      wrap.setAttribute('data-name', encodeURIComponent(name));
    }
    if (pics.length < 2 || !wrap) return;
    if (wrap.querySelector('.bmg-gallery-thumbs')) return;
    var bar = document.createElement('div');
    bar.className = 'bmg-gallery-thumbs';
    bar.setAttribute('aria-label', 'Photos of ' + name);
    pics.forEach(function (url, i) {
      var btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'bmg-gallery-thumb' + (i === 0 ? ' is-active' : '');
      btn.setAttribute('data-gallery-index', String(i));
      btn.setAttribute('aria-label', 'Photo ' + (i + 1));
      var thumb = document.createElement('img');
      thumb.src = url;
      thumb.alt = '';
      thumb.referrerPolicy = 'no-referrer';
      btn.style.backgroundImage = 'url(' + url + ')';
      btn.appendChild(thumb);
      btn.addEventListener('click', function (e) {
        e.preventDefault();
        e.stopPropagation();
        if (e.stopImmediatePropagation) e.stopImmediatePropagation();
        img.src = url;
        img.setAttribute('data-bmg-fb', '');
        bindFallback(img, fileNameOf(url));
        if (wrap.setAttribute) wrap.setAttribute('data-img', encodeURIComponent(url));
        var nodes = bar.querySelectorAll('.bmg-gallery-thumb');
        var k;
        for (k = 0; k < nodes.length; k++) nodes[k].classList.toggle('is-active', nodes[k] === btn);
      });
      bar.appendChild(btn);
    });
    wrap.appendChild(bar);
  }

  function findHeroPrice() {
    var nodes = document.querySelectorAll(".bmg-live-price");
    var i;
    for (i = 0; i < nodes.length; i++) {
      if (nodes[i].closest("#list-interior, .bmg-card, .room-card, .jet-listing-grid, footer")) continue;
      return nodes[i];
    }
    return null;
  }
  function findHeroAddr(h1) {
    var scope = (h1 && (h1.closest(".elementor-section, article, main, .site-main") || document.body));
    var nodes = scope.querySelectorAll("p, span, div, .jet-listing-dynamic-field__content, .elementor-widget-text-editor, .elementor-heading-title");
    var i;
    for (i = 0; i < nodes.length; i++) {
      var n = nodes[i];
      if (n.closest("#list-interior, .bmg-card, nav, header, footer, #bmg-lb")) continue;
      if (n.querySelector("h1, .bmg-live-price")) continue;
      var tx = (n.textContent || "").replace(/\s+/g, " ").trim();
      if (tx.length < 24 || tx.length > 180) continue;
      if (!/Guadalajara|Col\.|Colonia|Zuno|Niños Héroes|Ninos Heroes/i.test(tx)) continue;
      if (!/\d/.test(tx)) continue;
      if (/MXN|month|contract|Bedroom|Bathroom/i.test(tx)) continue;
      return n;
    }
    return null;
  }
  function layoutHero() {
    var h1 = document.querySelector("h1");
    if (!h1 || h1.closest("#list-interior")) return;
    var price = findHeroPrice();
    var addr = findHeroAddr(h1);
    if (!price && !addr) return;
    var wrap = document.querySelector(".bmg-ficha-hero");
    if (!wrap) {
      wrap = document.createElement("div");
      wrap.className = "bmg-ficha-hero";
      h1.parentNode.insertBefore(wrap, h1);
    }
    if (!wrap.contains(h1)) wrap.appendChild(h1);
    if (price && !wrap.contains(price)) wrap.appendChild(price);
    if (addr && !wrap.contains(addr)) {
      addr.classList.add("bmg-ficha-addr");
      wrap.appendChild(addr);
    }
  }
  function watchList() {
    if (listObserved || !window.MutationObserver) return;
    var list = document.getElementById('list-interior');
    if (!list) return;
    listObserved = true;
    new MutationObserver(run).observe(list, { childList: true, subtree: true });
  }
  function run() {
    var house = houseFromPage();
    if (!house) return;
    injectCss();
    ensureLb();
    bindCapture();
    watchList();
    var cards = document.querySelectorAll('.bmg-card, .room-card');
    var i;
    for (i = 0; i < cards.length; i++) applyCard(cards[i], house);
    layoutHero();
  }
  if (!houseFromPage()) return;
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', run);
  else run();
  document.addEventListener('bmg:min-prices', run);
  var n = 0;
  var t = setInterval(function () {
    n += 1;
    run();
    if (n >= 20) clearInterval(t);
  }, 1500);
})();
