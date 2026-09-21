// LSÖ — Frontend mantığı
// Backend'deki /api/weather, /api/marine, /api/finance uçlarından
// GERÇEK, canlı veri çeker ve sayfaya basar.

const WEATHER_CODES = {
  0: 'Açık', 1: 'Az bulutlu', 2: 'Parçalı bulutlu', 3: 'Kapalı',
  45: 'Sisli', 48: 'Kırağı sisi',
  51: 'Çisenti', 53: 'Çisenti', 55: 'Yoğun çisenti',
  61: 'Hafif yağmur', 63: 'Yağmur', 65: 'Kuvvetli yağmur',
  71: 'Hafif kar', 73: 'Kar', 75: 'Kuvvetli kar',
  80: 'Sağanak', 81: 'Sağanak', 82: 'Şiddetli sağanak',
  95: 'Gök gürültülü sağanak',
};
const DAY_NAMES = ['Paz', 'Pzt', 'Sal', 'Çar', 'Per', 'Cum', 'Cmt'];

let current = { lat: 38.5182, lon: 26.6267, name: 'Mordoğan, İzmir' };

async function loadAll() {
  document.getElementById('locLabel').textContent = current.name;
  loadWeather();
  loadMarine();
  loadFinance();
  loadQuake();
  loadNews();
  loadNearby();
}

async function loadWeather() {
  const el = document.getElementById('weatherBody');
  el.className = 'skel';
  el.textContent = 'Yükleniyor…';
  try {
    const res = await fetch(`/api/weather?lat=${current.lat}&lon=${current.lon}`);
    const data = await res.json();
    if (data.error) throw new Error(data.error);

    const c = data.current;
    const desc = c.desc_override || WEATHER_CODES[c.weather_code] || '—';

    let daysHtml = '';
    if (data.daily && data.daily.time) {
      data.daily.time.forEach((dateStr, i) => {
        if (i > 3) return;
        const d = new Date(dateStr);
        const label = i === 0 ? 'Bugün' : DAY_NAMES[d.getDay()];
        const max = Math.round(data.daily.temperature_2m_max[i]);
        const wind = Math.round(data.daily.wind_speed_10m_max[i]);
        daysHtml += `<div class="day">${label}<b>${max}°</b>🌬 ${wind}</div>`;
      });
    }

    el.className = '';
    el.innerHTML = `
      <div class="wx-now">
        <span class="wx-temp">${Math.round(c.temperature_2m)}°</span>
        <span class="wx-desc">${desc} · Rüzgar ${Math.round(c.wind_speed_10m)} km/s</span>
      </div>
      ${daysHtml ? `<div class="day-row">${daysHtml}</div>` : '<div style="font-size:11.5px; color:var(--ink-soft);">4 günlük tahmin şu an mevcut değil, sadece anlık durum gösteriliyor.</div>'}
    `;
  } catch (err) {
    el.className = 'error';
    el.textContent = 'Hava verisi alınamadı: ' + err.message;
  }
}

async function loadMarine() {
  const el = document.getElementById('marineBody');
  el.className = 'skel';
  el.textContent = 'Yükleniyor…';
  try {
    const res = await fetch(`/api/marine?lat=${current.lat}&lon=${current.lon}`);
    const data = await res.json();
    if (data.error) throw new Error(data.error);

    const c = data.current;
    el.className = '';
    el.innerHTML = `
      <div class="fin-row"><span class="fin-name">Dalga yüksekliği</span><span class="fin-val">${c.wave_height} m</span></div>
      <div class="fin-row"><span class="fin-name">Dalga periyodu</span><span class="fin-val">${c.wave_period} sn</span></div>
    `;
  } catch (err) {
    el.className = 'error';
    el.textContent = 'Bu konum için deniz verisi yok (açık deniz/kıyıya çok uzak olabilir).';
  }
}

