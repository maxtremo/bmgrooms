/* ══════════════════════════════════════════
   Firebase
══════════════════════════════════════════ */
const firebaseConfig = {
  apiKey: "AIzaSyCmVed9vYaGJr4pUeVgRAHrZfHLVBRNzjw",
  authDomain: "bmgdashboard-27dc1.firebaseapp.com",
  projectId: "bmgdashboard-27dc1",
  storageBucket: "bmgdashboard-27dc1.firebasestorage.app",
  messagingSenderId: "940317065995",
  appId: "1:940317065995:web:4dcd648723f2bf21f9180e"
};
const SHARED_ROOM_SURCHARGE = 1800;
let db = null;
try {
  firebase.initializeApp(firebaseConfig);
  db = firebase.firestore();
  try { db.settings({ cacheSizeBytes: firebase.firestore.CACHE_SIZE_UNLIMITED }); } catch(e){}
  firebase.auth().signInAnonymously().catch(e => console.warn('Auth anónimo falló:', e));
} catch(e) { console.warn('Firebase init failed', e); }

function setVhUnit() {
  const h = (window.visualViewport && window.visualViewport.height) ? window.visualViewport.height : window.innerHeight;
  document.documentElement.style.setProperty('--vh', `${h * 0.01}px`);
}
setVhUnit();
window.addEventListener('resize', () => setTimeout(setVhUnit, 50));
if (window.visualViewport) window.visualViewport.addEventListener('resize', () => setTimeout(setVhUnit, 50));

const ACC_KEYS = ['xalisco','quetzal'];
function syncAccordionAria() {
  ACC_KEYS.forEach(k => {
    const item = document.getElementById(`acc-${k}`);
    const trigger = document.getElementById(`acc-${k}-trigger`);
    const body = document.getElementById(`acc-${k}-body`);
    const isOpen = !!(item && item.classList.contains('open'));
    if (trigger) trigger.setAttribute('aria-expanded', isOpen ? 'true' : 'false');
    if (body) body.hidden = !isOpen;
  });
}

/* ══════════════════════════════════════════
   Country flags
══════════════════════════════════════════ */
const countryFlags = {
  'Francia':'🇫🇷','UK':'🇬🇧','Inglaterra':'🇬🇧','Reino Unido':'🇬🇧',
  'México':'🇲🇽','Mexico':'🇲🇽','Austria':'🇦🇹','Australia':'🇦🇺',
  'Alemania':'🇩🇪','Bélgica':'🇧🇪','Italia':'🇮🇹','España':'🇪🇸',
  'Paises Bajos':'🇳🇱','Holanda':'🇳🇱','Estados Unidos':'🇺🇸','EEUU':'🇺🇸',
  'USA':'🇺🇸','Canadá':'🇨🇦','Colombia':'🇨🇴','Argentina':'🇦🇷',
  'Chile':'🇨🇱','Perú':'🇵🇪','Brasil':'🇧🇷','Japón':'🇯🇵',
  'Corea del Sur':'🇰🇷','China':'🇨🇳','Suiza':'🇨🇭','Suecia':'🇸🇪',
  'Noruega':'🇳🇴','Dinamarca':'🇩🇰','Finlandia':'🇫🇮','Irlanda':'🇮🇪',
  'Portugal':'🇵🇹','Polonia':'🇵🇱','República Checa':'🇨🇿','Hungría':'🇭🇺',
  'Grecia':'🇬🇷','Turquía':'🇹🇷','India':'🇮🇳','Rusia':'🇷🇺',
  'Ecuador':'🇪🇨','Uruguay':'🇺🇾','Paraguay':'🇵🇾','Bolivia':'🇧🇴',
  'Venezuela':'🇻🇪','Guatemala':'🇬🇹','Costa Rica':'🇨🇷','Panamá':'🇵🇦',
  'Honduras':'🇭🇳','El Salvador':'🇸🇻','Nicaragua':'🇳🇮','Cuba':'🇨🇺',
  'República Dominicana':'🇩🇴'
};
function getCountryFlag(c) {
  if (!c) return '';
  const k = Object.keys(countryFlags).find(k => k.toLowerCase() === c.trim().toLowerCase());
  return k ? countryFlags[k] : '';
}

/* ══════════════════════════════════════════
   Helpers
══════════════════════════════════════════ */
function fmtMoney(n) { return n ? ('$' + Number(n).toLocaleString('es-MX')) : ''; }

function parseDate(val) {
  if (!val) return null;
  let d = null;
  if (typeof val === 'number') d = val > 1e12 ? new Date(val) : new Date(val * 1000);
  else if (typeof val === 'string') {
    const n = Number(val);
    if (!isNaN(n)) d = n > 1e12 ? new Date(n) : new Date(n * 1000);
    else {
      const trimmed = val.trim();
      if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
        const p = Date.parse(`${trimmed}T12:00:00`);
        if (!isNaN(p)) d = new Date(p);
      }
      if (!d) {
        const p = Date.parse(val);
        if (!isNaN(p)) d = new Date(p);
      }
    }
  }
  return (d && !isNaN(d.getTime())) ? d : null;
}

const ROOM_DATE_KEYS = [
  'proxFecha', 'prox_fecha', 'prox_date', 'fecha_desocupacion', 'desocupacion', 'fecha',
  'fechaDesocupacion', 'proximo_fecha', 'proximoFecha', 'liberacion', 'libera', 'termina',
  'hasta', 'availableDate', 'available_at', 'available_on', 'when', 'due'
];
const ROOM_ESTADO_DATE_KEYS = [
  'fecha', 'when', 'until', 'date', 'available_at', 'availableDate', 'available_on',
  'proxFecha', 'prox_fecha'
];

function findRoomAvailabilityDate(room) {
  if (!room) return null;
  for (const k of ROOM_DATE_KEYS) {
    if (room[k]) {
      const d = parseDate(room[k]);
      if (d) return d;
    }
  }
  if (typeof room.estado === 'object' && room.estado) {
    for (const k of ROOM_ESTADO_DATE_KEYS) {
      if (room.estado[k]) {
        const d = parseDate(room.estado[k]);
        if (d) return d;
      }
    }
  }
  if (room.estado_info) return parseDate(room.estado_info);
  return null;
}

function resolveTenantAvailabilityDate(room, casaKey) {
  const rk = `${casaKey}-${(room.nombre || '').trim()}`;
  const tKey = Object.keys(inquilinosData).find(k => k.toLowerCase() === rk.toLowerCase());
  const t = tKey ? inquilinosData[tKey] : null;
  if (!t || !t.nombre || !t.contratoFin || t.renovacion) return null;
  return parseDate(t.contratoFin);
}

function formatAvailabilityMonthYear(date) {
  if (!date || isNaN(date.getTime())) return '';
  const availDate = new Date(date);
  if (date.getDate() > 20) availDate.setMonth(availDate.getMonth() + 1);
  let month = availDate.toLocaleString('es-MX', { month: 'long' });
  month = month.charAt(0).toUpperCase() + month.slice(1);
  return `${month} ${availDate.getFullYear()}`;
}

function isRoomBlockedByProximo(room) {
  if (!room || !room.nextRes || !room.nextRes.hasReservation) return false;
  return !!(room.nextRes.blockedByDeposit || room.nextRes.endDate);
}

function resolveNextResAvailabilityDate(room) {
  if (!room || !room.nextRes) return null;
  return parseDate(room.nextRes.endDate || room.nextRes.contratoFin);
}

function getWaitlistDemandText(room, casaKey) {
  const now = new Date();
  now.setHours(0, 0, 0, 0);

  if (isRoomBlockedByProximo(room)) {
    const proxEnd = resolveNextResAvailabilityDate(room);
    if (proxEnd && proxEnd > now) {
      const label = formatAvailabilityMonthYear(proxEnd);
      if (label) return `Alta demanda · Disponible ${label}`;
    }
    return 'Alta demanda · Cupos limitados';
  }

  const candidates = [
    findRoomAvailabilityDate(room),
    resolveTenantAvailabilityDate(room, casaKey)
  ].filter(Boolean);

  let best = null;
  for (const d of candidates) {
    if (d <= now) continue;
    if (!best || d > best) best = d;
  }

  const label = best ? formatAvailabilityMonthYear(best) : '';
  if (label) return `Alta demanda · Disponible ${label}`;
  return 'Alta demanda · Cupos limitados';
}

