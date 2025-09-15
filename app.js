// === Set your location here (decimal degrees) ===
const LAT = 51.178;   // example
const LON = -115.571; // example
const TZONE = Intl.DateTimeFormat().resolvedOptions().timeZone;

document.getElementById('loc').textContent =
  `Lat ${LAT.toFixed(3)}, Lon ${LON.toFixed(3)} • ${TZONE}`;

const fmtTime = (iso) => new Date(iso).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'});
const fmtDate = (iso) => new Date(iso).toLocaleString([], {weekday:'short', month:'short', day:'numeric'});

// 1) Weather / clouds (Open-Meteo)
(async () => {
  const url = `https://api.open-meteo.com/v1/forecast?latitude=${LAT}&longitude=${LON}` +
              `&hourly=cloud_cover,precipitation_probability,wind_speed_10m&forecast_days=2&timezone=auto`;
  const r = await fetch(url); const d = await r.json();

  const rows = [];
  const now = Date.now();
  for (let i = 0; i < d.hourly.time.length; i++) {
    const t = new Date(d.hourly.time[i]);
    if (t.getTime() < now) continue;                 // future hours only
    if (t.getHours() < 18 && t.getHours() > 6) continue; // evening/night focus
    rows.push({
      time: t,
      cloud: d.hourly.cloud_cover[i],
      pop: d.hourly.precipitation_probability[i],
      wind: d.hourly.wind_speed_10m[i]
    });
    if (rows.length >= 8) break;
  }

  const html = `
    <table>
      <thead><tr><th>Local Time</th><th>Cloud %</th><th>POP %</th><th>Wind m/s</th></tr></thead>
      <tbody>
        ${rows.map(r => `<tr>
          <td>${fmtDate(r.time)} ${fmtTime(r.time)}</td>
          <td>${r.cloud}</td>
          <td>${r.pop}</td>
          <td>${r.wind}</td>
        </tr>`).join('')}
      </tbody>
    </table>`;
  document.getElementById('forecast').innerHTML = html;
})().catch(console.error);

// 2) Astronomy (SunCalc — no external API)
// - Moon illumination & phase
// - Sunset
// - Astronomical night start (sun altitude −18°)
(() => {
  if (!window.SunCalc) { console.warn('SunCalc not loaded'); return; }

  const now = new Date();
  const times = SunCalc.getTimes(now, LAT, LON);

  // true astro night start (might be null at high latitudes certain seasons)
  const astroStart = times.night || times.nauticalDusk || times.dusk || times.sunset || null;

  // moon
  const moon = SunCalc.getMoonIllumination(now);
  const illumPct = Math.round(moon.fraction * 100);

  // crude phase text
  const phaseNames = [
    "New Moon","Waxing Crescent","First Quarter","Waxing Gibbous",
    "Full Moon","Waning Gibbous","Last Quarter","Waning Crescent"
  ];
  const phaseIndex = Math.floor(((moon.phase + 1) % 1) * 8); // 0..7
  const phaseText = phaseNames[phaseIndex];

  document.getElementById('moonPhase').textContent = phaseText;
  document.getElementById('moonIllum').textContent = illumPct;
  document.getElementById('sunset').textContent = times.sunset ? fmtTime(times.sunset) : "n/a";
  document.getElementById('astroTwilight').textContent = astroStart ? fmtTime(astroStart) : "n/a";
})();

// 3) Aurora Kp (NOAA SWPC)
(async () => {
  const r = await fetch('https://services.swpc.noaa.gov/products/noaa-planetary-k-index.json');
  const d = await r.json();
  const last = d[d.length - 1];
  const kp = last?.[1] ?? '—';
  document.getElementById('kp').textContent = kp;
})().catch(console.error);

// 4) Air Quality / smoke proxy (Open-Meteo)
(async () => {
  const url = `https://air-quality-api.open-meteo.com/v1/air-quality?latitude=${LAT}&longitude=${LON}` +
              `&hourly=pm10,pm2_5&timezone=auto`;
  const r = await fetch(url); const d = await r.json();
  const H = d.hourly || {};
  const times = H.time || [];
  const n = times.length;

  const lastNonNull = (arr) => {
    for (let i = n - 1; i >= Math.max(0, n - 24); i--) {
      const v = arr?.[i];
      if (v !== null && v !== undefined) return v;
    }
    return null;
  };

  const pm25v = lastNonNull(H.pm2_5);
  const pm10v = lastNonNull(H.pm10);

  document.getElementById('pm25').textContent = (pm25v == null) ? "n/a" : Math.round(pm25v);
  document.getElementById('pm10').textContent = (pm10v == null) ? "n/a" : Math.round(pm10v);
})().catch(console.error);

// 5) Auto-refresh images (webcams, MeteoBlue, CSC, NOAA)
// Bust cache with a timestamp query every 5 minutes
function refreshTiles(){
  const imgs = document.querySelectorAll('img.nocache');
  const ts = Date.now();
  imgs.forEach(img => {
    const base = img.src.split('?')[0];
    img.src = `${base}?t=${ts}`;
  });
}
refreshTiles();
setInterval(refreshTiles, 5 * 60 * 1000);

