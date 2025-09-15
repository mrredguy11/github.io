// === Location (set your coords) ===
const LAT = 51.178;   // example
const LON = -115.571; // example
const TZONE = Intl.DateTimeFormat().resolvedOptions().timeZone;

// only write to #loc if it exists on the page
const locEl = document.getElementById('loc');
if (locEl) {
  locEl.textContent = `Lat ${LAT.toFixed(3)}, Lon ${LON.toFixed(3)} • ${TZONE}`;
}

const fmtTime = (iso) =>
  new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
const fmtDate = (iso) =>
  new Date(iso).toLocaleString([], { weekday: 'short', month: 'short', day: 'numeric' });

// 1) Weather / clouds (Open-Meteo)
(async () => {
  const url =
    `https://api.open-meteo.com/v1/forecast?latitude=${LAT}&longitude=${LON}` +
    `&hourly=cloud_cover,precipitation_probability,wind_speed_10m&forecast_days=2&timezone=auto`;
  const r = await fetch(url);
  const d = await r.json();

  const rows = [];
  const now = Date.now();
  for (let i = 0; i < d.hourly.time.length; i++) {
    const t = new Date(d.hourly.time[i]);
    if (t.getTime() < now) continue;             // future hours only
    if (t.getHours() < 18 && t.getHours() > 6) continue; // focus on evening/night
    rows.push({
      time: t,
      cloud: d.hourly.cloud_cover[i],
      pop: d.hourly.precipitation_probability[i],
      wind: d.hourly.wind_speed_10m[i],
    });
    if (rows.length >= 8) break;
  }

  const html = `
    <table>
      <thead><tr><th>Local Time</th><th>Cloud %</th><th>POP %</th><th>Wind m/s</th></tr></thead>
      <tbody>
        ${rows
          .map(
            (r) => `<tr>
          <td>${fmtDate(r.time)} ${fmtTime(r.time)}</td>
          <td>${r.cloud}</td>
          <td>${r.pop}</td>
          <td>${r.wind}</td>
        </tr>`
          )
          .join('')}
      </tbody>
    </table>`;
  const el = document.getElementById('forecast');
  if (el) el.innerHTML = html;
})().catch(console.error);

// 2) Astronomy (Open-Meteo)
(async () => {
  const url =
    `https://api.open-meteo.com/v1/astronomy?latitude=${LAT}&longitude=${LON}` +
    `&daily=sunrise,sunset,moon_phase,moon_phase_description,moon_illumination&timezone=auto`;

  let day = {};
  try {
    const r = await fetch(url);
    const d = await r.json();
    day = d?.daily || {};
  } catch (e) {
    console.error('Astronomy fetch failed', e);
  }

  const phaseText = day.moon_phase_description?.[0] || day.moon_phase?.[0] || 'n/a';
  const illum = day.moon_illumination?.[0];
  const sunsetISO = day.sunset?.[0];

  const setText = (id, text) => {
    const el = document.getElementById(id);
    if (el) el.textContent = text;
  };

  setText('moonPhase', phaseText);
  setText('moonIllum', illum == null ? 'n/a' : Math.round(illum));
  setText('sunset', sunsetISO ? fmtTime(sunsetISO) : 'n/a');
  // Placeholder for true -18° astronomical twilight (we’ll wire this later)
  setText('astroTwilight', sunsetISO ? fmtTime(sunsetISO) : 'n/a');
})();

// 3) Aurora Kp (NOAA SWPC)
(async () => {
  const r = await fetch('https://services.swpc.noaa.gov/products/noaa-planetary-k-index.json');
  const d = await r.json();
  const last = d[d.length - 1];
  const kp = last?.[1] ?? '—';
  const el = document.getElementById('kp');
  if (el) el.textContent = kp;
})().catch(console.error);

// 4) Air Quality / smoke proxy (Open-Meteo)
(async () => {
  const url =
    `https://air-quality-api.open-meteo.com/v1/air-quality?latitude=${LAT}&longitude=${LON}` +
    `&hourly=pm10,pm2_5&timezone=auto`;
  const r = await fetch(url);
  const d = await r.json();
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

  const setText = (id, val) => {
    const el = document.getElementById(id);
    if (el) el.textContent = val;
  };
  setText('pm25', pm25v == null ? 'n/a' : Math.round(pm25v));
  setText('pm10', pm10v == null ? 'n/a' : Math.round(pm10v));
})().catch(console.error);