async function loadFinance() {
  const el = document.getElementById('financeBody');
  el.className = 'skel';
  el.textContent = 'Yükleniyor…';
  try {
    const res = await fetch('/api/finance');
    const data = await res.json();
    if (data.error) throw new Error(data.error);

    const fx = data.kurlar.serbest_piyasa_kurlari;
    const gold = data.altin.altin_ve_emtia.GRAM_ALTIN;

    el.className = '';
    el.innerHTML = `
      <div class="fin-row"><span class="fin-name">Dolar</span><span class="fin-val">${fx.USD.alis} / ${fx.USD.satis}</span></div>
      <div class="fin-row"><span class="fin-name">Euro</span><span class="fin-val">${fx.EUR.alis} / ${fx.EUR.satis}</span></div>
      <div class="fin-row"><span class="fin-name">Gram Altın</span><span class="fin-val">${gold.alis} / ${gold.satis}</span></div>
    `;
  } catch (err) {
    el.className = 'error';
    el.textContent = 'Finans verisi alınamadı: ' + err.message;
  }
}

async function loadQuake() {
  const el = document.getElementById('quakeBody');
  el.className = 'skel';
  el.textContent = 'Yükleniyor…';
  try {
    const res = await fetch(`/api/quake?lat=${current.lat}&lon=${current.lon}&radius=250`);
    const data = await res.json();
    if (data.error) throw new Error(data.error);

    const list = (data.result || []).slice(0, 8);
    if (list.length === 0) {
      el.className = '';
      el.textContent = 'Bölgende son 24 saatte kayıtlı deprem yok.';
      return;
    }

    el.className = '';
    el.innerHTML = list.map((q) => {
      const time = (q.date_time || '').split(' ')[1] || '';
      const place = (q.location_properties && q.location_properties.closestCity)
        ? q.location_properties.closestCity.name
        : '';
      const big = q.mag >= 4 ? ' style="color:#C4553B;font-weight:700;"' : '';
      return `<div class="fin-row">
        <span class="fin-name">${q.title}${place ? ' · ' + place : ''} · ${time}</span>
        <span class="fin-val"${big}>${q.mag}</span>
      </div>`;
    }).join('');
  } catch (err) {
    el.className = 'error';
    el.textContent = 'Deprem verisi alınamadı: ' + err.message;
  }
}

async function loadNewsCategory(category, elId) {
  const el = document.getElementById(elId);
  el.className = 'skel';
  el.textContent = 'Yükleniyor…';
  try {
    const res = await fetch(`/api/news?category=${category}`);
    const data = await res.json();
    if (data.error) throw new Error(data.error);

    if (data.length === 0) {
      el.className = '';
      el.textContent = 'Haber bulunamadı.';
      return;
    }

    el.className = '';
    el.innerHTML = data.slice(0, 6).map((n) => `
      <div class="fin-row" style="display:block;">
        <a href="${n.link}" target="_blank" rel="noopener" style="color:inherit; text-decoration:none; font-size:13px;">
          ${n.title}
        </a>
      </div>
    `).join('');
  } catch (err) {
    el.className = 'error';
    el.textContent = 'Haber verisi alınamadı: ' + err.message;
  }
}

async function loadNews() {
  loadNewsCategory('genel', 'newsBody');
  loadNewsCategory('spor', 'sportsBody');
}

// ---- Konum Arama ----
let locSearchTimer = null;
function onLocSearchInput() {
  clearTimeout(locSearchTimer);
  const q = document.getElementById('locSearchInput').value.trim();
  const resultsEl = document.getElementById('locResults');
  if (q.length < 2) { resultsEl.innerHTML = ''; return; }
  locSearchTimer = setTimeout(async () => {
    try {
      const res = await fetch(`/api/geocode?q=${encodeURIComponent(q)}`);
      const data = await res.json();
      const list = data.results || [];
      if (list.length === 0) { resultsEl.innerHTML = '<div class="loc-result-empty">Sonuç yok</div>'; return; }
      resultsEl.innerHTML = list.map((r) => {
        const label = [r.name, r.admin1, r.country].filter(Boolean).join(', ');
        return `<div class="loc-result-item" onclick='pickGeocodeResult(${r.latitude}, ${r.longitude}, ${JSON.stringify(label)})'>${label}</div>`;
      }).join('');
    } catch {
      resultsEl.innerHTML = '';
    }
  }, 400);
}