let inquilinosData = {};
function resolveRoomFlag(c, casaKey) {
  if (c.nextRes && c.nextRes.hasReservation && c.nextRes.flag) return c.nextRes.flag;
  if (c.flag) return c.flag;
  const rk = `${casaKey}-${(c.nombre||'').trim()}`;
  const tKey = Object.keys(inquilinosData).find(k => k.toLowerCase() === rk.toLowerCase());
  const t = tKey ? inquilinosData[tKey] : null;
  return (t && t.nacionalidad) ? getCountryFlag(t.nacionalidad) : '';
}

function getRoomStatus(room) {
  let status = { cls: 'ocupada', text: 'Ocupada', isContactable: false };

  if (room.nextRes && room.nextRes.hasReservation) return status;

  let e = '';
  if (room.estado) {
    if (typeof room.estado === 'string') e = room.estado;
    else if (typeof room.estado === 'object')
      e = room.estado.type || room.estado.tipo || room.estado.estado || room.estado.name || room.estado.status || '';
  }
  e = String(e||'').toLowerCase();

  if (e === 'disponible' || e === 'available')
    return { cls:'disponible', text:'Disponible', isContactable:true };

  if (e === 'ocupada' || e === 'ocupado' || e === 'occupied')
    return { cls:'ocupada', text:'Ocupada', isContactable:false };

  let foundDate = findRoomAvailabilityDate(room);

  if (foundDate) {
    const now = new Date(); now.setHours(0,0,0,0);
    if (foundDate > now) {
      let availDate = new Date(foundDate);
      if (foundDate.getDate() > 20) availDate.setMonth(availDate.getMonth()+1);
      let m = availDate.toLocaleString('es-MX', {month:'long'});
      m = m.charAt(0).toUpperCase()+m.slice(1);
      const six = new Date(); six.setMonth(now.getMonth()+6);
      if (foundDate <= six)
        return { cls:'proximo', text:`Próximo ${m}`, isContactable:true };
    }
  }

  if (e.includes('vence')||e.includes('contrato')||e.includes('termina')||e==='proximo'||e==='próximo'||e==='soon'||e==='available_soon')
    return { cls:'proximo', text:'Próximo', isContactable:true };

  return status;
}

let publicFilters = { now: false, soon: false, bath: false, beds: [] };
let publicCache = { roomsByHouse: {}, houseByKey: {} };
let filtersInitDone = false;
let openStateBeforeFiltering = null;
let lastFiltersActive = false;

function hasActiveFilters() {
  return !!(publicFilters.now || publicFilters.soon || publicFilters.bath || (Array.isArray(publicFilters.beds) && publicFilters.beds.length));
}

function countContactableRooms(casaKey) {
  const arr = publicCache.roomsByHouse[casaKey] || [];
  return arr.filter(r => getRoomStatus(r).isContactable).length;
}

function countAvailableRooms(casaKey) {
  const arr = publicCache.roomsByHouse[casaKey] || [];
  return arr.filter(r => getRoomStatus(r).cls === 'disponible').length;
}

function countSoonRooms(casaKey) {
  const arr = publicCache.roomsByHouse[casaKey] || [];
  return arr.filter(r => getRoomStatus(r).cls === 'proximo').length;
}

function countWaitlistRooms(casaKey) {
  const arr = publicCache.roomsByHouse[casaKey] || [];
  return arr.filter(r => {
    const s = getRoomStatus(r);
    return s.cls === 'ocupada' && !s.isContactable;
  }).length;
}

function getDefaultHouseSortKey(casaKey) {
  const soon = countSoonRooms(casaKey);
  if (soon > 0) return { tier: 3, count: soon };
  const available = countAvailableRooms(casaKey);
  if (available > 0) return { tier: 2, count: available };
  const waitlist = countWaitlistRooms(casaKey);
  if (waitlist > 0) return { tier: 1, count: waitlist };
  const contactable = countContactableRooms(casaKey);
  if (contactable > 0) return { tier: 1, count: contactable };
  return { tier: 0, count: 0 };
}

function getDefaultVisibleRooms(casaKey) {
  return publicCache.roomsByHouse[casaKey] || [];
}

function normalizeTxt(s) {
  let t = (s ?? '').toString().toLowerCase();
  try {
    if (t.normalize) t = t.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  } catch (e) {}
  return t.replace(/[^a-z0-9]+/g, ' ').trim();
}

function getBedSizeFromDetails(detailsRaw) {
  const t = normalizeTxt(detailsRaw);
  if (!t) return '';
  const rules = [
    ['king', /\bking\b/],
    ['queen', /\bqueen\b/],
    ['matrimonial', /\bmatrimon/i],
    ['matrimonial', /\bmatrimonial\b/],
    ['matrimonial', /\bdoble\b/],
    ['matrimonial', /\bdouble\b/],
    ['individual', /\bindividual\b/],
    ['individual', /\bsingle\b/]
  ];
  for (const [key, re] of rules) {
    if (re.test(t)) return key;
  }
  return '';
}

function hasPrivateOrSemiBath(detailsRaw) {
  const t = normalizeTxt(detailsRaw);
  if (!t) return false;
  if (!/(bano|bath)/.test(t)) return false;
  if (/(sin|no)\s+(bano|bath)/.test(t)) return false;
  return /privad/.test(t) || /semi\s*privad/.test(t) || /semiprivad/.test(t) || /bano\s+propio/.test(t) || /(private)\s+(bath)/.test(t);
}

function roomMatchesFilters(room) {
  const status = getRoomStatus(room);

  let availOk = true;
  if (publicFilters.now || publicFilters.soon) {
    const okNow = publicFilters.now && status.cls === 'disponible';
    const okSoon = publicFilters.soon && status.cls === 'proximo';
    availOk = okNow || okSoon;
  }

  let bedOk = true;
  if (Array.isArray(publicFilters.beds) && publicFilters.beds.length) {
    const bed = getBedSizeFromDetails(room.detalles || '');
    bedOk = !!bed && publicFilters.beds.includes(bed);
  }

  let bathOk = true;
  if (publicFilters.bath) bathOk = hasPrivateOrSemiBath(room.detalles || '');

  return availOk && bedOk && bathOk;
}

function setFiltersUiFromState() {
  const nowEl = document.getElementById('filter-now');
  const soonEl = document.getElementById('filter-soon');
  const bathEl = document.getElementById('filter-bath');
  if (nowEl) nowEl.setAttribute('aria-pressed', publicFilters.now ? 'true' : 'false');
  if (soonEl) soonEl.setAttribute('aria-pressed', publicFilters.soon ? 'true' : 'false');
  if (bathEl) bathEl.setAttribute('aria-pressed', publicFilters.bath ? 'true' : 'false');
  const bedBtns = Array.from(document.querySelectorAll('#pub-filters [data-bed]'));
  bedBtns.forEach(btn => {
    const k = btn.dataset.bed || '';
    btn.setAttribute('aria-pressed', (Array.isArray(publicFilters.beds) && publicFilters.beds.includes(k)) ? 'true' : 'false');
  });
}

function updateFiltersMeta(shown, total) {
  const metaEl = document.getElementById('filters-meta');
  const clearBtn = document.getElementById('filters-clear');
  if (clearBtn) clearBtn.disabled = !hasActiveFilters();
  if (!metaEl) return;
  if (!total) {
    metaEl.textContent = 'Sin habitaciones para mostrar.';
    return;
  }
  if (hasActiveFilters()) metaEl.textContent = `Mostrando ${shown} de ${total} habitaciones`;
  else metaEl.textContent = `Mostrando ${total} habitaciones`;
}

