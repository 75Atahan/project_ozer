// LSÖ — Backend (Node.js + Express)
// Gerçek, ücretsiz API'lerden veri çeker ve frontend'e servis eder.
// Çalıştırmak için: npm install && npm start

const express = require('express');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

const DEFAULT_HEADERS = { 'User-Agent': 'LSO-App/1.0 (kisisel-gundelik-asistan)' };

// Basit bellek içi cache (aynı sorguyu API'ye her seferinde atmamak için)
const cache = new Map();
const CACHE_MS = 10 * 60 * 1000; // 10 dakika

async function cachedFetch(key, url, options) {
  const now = Date.now();
  const hit = cache.get(key);
  if (hit && now - hit.time < CACHE_MS) return hit.data;

  const tryOnce = async () => {
    const res = await fetch(url, options);
    if (!res.ok) throw new Error(`Upstream hata: ${res.status} — ${url}`);
    return res.json();
  };

  try {
    let data;
    try {
      data = await tryOnce();
    } catch (firstErr) {
      await new Promise((r) => setTimeout(r, 1500));
      try {
        data = await tryOnce();
      } catch (secondErr) {
        await new Promise((r) => setTimeout(r, 3000));
        data = await tryOnce();
      }
    }
    cache.set(key, { time: now, data });
    return data;
  } catch (err) {
    if (hit) return hit.data;
    throw err;
  }
}

// ---- Hava Durumu (Open-Meteo, key gerekmiyor) — düşerse wttr.in'e yedeklenir ----
app.get('/api/weather', async (req, res) => {
  const { lat, lon } = req.query;
  if (!lat || !lon) return res.status(400).json({ error: 'lat ve lon zorunlu' });

  try {
    const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}` +
      `&current=temperature_2m,wind_speed_10m,wind_direction_10m,weather_code` +
      `&daily=temperature_2m_max,temperature_2m_min,weather_code,wind_speed_10m_max` +
      `&timezone=Europe%2FIstanbul&forecast_days=4`;

    const data = await cachedFetch(`weather:${lat},${lon}`, url, { headers: DEFAULT_HEADERS });
    return res.json(data);
  } catch (err) {
    // Open-Meteo düştüyse, wttr.in'den en azından anlık durumu almayı dene
    try {
      const wUrl = `https://wttr.in/${lat},${lon}?format=j1`;
      const wData = await cachedFetch(`weather-fallback:${lat},${lon}`, wUrl, { headers: DEFAULT_HEADERS });
      const cc = wData.current_condition && wData.current_condition[0];
      if (!cc) throw new Error('Yedek kaynaktan da veri alınamadı');

      const daily = { time: [], temperature_2m_max: [], wind_speed_10m_max: [] };
      (wData.weather || []).forEach((day) => {
        daily.time.push(day.date);
        daily.temperature_2m_max.push(parseFloat(day.maxtempC));
        const winds = (day.hourly || []).map((h) => parseFloat(h.windspeedKmph));
        daily.wind_speed_10m_max.push(winds.length ? Math.max(...winds) : 0);
      });

      return res.json({
        source: 'wttr-fallback',
        current: {
          temperature_2m: parseFloat(cc.temp_C),
          wind_speed_10m: parseFloat(cc.windspeedKmph),
          desc_override: cc.weatherDesc && cc.weatherDesc[0] ? cc.weatherDesc[0].value : null,
        },
        daily: daily.time.length ? daily : null,
      });
    } catch (fallbackErr) {
      res.status(502).json({ error: err.message });
    }
  }
});