function pickGeocodeResult(lat, lon, name) {
  current = { lat, lon, name };
  document.getElementById('locSearchInput').value = '';
  document.getElementById('locResults').innerHTML = '';
  document.querySelectorAll('.preset').forEach((b) => b.classList.remove('active'));
  loadAll();
}

function useGps() {
  if (!navigator.geolocation) return;
  navigator.geolocation.getCurrentPosition((pos) => {
    current = { lat: pos.coords.latitude, lon: pos.coords.longitude, name: 'Şu anki konumum' };
    document.querySelectorAll('.preset').forEach((b) => b.classList.remove('active'));
    loadAll();
  }, () => {});
}

// ---- Hobi Seçimi ----
const HOBBY_KEY = 'lso_hobby';
function getHobby() {
  try { return localStorage.getItem(HOBBY_KEY) || 'balikcilik'; } catch { return 'balikcilik'; }
}
function setHobby(h) {
  try { localStorage.setItem(HOBBY_KEY, h); } catch {}
  renderHobbyChips();
  const defaultCat = h === 'balikcilik' ? 'eczane' : 'kamp';
  setNearbyCat(defaultCat);
}
function renderHobbyChips() {
  const h = getHobby();
  document.querySelectorAll('.hobby-chip').forEach((b) => {
    b.classList.toggle('active', b.dataset.hobby === h);
  });
}

// ---- Yakınımda ----
let nearbyCat = 'eczane';
function setNearbyCat(cat) {
  nearbyCat = cat;
  document.querySelectorAll('.nb-tab').forEach((b) => b.classList.toggle('active', b.dataset.cat === cat));
  loadNearby();
}

async function loadNearby() {
  const el = document.getElementById('nearbyBody');
  el.className = 'skel';
  el.textContent = 'Yükleniyor…';
  try {
    const res = await fetch(`/api/nearby?lat=${current.lat}&lon=${current.lon}&category=${nearbyCat}`);
    const data = await res.json();
    if (data.error) throw new Error(data.error);

    if (data.length === 0) {
      el.className = '';
      el.textContent = 'Yakında sonuç bulunamadı.';
      return;
    }

    el.className = '';
    el.innerHTML = data.slice(0, 8).map((p) => `
      <a class="fin-row" style="text-decoration:none; color:inherit;" href="https://www.google.com/maps?q=${p.lat},${p.lon}" target="_blank" rel="noopener">
        <span class="fin-name">${p.name}</span>
        <span class="fin-val" style="font-size:12px; color:var(--teal);">Haritada aç →</span>
      </a>
    `).join('');
  } catch (err) {
    el.className = 'error';
    el.textContent = 'Yakınımda verisi alınamadı: ' + err.message;
  }
}

// ---- Hatırlatmalarım (cihazda saklanır, sunucuya gitmez) ----
const PAY_KEY = 'lso_payments';
const TYPE_ICON = { odeme: '💳', dogumgunu: '🎂', diger: '📌' };

function getPayments() {
  try {
    return JSON.parse(localStorage.getItem(PAY_KEY) || '[]');
  } catch {
    return [];
  }
}

function savePayments(list) {
  try {
    localStorage.setItem(PAY_KEY, JSON.stringify(list));
  } catch {}
}

function addPayment() {
  const typeEl = document.getElementById('payType');
  const nameEl = document.getElementById('payName');
  const descEl = document.getElementById('payDesc');
  const amountEl = document.getElementById('payAmount');
  const dateEl = document.getElementById('payDate');

  const name = nameEl.value.trim();
  const date = dateEl.value;
  if (!name || !date) return;

  const list = getPayments();
  list.push({
    id: Date.now(),
    type: typeEl.value,
    name,
    desc: descEl.value.trim(),
    amount: amountEl.value ? parseFloat(amountEl.value) : null,
    date,
  });
  savePayments(list);
  nameEl.value = '';
  descEl.value = '';
  amountEl.value = '';
  dateEl.value = '';
  renderPayments();
}