function bindHouseRoomEvents(casaKey) {
  document.querySelectorAll(`#acc-${casaKey}-body .room-img-wrap`).forEach(el => {
    if (el.classList.contains('no-photo')) return;
    const getGallery = () => {
      try { return JSON.parse(decodeURIComponent(el.dataset.gallery || '[]')); } catch (_) { return []; }
    };
    const handler = () => openLightbox(getGallery(), decodeURIComponent(el.dataset.name));
    el.addEventListener('click', handler);
    el.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') handler(); });
    el.querySelectorAll('.room-gallery-thumb').forEach((thumb) => {
      thumb.addEventListener('click', (event) => {
        event.stopPropagation();
        const gallery = getGallery();
        const image = gallery[Number(thumb.dataset.galleryIndex)];
        if (!image) return;
        el.querySelector('.room-img').src = image;
        el.querySelectorAll('.room-gallery-thumb').forEach((item) => item.classList.toggle('is-active', item === thumb));
      });
    });
  });

  document.querySelectorAll(`#acc-${casaKey}-body .price-asterisk`).forEach(el => {
    el.addEventListener('click', e => {
      e.stopPropagation();
      el.classList.toggle('active');
      setTimeout(() => el.classList.remove('active'), 2400);
    });
  });

  document.querySelectorAll(`#acc-${casaKey}-body .wa-btn`).forEach(btn => {
    btn.addEventListener('click', () => {
      openPreconsulta(btn.dataset.waLink, btn.dataset.availDate);
    });
  });

  document.querySelectorAll(`#acc-${casaKey}-body .waitlist-btn`).forEach(btn => {
    btn.addEventListener('click', () => {
      openPreconsulta(btn.dataset.waLink);
    });
  });
}

function reorderHouses(countByKey) {
  const houseKeys = ['xalisco', 'quetzal'];
  const wrap = document.getElementById('accordion-wrap');
  if (!wrap) return;

  const active = hasActiveFilters();
  let restoredOpenState = false;
  if (active && !lastFiltersActive) {
    openStateBeforeFiltering = {};
    houseKeys.forEach(k => {
      const el = document.getElementById(`acc-${k}`);
      if (el) openStateBeforeFiltering[k] = el.classList.contains('open');
    });
  }
  if (!active && lastFiltersActive && openStateBeforeFiltering) {
    houseKeys.forEach(k => {
      const el = document.getElementById(`acc-${k}`);
      if (!el) return;
      if (openStateBeforeFiltering[k]) el.classList.add('open');
      else el.classList.remove('open');
    });
    openStateBeforeFiltering = null;
    restoredOpenState = true;
  }
  lastFiltersActive = active;

  const items = houseKeys.map((k, idx) => ({
    k,
    idx,
    count: active
      ? Number(countByKey && countByKey[k] ? countByKey[k] : 0)
      : getDefaultVisibleRooms(k).length,
    sortKey: active ? null : getDefaultHouseSortKey(k),
    el: document.getElementById(`acc-${k}`)
  })).filter(x => !!x.el);

  items.sort((a, b) => a.idx - b.idx).forEach(it => wrap.appendChild(it.el));

  if (!restoredOpenState) {
    if (!active) {
      items.forEach(it => it.el.classList.add('open'));
    } else {
      items.forEach(it => {
        if (it.count === 0) it.el.classList.remove('open');
        else it.el.classList.add('open');
      });
    }
  }
  syncAccordionAria();
}

function renderFromCache() {
  let totalRooms = 0;
  let shownRooms = 0;
  const houseKeys = ['xalisco', 'quetzal'];
  const filteredByKey = {};
  const countByKey = {};

  houseKeys.forEach(casaKey => {
    const h = publicCache.houseByKey[casaKey] || {};
    const fullArr = publicCache.roomsByHouse[casaKey] || [];
    const filteredArr = hasActiveFilters()
      ? fullArr.filter(roomMatchesFilters)
      : fullArr.slice();
    filteredByKey[casaKey] = filteredArr;
    countByKey[casaKey] = filteredArr.length;

    totalRooms += fullArr.length;
    shownRooms += filteredArr.length;

    const countEl = document.getElementById(`acc-${casaKey}-count`);
    if (countEl) {
      if (!fullArr.length) countEl.textContent = '—';
      else if (!hasActiveFilters() || filteredArr.length === fullArr.length) countEl.textContent = `${fullArr.length} cuartos`;
      else countEl.textContent = `${filteredArr.length}/${fullArr.length}`;
    }
  });

  reorderHouses(countByKey);

  houseKeys.forEach(casaKey => {
    const h = publicCache.houseByKey[casaKey] || {};
    const filteredArr = filteredByKey[casaKey] || [];
    const bodyEl = document.getElementById(`acc-${casaKey}-body`);
    if (bodyEl) bodyEl.innerHTML = renderCards(filteredArr, casaKey, h);
    bindHouseRoomEvents(casaKey);
  });

  updateFiltersMeta(shownRooms, totalRooms);
}

function initFiltersBar() {
  if (filtersInitDone) return;
  const nowEl = document.getElementById('filter-now');
  const soonEl = document.getElementById('filter-soon');
  const bathEl = document.getElementById('filter-bath');
  const clearBtn = document.getElementById('filters-clear');
  const bedBtns = Array.from(document.querySelectorAll('#pub-filters [data-bed]'));

  if (!nowEl || !soonEl || !bathEl || !clearBtn || !bedBtns.length) return;
  filtersInitDone = true;

  const isPressed = (el) => el.getAttribute('aria-pressed') === 'true';
  const setPressed = (el, v) => el.setAttribute('aria-pressed', v ? 'true' : 'false');

  const sync = () => {
    publicFilters = {
      now: isPressed(nowEl),
      soon: isPressed(soonEl),
      bath: isPressed(bathEl),
      beds: bedBtns.filter(b => isPressed(b)).map(b => b.dataset.bed).filter(Boolean)
    };
    renderFromCache();
  };

  nowEl.addEventListener('click', () => { setPressed(nowEl, !isPressed(nowEl)); sync(); });
  soonEl.addEventListener('click', () => { setPressed(soonEl, !isPressed(soonEl)); sync(); });
  bathEl.addEventListener('click', () => { setPressed(bathEl, !isPressed(bathEl)); sync(); });
  bedBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      setPressed(btn, !isPressed(btn));
      sync();
    });
  });
  clearBtn.addEventListener('click', () => {
    publicFilters = { now: false, soon: false, bath: false, beds: [] };
    setFiltersUiFromState();
    renderFromCache();
  });

  setFiltersUiFromState();
  updateFiltersMeta(0, 0);
}

/* ══════════════════════════════════════════
   Load data
══════════════════════════════════════════ */
async function loadCuartos() {
  if (!db) return null;
  try {
    const doc = await db.collection('publicRooms').doc('main').get();
    const cuartos = doc.exists ? doc.data() : null;
    const cuartosHouses = cuartos && cuartos.__houses ? cuartos.__houses : null;
    return { cuartos, houses: null, cuartosHouses };
  } catch(e) { console.warn('Error de disponibilidad:', e); return null; }
}

/* ══════════════════════════════════════════
   WhatsApp SVG icon
══════════════════════════════════════════ */
const WA_SVG = `<svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z"/><path d="M12 0C5.373 0 0 5.373 0 12c0 2.123.554 4.118 1.528 5.855L0 24l6.335-1.508A11.945 11.945 0 0012 24c6.627 0 12-5.373 12-12S18.627 0 12 0zm0 21.818a9.804 9.804 0 01-5.032-1.393l-.36-.214-3.732.888.934-3.64-.234-.374A9.785 9.785 0 012.182 12C2.182 6.57 6.57 2.182 12 2.182S21.818 6.57 21.818 12 17.43 21.818 12 21.818z"/></svg>`;
const WAITLIST_SVG = `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg>`;

