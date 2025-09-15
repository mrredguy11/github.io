// === Set your location here (decimal degrees) ===
const LAT = 51.178;   // example
const LON = -115.571; // example
const TZONE = Intl.DateTimeFormat().resolvedOptions().timeZone;

document.getElementById('loc').textContent =
  `Lat ${LAT.toFixed(3)}, Lon ${LON.toFixed(3)} • ${TZONE}`;

const fmtTime  = (v) => new Date(v).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'});
const fmtDate  = (v) => new Date(v).toLocaleString([], {weekday:'short', month:'short', day:'numeric'});
const fmtStamp = () => new Date().toLocaleString([], {weekday:'short', hour:'2-digit', minute:'2-digit'});

// helper to stamp "Last updated"
function setUpdated(id){ const el = document.getElementById(id); if (el) el.textContent = `Last updated: ${fmtStamp()}`; }

// helper to set KPI classes + label text
function setBadge(containerId, level, text=''){
  const el = document.getElementById(containerId);
  if (!el) return;
  const parent = el.closest('.kpi');
  if (parent){
    parent.classList.remove('good','ok','bad');
    if (level) parent.classList.add(level);
  }
  if (text) el.textContent = text;
}

/* ===================== 1) Weather / clouds (Open-Meteo) ===================== */
let kpiCloudMin = null, kpiWindMax = null;

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
    if (rows.length >= 12) break; // up to 12 nighttime hours
  }

  // compute KPIs from those rows
  if (rows.length){
    kpiCloudMin = rows.reduce((m,r)=>Math.min(m, r.cloud), 100);
    kpiWindMax  = rows.reduce((m,r)=>Math.max(m, r.wind), 0);
    document.getElementById('kpiCloud').textContent = Math.round(kpiCloudMin);
    document.getElementById('kpiWind').textContent  = Math.round(kpiWindMax);
    // thresholds (tweak if you like)
    setBadge('bCloud', kpiCloudMin<=30 ? 'good' : kpiCloudMin<=60 ? 'ok' : 'bad', ' ');
    setBadge('bWind',  kpiWindMax<=5   ? 'good' : kpiWindMax<=8   ? 'ok' : 'bad', ' ');
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

  setUpdated('updForecast');
  setUpdated('updSummary'); // summary uses cloud/wind
})().catch(console.error);

/* ===================== 2) Astronomy (SunCalc — no API) ===================== */
(() => {
  if (!window.SunCalc) { console.warn('SunCalc not loaded'); return; }

  const now = new Date();
  const times = SunCalc.getTimes(now, LAT, LON);

  // true astro night window (−18°)
  const darkStart = times.night     || times.nauticalDusk || times.dusk   || times.sunset || null;
  const darkEnd   = times.nightEnd  || times.nauticalDawn || times.dawn   || times.sunrise|| null;

  // moon illum + phase text
  const moon = SunCalc.getMoonIllumination(now);
  const illumPct = Math.round(moon.fraction * 100);
  const phaseNames = [
    "New Moon","Waxing Crescent","First Quarter","Waxing Gibbous",
    "Full Moon","Waning Gibbous","Last Quarter","Waning Crescent"
  ];
  const phaseIndex = Math.floor(((moon.phase + 1) % 1) * 8); // 0..7
  const phaseText = phaseNames[phaseIndex];

  // populate Astronomy card
  document.getElementById('moonPhase').textContent = phaseText;
  document.getElementById('moonIllum').textContent = illumPct;
  document.getElementById('sunset').textContent    = times.sunset ? fmtTime(times.sunset) : "n/a";
  document.getElementById('astroTwilight').textContent = darkStart ? fmtTime(darkStart) : "n/a";
  setUpdated('updAstro');

  // summary KPIs from astronomy
  document.getElementById('kpiMoon').textContent = illumPct;
  setBadge('bMoon', illumPct<=30 ? 'good' : illumPct<=60 ? 'ok' : 'bad', ' ');

  const darkText = (darkStart && darkEnd) ? `${fmtTime(darkStart)}–${fmtTime(darkEnd)}` :
                   (darkStart ? `${fmtTime(darkStart)}–—` : 'n/a');
  document.getElementById('kpiDark').textContent = darkText;
  setBadge('bDark', darkStart ? 'good' : 'bad', ' ');
})();

/* ===================== 3) Aurora Kp (NOAA SWPC) ===================== */
(async () => {
  const r = await fetch('https://services.swpc.noaa.gov/products/noaa-planetary-k-index.json');
  const d = await r.json();
  const last = d[d.length - 1];
  const kp = Number(last?.[1] ?? NaN);
  document.getElementById('kp').textContent     = isNaN(kp) ? '—' : kp.toFixed(2);
  document.getElementById('kpiKp').textContent  = isNaN(kp) ? '—' : kp.toFixed(1);
  setBadge('bKp', !isNaN(kp) ? (kp>=5 ? 'good' : kp>=4 ? 'ok' : 'bad') : null, ' ');
  setUpdated('updKp');
  setUpdated('updSummary');
})().catch(console.error);

/* ===================== 4) Air Quality / smoke proxy (Open-Meteo) ===================== */
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

  const pm25Txt = (pm25v == null) ? "n/a" : Math.round(pm25v);
  const pm10Txt = (pm10v == null) ? "n/a" : Math.round(pm10v);

  document.getElementById('pm25').textContent = pm25Txt;
  document.getElementById('pm10').textContent = pm10Txt;

  document.getElementById('kpiPM25').textContent = pm25Txt;
  if (pm25v == null) setBadge('bPM25', null);
  else setBadge('bPM25', pm25v <= 15 ? 'good' : pm25v <= 35 ? 'ok' : 'bad', ' ');

  setUpdated('updAQ');
  setUpdated('updSummary');
})().catch(console.error);

/* ===================== 5) Auto-refresh images (webcams & charts) ===================== */
// Bust cache with a timestamp query every 5 minutes
function refreshTiles(){
  const imgs = document.querySelectorAll('img.nocache');
  const ts = Date.now();
  imgs.forEach(img => {
    const base = img.src.split('?')[0];
    img.src = `${base}?t=${ts}`;
  });
  // stamp all image-driven cards
  ['updMeteo','updCSC','updOval','updWebcams'].forEach(setUpdated);
}
refreshTiles();
setInterval(refreshTiles, 5 * 60 * 1000);
