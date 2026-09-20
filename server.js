// LSÖ — Backend (Node.js + Express)
// Gerçek, ücretsiz API'lerden veri çeker ve frontend'e servis eder.
// Çalıştırmak için: npm install && npm start

const express = require('express');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

// Basit bellek içi cache (aynı sorguyu API'ye her seferinde atmamak için)
const cache = new Map();
const CACHE_MS = 10 * 60 * 1000; // 10 dakika

async function cachedFetch(key, url) {
  const now = Date.now();
  const hit = cache.get(key);
  if (hit && now - hit.time < CACHE_MS) return hit.data;

  const res = await fetch(url);
  if (!res.ok) throw new Error(`Upstream hata: ${res.status} — ${url}`);
  const data = await res.json();
  cache.set(key, { time: now, data });
  return data;
}

// ---- Hava Durumu (Open-Meteo, key gerekmiyor) ----
app.get('/api/weather', async (req, res) => {
  try {
    const { lat, lon } = req.query;
    if (!lat || !lon) return res.status(400).json({ error: 'lat ve lon zorunlu' });

    const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}` +
      `&current=temperature_2m,wind_speed_10m,wind_direction_10m,weather_code` +
      `&daily=temperature_2m_max,temperature_2m_min,weather_code,wind_speed_10m_max` +
      `&timezone=Europe%2FIstanbul&forecast_days=4`;

    const data = await cachedFetch(`weather:${lat},${lon}`, url);
    res.json(data);
  } catch (err) {
    res.status(502).json({ error: err.message });
  }
});

// ---- Deniz / Dalga (Open-Meteo Marine) ----
app.get('/api/marine', async (req, res) => {
  try {
    const { lat, lon } = req.query;
    if (!lat || !lon) return res.status(400).json({ error: 'lat ve lon zorunlu' });

    const url = `https://marine-api.open-meteo.com/v1/marine?latitude=${lat}&longitude=${lon}` +
      `&current=wave_height,wave_period&timezone=Europe%2FIstanbul`;

    const data = await cachedFetch(`marine:${lat},${lon}`, url);
    res.json(data);
  } catch (err) {
    res.status(502).json({ error: err.message });
  }
});

// ---- Finans: Döviz + Altın (Darphane — açık kaynak, key gerekmiyor) ----
app.get('/api/finance', async (req, res) => {
  try {
    const [kurlar, altin] = await Promise.all([
      cachedFetch('kurlar', 'https://raw.githubusercontent.com/kessinc/darphane/main/kurlar.json'),
      cachedFetch('altin', 'https://raw.githubusercontent.com/kessinc/darphane/main/altin.json'),
    ]);
    res.json({ kurlar, altin });
  } catch (err) {
    res.status(502).json({ error: err.message });
  }
});

// ---- Statik dosyalar (PWA frontend) ----
app.use(express.static(path.join(__dirname, 'public')));

app.listen(PORT, () => {
  console.log(`LSÖ backend çalışıyor: http://localhost:${PORT}`);
});