const WORDPRESS_ROOM_GALLERY_COUNTS = {
  quetzal: { aguila: 3, azulejo: 3, calandria: 3, carpintero: 3, chara: 3, coa: 2, colibri: 3, colorin: 3, flamingo: 3, guajolote: 2, loro: 3, mielero: 3, tucan: 3 },
  xalisco: { guadalajara: 3, guanajuato: 3, huasteca: 3, 'real-de-catorce': 3, 'san-cristobal': 3, tapalpa: 3, tequila: 3, tulum: 3, uruapan: 3, vallarta: 3 }
};

function roomSlug(value) {
  return String(value || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

function wordpressGallery(casaKey, roomName) {
  const house = roomSlug(casaKey);
  const room = roomSlug(roomName);
  const count = WORDPRESS_ROOM_GALLERY_COUNTS[house] && WORDPRESS_ROOM_GALLERY_COUNTS[house][room];
  if (!count) return [];
  return Array.from({ length: count }, (_, index) =>
    `photos/casa-${house}-cuarto-${room}-${index + 1}-scaled.jpg`
  );
}

function galleryForRoom(houseData, roomName) {
  if (!houseData || !roomName) return [];
  try {
    const source = typeof houseData.galeriasJson === 'string'
      ? JSON.parse(houseData.galeriasJson)
      : houseData.galerias;
    const gallery = source && source[roomName];
    return Array.isArray(gallery) ? gallery : [];
  } catch (_) {
    return [];
  }
}

/* ══════════════════════════════════════════
   Render cards for a house
══════════════════════════════════════════ */
function renderCards(arr, casaKey, houseData) {
  if (!Array.isArray(arr) || !arr.length)
    return '<p style="text-align:center;color:var(--text-soft);padding:20px;font-size:13px;">Sin habitaciones para mostrar.</p>';

  const statusOrder = { disponible: 0, proximo: 1, ocupada: 2 };
  const sorted = [...arr].sort((a, b) => {
    const sa = getRoomStatus(a);
    const sb = getRoomStatus(b);
    return (statusOrder[sa.cls] ?? 3) - (statusOrder[sb.cls] ?? 3);
  });

  const h = houseData;
  return sorted.map((c, i) => {
    const shared = c.compartida ? SHARED_ROOM_SURCHARGE : 0;
    const p5num  = c.precios && c.precios[5]  ? c.precios[5]  + shared : 0;
    const p6num  = c.precios && c.precios[6]  ? c.precios[6]  + shared : 0;

    const status = getRoomStatus(c);
    const flag   = resolveRoomFlag(c, casaKey);
    const fallbackImage = 'https://housingbmg.com/wp-content/uploads/2020/02/Home-Cinema-4_nr-scaled.jpg';
    const gallery = [...new Set([
      c.imagen,
      ...(Array.isArray(c.galeria) ? c.galeria : []),
      ...galleryForRoom(h, c.nombre),
      ...wordpressGallery(casaKey, c.nombre)
    ].filter((url) => typeof url === 'string' && /^https:\/\//.test(url)))].slice(0, 8);
    const hasPhoto = gallery.length > 0;
    const imgUrl = gallery[0] || fallbackImage;
    const galleryJson = encodeURIComponent(JSON.stringify(gallery.length ? gallery : [imgUrl]));

    const badgeHtml = flag
      ? `<span class="badge-stack"><span class="avail-badge ${status.cls}">${status.text}</span><span class="flag-emoji">${flag}</span></span>`
      : `<span class="avail-badge ${status.cls}">${status.text}</span>`;

    const availText = { disponible:'Disponible ahora', ocupada:'Habitación ocupada', proximo: status.text }[status.cls];
    const detailsRaw = (c.detalles || '').toString().trim();
    const detailsHtml = detailsRaw
      ? detailsRaw
          .split(/\s-\s/g)
          .map((p) => p.trim())
          .filter(Boolean)
          .map((p, idx) => idx === 0
            ? `<span class="detail-part">${p}</span>`
            : `<span class="detail-sep"> - </span><span class="detail-part">${p}</span>`
          )
          .join('')
      : '';

    const tooltipHtml = `<span class="tooltip-box">Con posibilidad de renovación</span>`;
    const p5html = p5num ? `
      <div class="price-col">
        <span class="price-label">
          5 Meses
          <span class="price-asterisk" tabindex="0">
            <sup>*</sup>${tooltipHtml}
          </span>
        </span>
        <span class="price-val">${fmtMoney(p5num)} MXN</span>
      </div>` : '';

    const p6html = p6num ? `
      <div class="price-col best">
        <span class="price-label">
          6 Meses
          <span class="price-asterisk" tabindex="0">
            <sup>*</sup>${tooltipHtml}
          </span>
        </span>
        <span class="price-val-row">
          <span class="price-val">${fmtMoney(p6num)} MXN</span>
          <span class="best-tag">★ Mejor valor</span>
        </span>
      </div>` : '';

    const waMsg = `Hola Hugo, me interesa la habitación ${c.nombre} en ${h.name}.\n\nFotos: ${h.driveLink}`;
    const waLink = `https://wa.me/523111563904?text=${encodeURIComponent(waMsg)}`;
    let availDateStr = '';
    if (status.cls === 'proximo') {
      const fd = findRoomAvailabilityDate(c);
      if (fd) availDateStr = fd.toISOString();
    }
    const waitlistDemandText = getWaitlistDemandText(c, casaKey);
    const waitlistMsg = `Hola Hugo, me gustaría unirme a la lista de espera para la habitación ${c.nombre} en ${h.name}.`;
    const waitlistLink = `https://wa.me/523111563904?text=${encodeURIComponent(waitlistMsg)}`;
    const waBtnHtml = status.isContactable
      ? `<button class="wa-btn" data-wa-link="${waLink}"${availDateStr ? ` data-avail-date="${availDateStr}"` : ''}>${WA_SVG} Consulta / Agendar visita</button>`
      : `<div class="waitlist-wrap">
          <span class="waitlist-demand">${waitlistDemandText}</span>
          <button type="button" class="waitlist-btn" data-wa-link="${waitlistLink}">${WAITLIST_SVG} Lista de espera</button>
        </div>`;

    const encodedName = encodeURIComponent(c.nombre);
    const thumbnailsHtml = gallery.length > 1 ? `
      <div class="room-gallery-thumbs" aria-label="Fotos de ${c.nombre}">
        ${gallery.slice(0, 3).map((url, photoIndex) => `<button class="room-gallery-thumb${photoIndex === 0 ? ' is-active' : ''}" type="button" data-gallery-index="${photoIndex}" aria-label="Ver foto ${photoIndex + 1} de ${c.nombre}"><img src="${url}" alt=""></button>`).join('')}
        ${gallery.length > 3 ? `<span class="room-gallery-count">+${gallery.length - 3}</span>` : ''}
      </div>` : '';
    const imgWrapAttrs = hasPhoto
      ? `data-gallery="${galleryJson}" data-name="${encodedName}" role="button" tabindex="0" aria-label="Ver galería de ${c.nombre}"`
      : `role="img" aria-label="Imagen no disponible"`;

    return `
    <div class="room-card" style="animation-delay:${i * 60}ms">
      <div class="room-card-inner">
        <div class="room-img-wrap${hasPhoto ? '' : ' no-photo'}" ${imgWrapAttrs}>
          <img class="room-img" src="${imgUrl}" alt="Habitación ${c.nombre}" loading="lazy">
          ${hasPhoto ? '' : '<div class="no-photo-label">Imagen no disponible</div>'}
          <div class="room-img-zoom-hint">🔍 Ver</div>
          ${thumbnailsHtml}
        </div>
        <div class="room-body">
          <div class="room-row-top">
            <div class="room-title-stack">
              <span class="room-name">Cuarto ${c.nombre}</span>
              <div class="room-details">${detailsHtml}</div>
            </div>
            ${badgeHtml}
          </div>
          <div class="avail-bar-wrap">
            <span class="avail-bar-label">Disponibilidad</span>
            <div class="avail-bar-track"><div class="avail-bar-fill ${status.cls}"></div></div>
            <span class="avail-bar-status ${status.cls}">${availText}</span>
          </div>
        </div>
      </div>
      <div class="room-footer">
        <div class="room-prices">
          <div class="prices-label"><span>Contrato / Pago mensual:</span><span class="renew-note">*Posibilidad de renovación</span></div>
          ${p5html}${p6html}
        </div>
        <div class="room-btn-wrap">${waBtnHtml}</div>
      </div>
    </div>`;
  }).join('');
}

/* ══════════════════════════════════════════
   Main render
══════════════════════════════════════════ */
async function renderPublic() {
  initFiltersBar();
  document.getElementById('pub-date-text').textContent =
    'Actualizado ' + new Date().toLocaleString('es-MX', {day:'2-digit',month:'short',year:'numeric',hour:'2-digit',minute:'2-digit'});

  const data = await loadCuartos();
  if (!data || !data.cuartos) {
    ['xalisco','quetzal'].forEach(k => {
      const el = document.getElementById(`acc-${k}-body`);
      if (el) el.innerHTML = '<p style="text-align:center;padding:20px;color:var(--text-soft)">No se pudieron cargar los datos.</p>';
    });
    return;
  }

  const defaultHouses = {
    xalisco: { name:'Casa Xalisco', address:'Guadalupe Zuno 2024, Col. Americana', driveLink:'https://tinyurl.com/fotosxalisco', mapLink:'https://maps.app.goo.gl/ciinzH5bD1tSLWNM8' },
    quetzal: { name:'Casa Quetzal', address:'Niños Héroes 1771-A, Col. Moderna',   driveLink:'https://drive.google.com/drive/folders/1fyMS2cqq621lf4IicUx-9YYmgXrsH6CH', mapLink:'https://maps.app.goo.gl/cC98RbSXkGifkMSF6' }
  };
  const pubH  = (data.cuartosHouses && typeof data.cuartosHouses === 'object') ? data.cuartosHouses : {};
  const protH = (data.houses        && typeof data.houses        === 'object') ? data.houses        : {};

  ['xalisco','quetzal'].forEach(casaKey => {
    const h = { ...defaultHouses[casaKey], ...(protH[casaKey]||{}), ...(pubH[casaKey]||{}) };
    const arr = data.cuartos[casaKey] || [];

    const nameEl = document.getElementById(`acc-${casaKey}-name`);
    const addrEl = document.getElementById(`acc-${casaKey}-addr`);
    const mapEl = document.getElementById(`acc-${casaKey}-map`);
    const photosEl = document.getElementById(`acc-${casaKey}-photos`);
    const countEl = document.getElementById(`acc-${casaKey}-count`);
    if (nameEl) nameEl.textContent = h.name;
    if (addrEl) addrEl.textContent = h.address;
    if (mapEl) mapEl.href = h.mapLink || '#';
    if (photosEl) photosEl.href = h.driveLink;
    if (countEl) countEl.textContent = arr.length ? `${arr.length} cuartos` : '—';

    publicCache.houseByKey[casaKey] = h;
    publicCache.roomsByHouse[casaKey] = Array.isArray(arr) ? arr : [];
  });

  renderFromCache();
}

/* ══════════════════════════════════════════
   Accordion toggle
══════════════════════════════════════════ */
['xalisco','quetzal'].forEach(key => {
  document.getElementById(`acc-${key}-trigger`).addEventListener('click', function(e) {
    if (e.target.closest('a')) return;
    const item = document.getElementById(`acc-${key}`);
    item.classList.toggle('open');
    syncAccordionAria();
  });
});

['xalisco','quetzal'].forEach(key => {
  const el = document.getElementById(`acc-${key}-trigger`);
  if (!el) return;
  el.addEventListener('keydown', e => {
    if (e.target.closest('a')) return;
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      el.click();
    }
  });
});

syncAccordionAria();

/* ══════════════════════════════════════════
   Lightbox
══════════════════════════════════════════ */
const lightbox    = document.getElementById('lightbox');
const lightboxImg = document.getElementById('lightbox-img');
const lightboxName= document.getElementById('lightbox-name');
const lightboxCloseBtn = document.getElementById('lightbox-close');
let lightboxLastFocus = null;

function openLightbox(images, name) {
  const gallery = Array.isArray(images) && images.length ? images : [''];
  lightboxLastFocus = document.activeElement;
  lightboxImg.src = gallery[0];
  lightboxName.textContent = name;
  lightbox.classList.add('active');
  lightbox.setAttribute('aria-hidden', 'false');
  document.body.style.overflow = 'hidden';
  if (lightboxCloseBtn) lightboxCloseBtn.focus();
}
function closeLightbox() {
  lightbox.classList.remove('active');
  lightbox.setAttribute('aria-hidden', 'true');
  document.body.style.overflow = '';
  setTimeout(() => { lightboxImg.src = ''; }, 300);
  if (lightboxLastFocus && lightboxLastFocus.focus) {
    try { lightboxLastFocus.focus(); } catch (_) {}
  }
}

if (lightboxCloseBtn) lightboxCloseBtn.addEventListener('click', closeLightbox);
lightbox.addEventListener('click', e => { if (e.target === lightbox) closeLightbox(); });
document.addEventListener('keydown', e => { if (e.key==='Escape') closeLightbox(); });

/* ══════════════════════════════════════════
   Pre-Consulta Modal
══════════════════════════════════════════ */
const pcOverlay    = document.getElementById('preconsulta-overlay');
const pcMesesEl   = document.getElementById('pc-meses');
const pcMesSelect = document.getElementById('pc-mes-entrada');
const pcDiaSelect = document.getElementById('pc-dia-entrada');
const pcDescInput = document.getElementById('pc-descripcion');
const pcCancelBtn = document.getElementById('pc-cancel');
const pcCloseBtn  = document.getElementById('pc-close');
const pcSendBtn   = document.getElementById('pc-send');

const pcNombre    = document.getElementById('pc-nombre');
const pcEdad      = document.getElementById('pc-edad');
const pcOcupacion = document.getElementById('pc-ocupacion');

const btnShowReq  = document.getElementById('btn-show-req');
const btnShowProc = document.getElementById('btn-show-proc');
const btnShowVisit= document.getElementById('btn-show-visit');
const panelReq    = document.getElementById('panel-req');
const panelProc   = document.getElementById('panel-proc');
const panelVisit  = document.getElementById('panel-visit');

const pcVisitFecha     = document.getElementById('pc-visit-fecha');
const pcVisitSlotsEl   = document.getElementById('pc-visit-slots');
const pcVisitHorario   = document.getElementById('pc-visit-horario');
const bmgVisitCalCfg   = (window.BMG_VISIT_CAL && typeof window.BMG_VISIT_CAL === 'object') ? window.BMG_VISIT_CAL : null;

const visitConfirmOverlay = document.getElementById('visitconfirm-overlay');
const visitConfirmOk      = document.getElementById('visitconfirm-ok');

const MESES = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];
const DIAS = ['Domingo','Lunes','Martes','Miércoles','Jueves','Viernes','Sábado'];

function openVisitConfirm() {
  if (!visitConfirmOverlay) return;
  visitConfirmOverlay.classList.add('active');
  visitConfirmOverlay.setAttribute('aria-hidden', 'false');
  document.body.style.overflow = 'hidden';
  if (visitConfirmOk) visitConfirmOk.focus();
}

function closeVisitConfirm() {
  if (!visitConfirmOverlay) return;
  visitConfirmOverlay.classList.remove('active');
  visitConfirmOverlay.setAttribute('aria-hidden', 'true');
  document.body.style.overflow = '';
}

if (visitConfirmOk) {
  visitConfirmOk.addEventListener('click', closeVisitConfirm);
}

function populateMesesSelect() {
  const startDate = pcAvailDate || new Date();
  let startMonth = startDate.getMonth();
  let startYear = startDate.getFullYear();
  if (startDate.getDate() > 20) {
    startMonth++;
    if (startMonth > 11) { startMonth = 0; startYear++; }
  }
  pcMesSelect.innerHTML = '<option value="">Mes</option>';
  for (let i = 0; i < 13; i++) {
    let mIdx = startMonth + i;
    let yr = startYear;
    if (mIdx > 11) {
      mIdx -= 12;
      yr++;
    }
    const opt = document.createElement('option');
    opt.value = MESES[mIdx] + (yr > startYear || i > 0 ? ' ' + yr : '');
    opt.textContent = MESES[mIdx] + (yr > startYear || i > 0 ? ' ' + yr : '');
    pcMesSelect.appendChild(opt);
  }
}

let pcSelectedMeses = null;
let pcCurrentLink   = '';
let pcAvailDate     = null;
let pcSendInFlight  = false;
let pcLastFocus     = null;

function openPreconsulta(link, availDate) {
  pcLastFocus = document.activeElement;
  pcAvailDate = availDate ? new Date(availDate) : null;
  populateMesesSelect();
  pcCurrentLink   = link;
  pcSelectedMeses = null;
  pcMesSelect.value = '';
  pcDiaSelect.value = '';
  pcDescInput.value = '';
  if (pcNombre) pcNombre.value = '';
  if (pcEdad) pcEdad.value = '';
  if (pcOcupacion) pcOcupacion.value = '';
  if (pcVisitFecha) {
    const todayInMx = formatYMDInTimeZone(new Date(), VISIT_TIME_ZONE);
    pcVisitFecha.min = todayInMx;
    pcVisitFecha.value = todayInMx;
  }
  if (pcVisitHorario) {
    pcVisitHorario.value = '';
  }
  if (pcVisitSlotsEl) {
    pcVisitSlotsEl.innerHTML = '<div class="pc-visit-empty">Elige una fecha para ver horarios</div>';
  }
  if (pcVisitFecha && pcVisitFecha.value) {
    populateVisitSlots();
  }
  pcSendBtn.disabled = true;
  pcMesesEl.querySelectorAll('.preconsulta-option').forEach(b => b.classList.remove('selected'));
  
  panelReq.classList.remove('active');
  panelProc.classList.remove('active');
  if (panelVisit) panelVisit.classList.remove('active');
  btnShowReq.classList.remove('active');
  btnShowProc.classList.remove('active');
  if (btnShowVisit) btnShowVisit.classList.remove('active');

  pcOverlay.classList.add('active');
  pcOverlay.setAttribute('aria-hidden', 'false');
  // iOS Safari scroll-lock: overflow:hidden alone doesn't work
  const scrollY = window.scrollY;
  document.body.style.position = 'fixed';
  document.body.style.top = `-${scrollY}px`;
  document.body.style.width = '100%';
  document.body.dataset.scrollY = scrollY;
  if (pcNombre) pcNombre.focus();
}

function closePreconsulta() {
  pcOverlay.classList.remove('active');
  pcOverlay.setAttribute('aria-hidden', 'true');
  // Restore scroll position after unlocking body
  const scrollY = parseInt(document.body.dataset.scrollY || '0', 10);
  document.body.style.position = '';
  document.body.style.top = '';
  document.body.style.width = '';
  window.scrollTo(0, scrollY);
  if (pcLastFocus && pcLastFocus.focus) {
    try { pcLastFocus.focus(); } catch (_) {}
  }
}

function validatePreconsulta() {
  const nombre = pcNombre ? pcNombre.value.trim() : '';
  const edad = pcEdad ? parseInt(pcEdad.value, 10) : NaN;
  const ocupacion = pcOcupacion ? pcOcupacion.value : '';
  const baseOk = !!(nombre && Number.isFinite(edad) && edad > 0 && ocupacion && pcSelectedMeses && pcMesSelect.value);

  let visitOk = true;
  if (panelVisit && panelVisit.classList.contains('active')) {
    const fecha = pcVisitFecha ? pcVisitFecha.value : '';
    const horario = pcVisitHorario ? pcVisitHorario.value : '';
    visitOk = !!(fecha && horario);
  }

  pcSendBtn.disabled = !(baseOk && visitOk);
}

function togglePanel(panelToToggle, btnToToggle) {
  const isOpening = !panelToToggle.classList.contains('active');
  
  [panelReq, panelProc, panelVisit].filter(Boolean).forEach(p => p.classList.remove('active'));
  [btnShowReq, btnShowProc, btnShowVisit].filter(Boolean).forEach(b => b.classList.remove('active'));

  if (isOpening) {
    panelToToggle.classList.add('active');
    btnToToggle.classList.add('active');
  }

  if (isOpening && panelVisit && panelToToggle === panelVisit && pcVisitFecha) {
    const todayInMx = formatYMDInTimeZone(new Date(), VISIT_TIME_ZONE);
    pcVisitFecha.min = todayInMx;
    if (!pcVisitFecha.value) pcVisitFecha.value = todayInMx;
    populateVisitSlots();
  }

  validatePreconsulta();
}

btnShowReq.addEventListener('click', () => togglePanel(panelReq, btnShowReq));
btnShowProc.addEventListener('click', () => togglePanel(panelProc, btnShowProc));
if (btnShowVisit && panelVisit) {
  btnShowVisit.addEventListener('click', () => togglePanel(panelVisit, btnShowVisit));
}

const VISIT_WINDOWS_BY_DAY = {
  1: { noon: [12, 12], pm: [16, 20] },
  2: { pm: [16, 20] },
  3: { pm: [16, 20] },
  4: { noon: [12, 12], pm: [16, 20] },
  5: { pm: [16, 20] },
  6: { noon: [12, 14] }
};

const VISIT_TIME_ZONE = 'America/Mexico_City';

function parseISODateYMD(dateStr) {
  const m = String(dateStr || '').match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!m) return null;
  const y = parseInt(m[1], 10);
  const mo = parseInt(m[2], 10);
  const d = parseInt(m[3], 10);
  if (!Number.isFinite(y) || !Number.isFinite(mo) || !Number.isFinite(d)) return null;
  if (mo < 1 || mo > 12 || d < 1 || d > 31) return null;
  return { y, mo, d };
}

function getTimeZoneOffsetMs(timeZone, date) {
  try {
    const dtf = new Intl.DateTimeFormat('en-US', {
      timeZone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hourCycle: 'h23'
    });
    const parts = dtf.formatToParts(date);
    const vals = {};
    for (const p of parts) {
      if (p.type !== 'literal') vals[p.type] = p.value;
    }
    const asUTC = Date.UTC(
      parseInt(vals.year, 10),
      parseInt(vals.month, 10) - 1,
      parseInt(vals.day, 10),
      parseInt(vals.hour, 10),
      parseInt(vals.minute, 10),
      parseInt(vals.second, 10)
    );
    return asUTC - date.getTime();
  } catch (_) {
    return 0;
  }
}

function zonedDateTimeToUtcDate(ymd, h24, min, timeZone) {
  const guess = new Date(Date.UTC(ymd.y, ymd.mo - 1, ymd.d, h24, min, 0));
  const offset = getTimeZoneOffsetMs(timeZone, guess);
  return new Date(guess.getTime() - offset);
}

function formatYMDInTimeZone(date, timeZone) {
  try {
    const dtf = new Intl.DateTimeFormat('en-US', {
      timeZone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    });
    const parts = dtf.formatToParts(date);
    const vals = {};
    for (const p of parts) {
      if (p.type !== 'literal') vals[p.type] = p.value;
    }
    if (vals.year && vals.month && vals.day) {
      return `${vals.year}-${vals.month}-${vals.day}`;
    }
    return dtf.format(date);
  } catch (_) {
    const yyyy = date.getFullYear();
    const mm = String(date.getMonth() + 1).padStart(2, '0');
    const dd = String(date.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
  }
}

function getVisitDayIndex(dateStr) {
  const ymd = parseISODateYMD(dateStr);
  if (!ymd) return null;
  return new Date(Date.UTC(ymd.y, ymd.mo - 1, ymd.d)).getUTCDay();
}

function parseTimeLabelTo24h(timeLabel) {
  const m = String(timeLabel || '').trim().match(/^(\d{1,2}):(\d{2})\s*(am|pm)$/i);
  if (!m) return null;
  let h = parseInt(m[1], 10);
  const min = parseInt(m[2], 10);
  const ap = m[3].toLowerCase();
  if (h < 1 || h > 12 || min < 0 || min > 59) return null;
  if (ap === 'pm' && h !== 12) h += 12;
  if (ap === 'am' && h === 12) h = 0;
  return { h24: h, min };
}

function buildVisitStartEnd(dateStr, timeLabel) {
  const t = parseTimeLabelTo24h(timeLabel);
  if (!t) return null;
  const ymd = parseISODateYMD(dateStr);
  if (!ymd) return null;
  const start = zonedDateTimeToUtcDate(ymd, t.h24, t.min, VISIT_TIME_ZONE);
  if (!Number.isFinite(start.getTime())) return null;
  const end = new Date(start.getTime() + 30 * 60 * 1000);
  return { start, end };
}

function extractRoomAndHouseFromIntro(intro) {
  const s = String(intro || '');
  const m = s.match(/habitación\s+(.+?)\s+en\s+Casa\s+(.+?)(?:[.\n]|$)/i);
  if (!m) return null;
  return { room: m[1].trim(), house: m[2].trim() };
}

function normalizeVisitHouseKey(houseLabel) {
  const s = String(houseLabel || '').trim().toLowerCase();
  if (!s) return '';
  if (s.includes('xalisco')) return 'xalisco';
  if (s.includes('quetzal')) return 'quetzal';
  return '';
}

function getPcIntro() {
  const baseMsg = pcCurrentLink.split('text=')[1] ? decodeURIComponent(pcCurrentLink.split('text=')[1]) : '';
  const parts = baseMsg.split('\n\nFotos: ');
  return parts[0] || '';
}

function jsonpCall(endpoint, payload) {
  return new Promise(resolve => {
    const cb = `__bmgCalCb_${Date.now()}_${Math.random().toString(16).slice(2)}`;
    const token = bmgVisitCalCfg && bmgVisitCalCfg.token ? String(bmgVisitCalCfg.token).trim() : '';
    const params = new URLSearchParams();

    Object.entries(payload || {}).forEach(([k, v]) => {
      if (v === undefined || v === null) return;
      if (Array.isArray(v)) params.set(k, v.join('|'));
      else params.set(k, String(v));
    });
    if (token) params.set('token', token);
    params.set('callback', cb);

    const src = `${endpoint}${endpoint.includes('?') ? '&' : '?'}${params.toString()}`;
    const s = document.createElement('script');
    let done = false;

    function cleanup() {
      if (s && s.parentNode) s.parentNode.removeChild(s);
      try { delete window[cb]; } catch (_) { window[cb] = undefined; }
    }

    window[cb] = data => {
      if (done) return;
      done = true;
      cleanup();
      resolve(data || null);
    };

    s.src = src;
    s.async = true;
    s.onerror = () => {
      if (done) return;
      done = true;
      cleanup();
      resolve(null);
    };
    document.head.appendChild(s);

    setTimeout(() => {
      if (done) return;
      done = true;
      cleanup();
      resolve(null);
    }, 10000);
  });
}

function callVisitCalendarApi(payload) {
  const endpoint = bmgVisitCalCfg && bmgVisitCalCfg.endpoint ? String(bmgVisitCalCfg.endpoint).trim() : '';
  if (!endpoint) return Promise.resolve(null);
  return jsonpCall(endpoint, payload);
}

function buildHalfHourSlots(startHour24, endHour24) {
  const out = [];
  for (let mins = startHour24 * 60; mins <= endHour24 * 60; mins += 30) {
    const h24 = Math.floor(mins / 60);
    const m = mins % 60;
    const ampm = h24 >= 12 ? 'pm' : 'am';
    let h12 = h24 % 12;
    if (h12 === 0) h12 = 12;
    out.push(`${h12}:${String(m).padStart(2, '0')} ${ampm}`);
  }
  return out;
}

function setVisitHorario(value, btnEl) {
  if (!pcVisitHorario || !pcVisitSlotsEl) return;
  pcVisitHorario.value = value;
  pcVisitSlotsEl.querySelectorAll('.preconsulta-option').forEach(b => b.classList.remove('selected'));
  if (btnEl) btnEl.classList.add('selected');
  validatePreconsulta();
}

function populateVisitSlots() {
  if (!pcVisitSlotsEl) return;
  const dateStr = pcVisitFecha ? pcVisitFecha.value : '';
  if (pcVisitHorario) pcVisitHorario.value = '';
  pcVisitSlotsEl.innerHTML = '';

  if (!dateStr) {
    pcVisitSlotsEl.innerHTML = '<div class="pc-visit-empty">Elige una fecha para ver horarios</div>';
    return;
  }

  const dayIdx = getVisitDayIndex(dateStr);
  const cfg = VISIT_WINDOWS_BY_DAY[dayIdx];
  if (!cfg) {
    pcVisitSlotsEl.innerHTML = '<div class="pc-visit-empty">No hay horarios disponibles ese día</div>';
    return;
  }

  const slots = [];
  if (cfg.noon) slots.push(...buildHalfHourSlots(cfg.noon[0], cfg.noon[1]));
  if (cfg.pm) slots.push(...buildHalfHourSlots(cfg.pm[0], cfg.pm[1]));

  if (!slots.length) {
    pcVisitSlotsEl.innerHTML = '<div class="pc-visit-empty">No hay horarios disponibles ese día</div>';
    return;
  }

  const todayInMx = formatYMDInTimeZone(new Date(), VISIT_TIME_ZONE);
  let effectiveSlots = slots;
  if (dateStr === todayInMx) {
    const ymd = parseISODateYMD(dateStr);
    const cutoff = Date.now() + 60 * 60 * 1000;
    effectiveSlots = slots.filter(label => {
      const t = parseTimeLabelTo24h(label);
      if (!t || !ymd) return false;
      const start = zonedDateTimeToUtcDate(ymd, t.h24, t.min, VISIT_TIME_ZONE);
      return Number.isFinite(start.getTime()) && start.getTime() >= cutoff;
    });
    if (!effectiveSlots.length) {
      pcVisitSlotsEl.innerHTML = '<div class="pc-visit-empty">Hoy ya no hay horarios disponibles</div>';
      return;
    }
  }

  const intro = getPcIntro();
  const rh = extractRoomAndHouseFromIntro(intro);
  const selectedHouse = rh && rh.house ? rh.house : '';
  const selectedHouseKey = normalizeVisitHouseKey(selectedHouse);

  if (bmgVisitCalCfg && bmgVisitCalCfg.endpoint && (selectedHouseKey || selectedHouse)) {
    callVisitCalendarApi({ action: 'availability', date: dateStr, house: selectedHouse, houseKey: selectedHouseKey, slots: effectiveSlots, timeZone: VISIT_TIME_ZONE })
      .then(data => {
        const allowed = data && data.ok && Array.isArray(data.allowedSlots) ? data.allowedSlots : null;
        const finalSlots = (allowed && allowed.length) ? effectiveSlots.filter(s => allowed.includes(s)) : effectiveSlots;

        pcVisitSlotsEl.innerHTML = '';
        if (!finalSlots.length) {
          pcVisitSlotsEl.innerHTML = '<div class="pc-visit-empty">No hay horarios disponibles ese día</div>';
          return;
        }
        finalSlots.forEach(s => {
          const btn = document.createElement('button');
          btn.type = 'button';
          btn.className = 'preconsulta-option';
          btn.textContent = s;
          btn.addEventListener('click', () => setVisitHorario(s, btn));
          pcVisitSlotsEl.appendChild(btn);
        });
      });
    pcVisitSlotsEl.innerHTML = '<div class="pc-visit-empty">Revisando disponibilidad,<br> espera un momento...</div>';
    return;
  }

  effectiveSlots.forEach(s => {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'preconsulta-option';
    btn.textContent = s;
    btn.addEventListener('click', () => setVisitHorario(s, btn));
    pcVisitSlotsEl.appendChild(btn);
  });
}

pcMesesEl.querySelectorAll('.preconsulta-option').forEach(btn => {
  btn.addEventListener('click', () => {
    pcMesesEl.querySelectorAll('.preconsulta-option').forEach(b => b.classList.remove('selected'));
    btn.classList.add('selected');
    pcSelectedMeses = btn.dataset.val;
    validatePreconsulta();
  });
});

pcMesSelect.addEventListener('change', validatePreconsulta);
if (pcNombre) pcNombre.addEventListener('input', validatePreconsulta);
if (pcEdad) pcEdad.addEventListener('input', validatePreconsulta);
if (pcOcupacion) pcOcupacion.addEventListener('change', validatePreconsulta);
if (pcVisitFecha) pcVisitFecha.addEventListener('change', () => { populateVisitSlots(); validatePreconsulta(); });

pcCancelBtn.addEventListener('click', closePreconsulta);
if (pcCloseBtn) pcCloseBtn.addEventListener('click', closePreconsulta);
pcOverlay.addEventListener('click', e => { if (e.target === pcOverlay) closePreconsulta(); });
document.addEventListener('keydown', e => { if (e.key === 'Escape') closePreconsulta(); });

pcSendBtn.addEventListener('click', async () => {
  if (pcSendBtn.disabled || pcSendInFlight) return;
  pcSendInFlight = true;
  const originalBtnText = pcSendBtn.textContent;
  pcSendBtn.disabled = true;
  pcSendBtn.setAttribute('aria-busy', 'true');
  pcSendBtn.textContent = 'Agendando…';
  let waWin = null;
  try { waWin = window.open('about:blank', '_blank'); } catch (_) {}
  try {
  const meses   = pcSelectedMeses;
  const mesEnt  = pcMesSelect.value;
  const desc    = pcDescInput.value.trim();
  const baseMsg = pcCurrentLink.split('text=')[1] ? decodeURIComponent(pcCurrentLink.split('text=')[1]) : '';
  
  const parts = baseMsg.split('\n\nFotos: ');
  const intro = parts[0] || '';
  const fotos = parts[1] || '';

  const nombre = pcNombre ? pcNombre.value.trim() : '';
  const edad = pcEdad ? pcEdad.value.trim() : '';
  const ocupacion = pcOcupacion ? pcOcupacion.value : '';

  let finalMsg = `${intro}\n`;
  finalMsg += `➤ Nombre: ${nombre}\n`;
  finalMsg += `➤ Edad: ${edad}\n`;
  finalMsg += `➤ Ocupación: ${ocupacion}\n`;
  finalMsg += `➤ Contrato: ${meses} meses\n`;
  finalMsg += `➤ Entrada: ${mesEnt}\n`;
  finalMsg += `➤ Sobre mí: ${desc || '—'}\n\n`;

  let shouldOpenWhatsApp = true;
  let visitCreated = false;

  if (panelVisit && panelVisit.classList.contains('active')) {
    const fecha = pcVisitFecha ? pcVisitFecha.value : '';
    const horario = pcVisitHorario ? pcVisitHorario.value : '';
    const rh = extractRoomAndHouseFromIntro(intro);
    const visitHouse = rh && rh.house ? rh.house : '';
    const visitHouseKey = normalizeVisitHouseKey(visitHouse);

    const dayIdx = getVisitDayIndex(fecha);
    const dayName = (dayIdx === null) ? '' : DIAS[dayIdx];
    const ymd = parseISODateYMD(fecha);
    const dd = ymd ? ymd.d : '';
    const mm = ymd ? MESES[ymd.mo - 1] : '';
    const prettyTime = horario ? horario.replace(' ', '') : '';
    const tzLabel = 'hora de México (GMT-6)';

    finalMsg += `⚑ Agendé una visita a Casa ${visitHouse}\n`;
    finalMsg += `El ${dayName} ${dd} de ${mm} a las ${prettyTime} (${tzLabel})\n\n`;

    const range = buildVisitStartEnd(fecha, horario);
    if (range) {
      const title = rh ? `Visita ${visitHouse} - ${rh.room} - ${nombre}` : `Visita ${visitHouse} - ${nombre}`;
      const detailsLines = [
        `Nombre: ${nombre}`,
        `Edad: ${edad}`,
        `Ocupación: ${ocupacion}`,
        `Contrato: ${meses} meses`,
        `Entrada: ${mesEnt}`,
        `Sobre mí: ${desc || '—'}`
      ];

      if (bmgVisitCalCfg && bmgVisitCalCfg.endpoint) {
        const data = await callVisitCalendarApi({
          action: 'create',
          title,
          startIso: range.start.toISOString(),
          endIso: range.end.toISOString(),
          details: detailsLines.join(' | ').slice(0, 280),
          house: visitHouse,
          houseKey: visitHouseKey,
          room: rh ? rh.room : '',
          name: nombre,
          timeZone: VISIT_TIME_ZONE
        });
        if (data && data.ok) {
          visitCreated = true;
        } else if (!(data && data.ok)) {
          const err = data && data.error ? String(data.error) : '';
          const isConflict = err.startsWith('conflict');
          const isUnauthorized = err === 'unauthorized';

          if (isConflict) {
            shouldOpenWhatsApp = false;
            alert('Ese horario ya no está disponible. Elige otro horario.');
            populateVisitSlots();
          } else if (isUnauthorized) {
            shouldOpenWhatsApp = false;
            alert('No se pudo agendar en calendario: token inválido. Revisa TOKEN en Apps Script y el token en publicV2.html.');
          } else {
            alert(`No se pudo confirmar la visita en el calendario (error: ${err || 'sin respuesta'}). Se enviará WhatsApp de todas formas.`);
          }
        }
      }
    }
  }

  finalMsg += `¡Muchas gracias!\n\n`;

  if (fotos) {
    finalMsg += `Fotos: ${fotos}`;
  }
  
  if (shouldOpenWhatsApp) {
    const finalLink = `https://wa.me/523111563904?text=${encodeURIComponent(finalMsg)}`;
    if (waWin && !waWin.closed) {
      try { waWin.location.href = finalLink; } catch (_) { window.open(finalLink, '_blank'); }
    } else {
      window.open(finalLink, '_blank');
    }
    closePreconsulta();
    if (visitCreated) {
      openVisitConfirm();
    }
  } else if (waWin && !waWin.closed) {
    try { waWin.close(); } catch (_) {}
  }
  } finally {
    pcSendInFlight = false;
    pcSendBtn.removeAttribute('aria-busy');
    pcSendBtn.textContent = originalBtnText;
    validatePreconsulta();
  }
});

/* ══════════════════════════════════════════
   Footer WhatsApp CTA
══════════════════════════════════════════ */
const footerWa = document.getElementById('wa-big-footer');
if (footerWa) {
  const msg = 'Hola Hugo, me interesa recibir información sobre las habitaciones disponibles. Muchas gracias.';
  footerWa.href = `https://wa.me/523111563904?text=${encodeURIComponent(msg)}`;
}


/* ══════════════════════════════════════════
   Init + auto-refresh
══════════════════════════════════════════ */
(async function() {
  await renderPublic();
})();

let refreshBusy = false;
setInterval(async () => {
  if (refreshBusy) return;
  refreshBusy = true;
  try { await renderPublic(); } finally { refreshBusy = false; }
}, 300000); // 5 min — evita quemar lecturas en pestañas públicas abiertas
