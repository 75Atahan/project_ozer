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
    const desc = WEATHER_CODES[c.weather_code] || '—';

    let daysHtml = '';
    data.daily.time.forEach((dateStr, i) => {
      if (i > 3) return;
      const d = new Date(dateStr);
      const label = i === 0 ? 'Bugün' : DAY_NAMES[d.getDay()];
      const max = Math.round(data.daily.temperature_2m_max[i]);
      const wind = Math.round(data.daily.wind_speed_10m_max[i]);
      daysHtml += `<div class="day">${label}<b>${max}°</b>🌬 ${wind}</div>`;
    });

    el.className = '';
    el.innerHTML = `
      <div class="wx-now">
        <span class="wx-temp">${Math.round(c.temperature_2m)}°</span>
        <span class="wx-desc">${desc} · Rüzgar ${Math.round(c.wind_speed_10m)} km/s</span>
      </div>
      <div class="day-row">${daysHtml}</div>
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

// ---- Ödemelerim (cihazda saklanır, sunucuya gitmez) ----
const PAY_KEY = 'lso_payments';

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
  const nameEl = document.getElementById('payName');
  const dateEl = document.getElementById('payDate');
  const name = nameEl.value.trim();
  const date = dateEl.value;
  if (!name || !date) return;

  const list = getPayments();
  list.push({ id: Date.now(), name, date });
  savePayments(list);
  nameEl.value = '';
  dateEl.value = '';
  renderPayments();
}

function removePayment(id) {
  const list = getPayments().filter((p) => p.id !== id);
  savePayments(list);
  renderPayments();
}

function renderPayments() {
  const el = document.getElementById('paymentsBody');
  const list = getPayments().sort((a, b) => a.date.localeCompare(b.date));

  if (list.length === 0) {
    el.className = 'skel';
    el.textContent = 'Henüz ödeme eklenmedi.';
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
    return `<div class="fin-row">
      <span class="fin-name">${p.name} <span style="color:var(--ink-soft);">· ${p.date}</span></span>
      <span class="fin-val" style="color:${color};">${info}</span>
      <span onclick="removePayment(${p.id})" style="margin-left:8px; cursor:pointer; color:var(--ink-soft);">✕</span>
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
loadAll();
renderPayments();

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/service-worker.js').catch(() => {});
  });
}