function removePayment(id) {
  const list = getPayments().filter((p) => p.id !== id);
  savePayments(list);
  renderPayments();
}

function notifyToday(list) {
  if (!('Notification' in window) || Notification.permission !== 'granted') return;
  const todayStr = new Date().toISOString().slice(0, 10);
  list.filter((p) => p.date === todayStr).forEach((p) => {
    new Notification(`${TYPE_ICON[p.type] || '📌'} ${p.name}`, {
      body: p.desc || 'Bugün hatırlatman var.',
      icon: '/icon.svg',
    });
  });
}

function renderNotifyRow() {
  const el = document.getElementById('notifyRow');
  if (!('Notification' in window)) { el.innerHTML = ''; return; }
  if (Notification.permission === 'granted') {
    el.innerHTML = '<span class="notify-ok">🔔 Bildirimler açık — o gün geldiğinde, uygulamayı açtığında hatırlatılacaksın.</span>';
    return;
  }
  el.innerHTML = '<button class="notify-btn" onclick="askNotifyPermission()">🔔 Gün geldiğinde hatırlatsın (bildirim izni ver)</button>';
}

function askNotifyPermission() {
  if (!('Notification' in window)) return;
  Notification.requestPermission().then(() => renderNotifyRow());
}

function renderPayments() {
  const el = document.getElementById('paymentsBody');
  const list = getPayments().sort((a, b) => a.date.localeCompare(b.date));

  renderNotifyRow();
  notifyToday(list);

  if (list.length === 0) {
    el.className = 'skel';
    el.textContent = 'Henüz hatırlatma eklenmedi.';
    return;
  }

  const todayStr = new Date().toISOString().slice(0, 10);
  el.className = '';
  el.innerHTML = list.map((p) => {
    const daysLeft = Math.ceil((new Date(p.date) - new Date(todayStr)) / 86400000);
    let info = `${daysLeft} gün kaldı`;
    let color = 'var(--ink)';
    if (daysLeft < 0) { info = `${Math.abs(daysLeft)} gün gecikti`; color = '#C4553B'; }
    else if (daysLeft === 0) { info = 'Bugün'; color = '#D98F2B'; }
    else if (daysLeft <= 3) { color = '#D98F2B'; }
    const amountTxt = (p.amount !== null && p.amount !== undefined && !isNaN(p.amount)) ? ` · ${p.amount} ₺` : '';
    const descTxt = p.desc ? `<br><span style="color:var(--ink-soft); font-size:11.5px;">${p.desc}</span>` : '';
    return `<div class="fin-row" style="align-items:flex-start;">
      <span class="fin-name">${TYPE_ICON[p.type] || '📌'} ${p.name}${amountTxt}
        <span style="color:var(--ink-soft);"> · ${p.date}</span>${descTxt}
      </span>
      <span style="display:flex; align-items:center; gap:8px; flex-shrink:0;">
        <span class="fin-val" style="color:${color};">${info}</span>
        <span onclick="removePayment(${p.id})" style="cursor:pointer; color:var(--ink-soft);">✕</span>
      </span>
    </div>`;
  }).join('');
}

document.getElementById('presetRow').addEventListener('click', (e) => {
  const btn = e.target.closest('.preset');
  if (!btn) return;
  document.querySelectorAll('.preset').forEach((b) => b.classList.remove('active'));
  btn.classList.add('active');
  current = { lat: parseFloat(btn.dataset.lat), lon: parseFloat(btn.dataset.lon), name: btn.dataset.name };
  loadAll();
});

document.querySelector('.preset').classList.add('active');
renderHobbyChips();
nearbyCat = getHobby() === 'balikcilik' ? 'eczane' : 'kamp';
document.querySelectorAll('.nb-tab').forEach((b) => b.classList.toggle('active', b.dataset.cat === nearbyCat));
loadAll();
renderPayments();

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/service-worker.js').catch(() => {});
  });
}
