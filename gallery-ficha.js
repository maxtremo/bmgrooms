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
      '#bmg-lb .bmg-lb-close{position:absolute;top:-14px;right:-14px;width:36px;height:36px;background:#fff;border:none;border-radius:50%;cursor:pointer;display:flex;align-items:center;justify-content:center;box-shadow:0 4px 14px rgba(0,0,0,.25)}',
      '#bmg-lb .bmg-lb-close svg{width:16px;height:16px}',
      '#bmg-lb .bmg-lb-name{margin-top:10px;text-align:center;color:rgba(255,255,255,.75);font-size:13px;font-weight:700;white-space:nowrap}',
      '#bmg-lb .bmg-lb-nav{flex-shrink:0;width:44px;height:44px;margin:0 10px;border:none;border-radius:50%;background:#fff;cursor:pointer;display:flex;align-items:center;justify-content:center;box-shadow:0 4px 14px rgba(0,0,0,.25);z-index:2}',
      '#bmg-lb .bmg-lb-nav[hidden]{display:none}',
      '#bmg-lb .bmg-lb-nav svg{width:20px;height:20px}',
      '#bmg-lb .bmg-lb-thumbs{display:flex;justify-content:center;gap:8px;margin-top:10px}',
      '#bmg-lb .bmg-lb-thumbs[hidden]{display:none}',
      '#bmg-lb .bmg-lb-thumb{width:54px;height:40px;padding:0;border:2px solid rgba(255,255,255,.55);border-radius:8px;overflow:hidden;background:#fff;cursor:pointer;opacity:.75}',
      '#bmg-lb .bmg-lb-thumb.is-active{opacity:1;border-color:#00B8C4;-webkit-transform:scale(1.06);transform:scale(1.06)}',
      '#bmg-lb .bmg-lb-thumb img{width:100%;height:100%;object-fit:cover;display:block;pointer-events:none}',
      '@media (max-width:600px){#bmg-lb .bmg-lb-nav{position:absolute;top:50%;margin:0;-webkit-transform:translateY(-50%);transform:translateY(-50%)}#bmg-lb .bmg-lb-prev{left:8px}#bmg-lb .bmg-lb-next{right:8px}#bmg-lb .bmg-lb-wrap{max-width:100%}}'
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
      + '<button type="button" class="bmg-lb-nav bmg-lb-prev" aria-label="Foto anterior">'
      + '<svg viewBox="0 0 24 24" fill="none" stroke="#1E1B4B" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="15 18 9 12 15 6"/></svg>'
      + '</button>'
      + '<div class="bmg-lb-wrap">'
      + '<img class="bmg-lb-img" src="" alt="Habitación">'
      + '<div class="bmg-lb-thumbs" hidden></div>'
      + '<div class="bmg-lb-name"></div>'
      + '<button type="button" class="bmg-lb-close" aria-label="Cerrar">'
      + '<svg viewBox="0 0 24 24" fill="none" stroke="#333" stroke-width="2.5" stroke-linecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>'
      + '</button>'
      + '</div>'
      + '<button type="button" class="bmg-lb-nav bmg-lb-next" aria-label="Foto siguiente">'
      + '<svg viewBox="0 0 24 24" fill="none" stroke="#1E1B4B" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 18 15 12 9 6"/></svg>'
      + '</button>';
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
