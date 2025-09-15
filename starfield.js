// starfield.js — pure black background, rotating stars, subtle twinkle, Pleiades cluster
const canvas = document.getElementById("starfield");
const ctx = canvas.getContext("2d", { alpha: false });

// ===== Config =====
const NUM_STARS = 2200;         // density of general starfield
const MIN_R = 0.2;              // sub-pixel radii
const MAX_R = 0.6;
const TWINKLE_AMPL = 0.05;      // very subtle
const TWINKLE_FREQ = 0.05;
const BASE_ROT_SPEED = (15 * Math.PI / 180) / 3600; // 15°/hr in rad/sec
const SPEED_MULTIPLIER = 4;     // make it visually rotate faster
const BG_COLOR = "#000";        // flat black

// Pleiades (simple aesthetic layout)
const PLEIADES = [
  { dx:   0, dy:   0, r: 1.2 },
  { dx: -18, dy:  10, r: 0.9 },
  { dx:  16, dy:  -8, r: 0.9 },
  { dx: -26, dy: -14, r: 0.8 },
  { dx:  10, dy:  18, r: 0.9 },
  { dx:  28, dy:   6, r: 0.8 },
  { dx:  -8, dy: -26, r: 0.9 },
];

let dpr = Math.max(1, window.devicePixelRatio || 1);
let W = 0, H = 0, CX = 0, CY = 0, RMAX = 0;

function resize() {
  dpr = Math.max(1, window.devicePixelRatio || 1);
  canvas.width  = Math.round(window.innerWidth  * dpr);
  canvas.height = Math.round(window.innerHeight * dpr);
  canvas.style.width  = window.innerWidth + "px";
  canvas.style.height = window.innerHeight + "px";

  W = canvas.width;
  H = canvas.height;
  CX = W / 2;
  CY = H / 2;
  RMAX = Math.hypot(CX, CY) * 1.05;

  initStars();
}
window.addEventListener("resize", resize);

let stars = [];
function rand(min, max) { return Math.random() * (max - min) + min; }

function initStars() {
  stars = [];

  // random background stars
  for (let i = 0; i < NUM_STARS; i++) {
    const x = Math.random() * W;
    const y = Math.random() * H;
    const dx = x - CX;
    const dy = y - CY;
    const rho = Math.hypot(dx, dy);

    stars.push({
      r: rand(MIN_R * dpr, MAX_R * dpr),
      rho: Math.min(rho, RMAX),
      theta0: Math.atan2(dy, dx),
      alpha0: rand(0.25, 0.7),
      twinklePhase: rand(0, Math.PI * 2),
      twinkleAmp: TWINKLE_AMPL * rand(0.6, 1.4),
    });
  }

  // add Pleiades cluster
  const px = CX + W * 0.20;
  const py = CY - H * 0.18;
  for (const s of PLEIADES) {
    const x = px + s.dx * dpr;
    const y = py + s.dy * dpr;
    const dx = x - CX;
    const dy = y - CY;
    stars.push({
      r: s.r * dpr,
      rho: Math.hypot(dx, dy),
      theta0: Math.atan2(dy, dx),
      alpha0: 0.95,
      twinklePhase: rand(0, Math.PI * 2),
      twinkleAmp: TWINKLE_AMPL * 0.3,
    });
  }
}

// ===== Animation =====
let lastT = 0;
function draw(ts) {
  if (!lastT) lastT = ts;
  const dtSec = (ts - lastT) / 1000;
  lastT = ts;

  const dTheta = BASE_ROT_SPEED * SPEED_MULTIPLIER * dtSec;

  // flat black background
  ctx.fillStyle = BG_COLOR;
  ctx.fillRect(0, 0, W, H);

  for (const s of stars) {
    s.theta0 += dTheta;

    const a = Math.max(
      0,
      Math.min(1, s.alpha0 + s.twinkleAmp * Math.sin(TWINKLE_FREQ * performance.now()/1000 + s.twinklePhase))
    );

    const x = CX + s.rho * Math.cos(s.theta0);
    const y = CY + s.rho * Math.sin(s.theta0);

    ctx.beginPath();
    ctx.arc(x, y, s.r, 0, Math.PI * 2);
    ctx.fillStyle = `rgba(255,255,255,${a})`;
    ctx.fill();
  }

  requestAnimationFrame(draw);
}

resize();
requestAnimationFrame(draw);
