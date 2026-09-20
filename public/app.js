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

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/service-worker.js').catch(() => {});
  });
}