// ---- Deniz / Dalga (Open-Meteo Marine) ----
app.get('/api/marine', async (req, res) => {
  try {
    const { lat, lon } = req.query;
    if (!lat || !lon) return res.status(400).json({ error: 'lat ve lon zorunlu' });

    const url = `https://marine-api.open-meteo.com/v1/marine?latitude=${lat}&longitude=${lon}` +
      `&current=wave_height,wave_period&timezone=Europe%2FIstanbul`;

    const data = await cachedFetch(`marine:${lat},${lon}`, url, { headers: DEFAULT_HEADERS });
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

// ---- Deprem (Kandilli tabanlı, açık kaynak, key gerekmiyor) ----
function haversineKm(lat1, lon1, lat2, lon2) {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

app.get('/api/quake', async (req, res) => {
  try {
    const data = await cachedFetch(
      'quake:last24h',
      'https://api.orhanaydogdu.com.tr/deprem/kandilli/live?limit=100'
    );

    const { lat, lon, radius } = req.query;
    let result = data.result || [];

    if (lat && lon) {
      const uLat = parseFloat(lat);
      const uLon = parseFloat(lon);
      const maxKm = radius ? parseFloat(radius) : 250;
      result = result.filter((q) => {
        const [qLon, qLat] = q.geojson.coordinates;
        return haversineKm(uLat, uLon, qLat, qLon) <= maxKm;
      });
    }

    res.json({ ...data, result });
  } catch (err) {
    res.status(502).json({ error: err.message });
  }
});

// ---- Haber (Google News RSS — kategoriye göre) ----
const NEWS_FEEDS = {
  genel: 'https://news.google.com/rss?hl=tr&gl=TR&ceid=TR:tr',
  spor: 'https://news.google.com/rss/headlines/section/topic/SPORTS?hl=tr&gl=TR&ceid=TR:tr',
};

function parseRssItems(xml, limit) {
  const items = [];
  const itemBlocks = xml.split('<item>').slice(1);
  for (const block of itemBlocks) {
    if (items.length >= limit) break;
    const body = block.split('</item>')[0];
    const pick = (tag) => {
      const m = body.match(new RegExp(`<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`));
      if (!m) return '';
      return m[1].replace('<![CDATA[', '').replace(']]>', '').trim();
    };
    items.push({
      title: pick('title'),
      link: pick('link'),
      pubDate: pick('pubDate'),
    });
  }
  return items;
}

app.get('/api/news', async (req, res) => {
  try {
    const category = NEWS_FEEDS[req.query.category] ? req.query.category : 'genel';
    const cacheKey = `news:${category}`;
    const hit = cache.get(cacheKey);
    const now = Date.now();
    if (hit && now - hit.time < CACHE_MS) return res.json(hit.data);

    const r = await fetch(NEWS_FEEDS[category], {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36',
        'Accept': 'application/rss+xml, application/xml, text/xml, */*',
      },
    });
    if (!r.ok) throw new Error(`Upstream hata: ${r.status}`);
    const xml = await r.text();
    const items = parseRssItems(xml, 10);

    cache.set(cacheKey, { time: now, data: items });
    res.json(items);
  } catch (err) {
    res.status(502).json({ error: err.message });
  }
});

// ---- Konum Arama (Open-Meteo Geocoding, key gerekmiyor) ----
app.get('/api/geocode', async (req, res) => {
  try {
    const q = (req.query.q || '').trim();
    if (q.length < 2) return res.json({ results: [] });

    const url = `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(q)}&count=6&language=tr&format=json`;
    const data = await cachedFetch(`geocode:${q.toLowerCase()}`, url, { headers: DEFAULT_HEADERS });
    res.json(data);
  } catch (err) {
    res.status(502).json({ error: err.message });
  }
});

// ---- Yakınımda (OpenStreetMap / Overpass API, key gerekmiyor + kürate edilmiş liste) ----
const NEARBY_TAGS = {
  eczane: [['amenity', 'pharmacy']],
  market: [['shop', 'supermarket']],
  kamp: [['tourism', 'camp_site'], ['tourism', 'caravan_site'], ['tourism', 'camp_pitch']],
  balik: [['leisure', 'fishing']],
};

// Bilinen ama OSM'de eksik/yanlış etiketli önemli yerler — zamanla büyüyecek bir liste.
// Her giriş bir kategoriye ait; koordinatların 6000m yakınındaki sorgularda öne çıkar.
const CURATED_PLACES = [
  { category: 'kamp', name: 'Kalemlik Orman Kampı (Özdere)', lat: 38.020928, lon: 27.073405 },
  { category: 'kamp', name: 'Gümüldür Orman Kampı', lat: 38.0767688, lon: 26.9818085 },
  { category: 'kamp', name: 'Gümüldür Tabiat Parkı', lat: 38.0755494, lon: 26.982764 },
  { category: 'balik', name: 'Mordoğan İskelesi', lat: 38.51825, lon: 26.62672 },
];

function curatedNearby(category, lat, lon, radiusKm) {
  return CURATED_PLACES
    .filter((p) => p.category === category)
    .filter((p) => haversineKm(lat, lon, p.lat, p.lon) <= radiusKm)
    .map((p) => ({ name: p.name, lat: p.lat, lon: p.lon, curated: true }));
}

const OVERPASS_MIRRORS = [
  'https://overpass-api.de/api/interpreter',
  'https://overpass.kumi.systems/api/interpreter',
  'https://overpass.openstreetmap.ru/api/interpreter',
];

async function queryOverpass(query) {
  let lastErr;
  for (const mirror of OVERPASS_MIRRORS) {
    try {
      const url = `${mirror}?data=${encodeURIComponent(query)}`;
      const r = await fetch(url, { headers: DEFAULT_HEADERS });
      if (!r.ok) throw new Error(`Upstream hata: ${r.status} (${mirror})`);
      return await r.json();
    } catch (err) {
      lastErr = err;
    }
  }
  throw lastErr;
}

app.get('/api/nearby', async (req, res) => {
  try {
    const { lat, lon, category } = req.query;
    if (!lat || !lon) return res.status(400).json({ error: 'lat ve lon zorunlu' });
    const tagPairs = NEARBY_TAGS[category] || NEARBY_TAGS.eczane;
    const cat = NEARBY_TAGS[category] ? category : 'eczane';

    const curated = curatedNearby(cat, parseFloat(lat), parseFloat(lon), 12);

    const cacheKey = `nearby:${cat}:${lat},${lon}`;
    const hit = cache.get(cacheKey);
    const now = Date.now();
    if (hit && now - hit.time < CACHE_MS) {
      return res.json(mergeCuratedFirst(curated, hit.data));
    }

    const filters = tagPairs.map(([k, v]) => `node["${k}"="${v}"](around:4000,${lat},${lon});`).join('');
    const query = `[out:json][timeout:20];(${filters});out center 8;`;

    let raw;
    try {
      raw = await queryOverpass(query);
    } catch (err) {
      if (hit) return res.json(mergeCuratedFirst(curated, hit.data));
      if (curated.length) return res.json(curated); // Overpass düşse bile kürate liste en azından gelsin
      throw err;
    }

    const items = (raw.elements || []).map((el) => ({
      name: (el.tags && el.tags.name) || 'İsimsiz',
      lat: el.lat,
      lon: el.lon,
    })).filter((p) => p.lat && p.lon);

    cache.set(cacheKey, { time: now, data: items });
    res.json(mergeCuratedFirst(curated, items));
  } catch (err) {
    res.status(502).json({ error: err.message });
  }
});

function mergeCuratedFirst(curated, live) {
  const curatedNames = new Set(curated.map((c) => c.name));
  const liveFiltered = live.filter((l) => !curatedNames.has(l.name));
  return [...curated, ...liveFiltered];
}

// ---- Statik dosyalar (PWA frontend) ----
app.use(express.static(path.join(__dirname, 'public')));

app.listen(PORT, () => {
  console.log(`LSÖ backend çalışıyor: http://localhost:${PORT}`);
});
