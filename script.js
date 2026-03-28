/* ── CURSOR ── */
const cursor = document.getElementById('cursor');
const ring = document.getElementById('cursor-ring');
let mx = 0, my = 0, rx = 0, ry = 0;
document.addEventListener('mousemove', e => { mx = e.clientX; my = e.clientY; });
function animateCursor() {
  cursor.style.left = mx + 'px'; cursor.style.top = my + 'px';
  rx += (mx - rx) * 0.12; ry += (my - ry) * 0.12;
  ring.style.left = rx + 'px'; ring.style.top = ry + 'px';
  requestAnimationFrame(animateCursor);
}
animateCursor();
document.querySelectorAll('a, button').forEach(el => {
  el.addEventListener('mouseenter', () => { ring.style.width='60px'; ring.style.height='60px'; ring.style.borderColor='rgba(0,229,255,0.6)'; });
  el.addEventListener('mouseleave', () => { ring.style.width='36px'; ring.style.height='36px'; ring.style.borderColor='rgba(91,78,255,0.5)'; });
});

/* ── PARTICLE SYSTEM (BACKGROUND) ── */
const canvas = document.getElementById('zcanvas');
const ctx = canvas.getContext('2d');
let W, H, particles = [];
function resize() { W = canvas.width = window.innerWidth; H = canvas.height = window.innerHeight; }
resize(); window.addEventListener('resize', resize);

class Particle {
  constructor() { this.reset(); }
  reset() {
    this.x = Math.random() * W;
    this.y = H + Math.random() * 200;
    this.z = Math.random();
    this.size = 0.5 + this.z * 2;
    this.speed = 0.3 + this.z * 1.2;
    this.dx = (Math.random() - 0.5) * 0.4;
    this.opacity = 0.1 + this.z * 0.5;
    this.hue = Math.random() > 0.6 ? 200 : 260; // cyan vs purple
  }
  update() {
    this.y -= this.speed;
    this.x += this.dx;
    if (this.y < -10) this.reset();
  }
  draw() {
    ctx.save();
    ctx.globalAlpha = this.opacity * (1 - (H - this.y) / H * 0.5);
    ctx.fillStyle = `hsl(${this.hue}, 100%, 70%)`;
    ctx.shadowColor = `hsl(${this.hue}, 100%, 70%)`;
    ctx.shadowBlur = 8;
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }
}

for (let i = 0; i < 200; i++) {
  const p = new Particle();
  p.y = Math.random() * H; // scatter initial
  particles.push(p);
}

// Grid lines rising from below
class GridLine {
  constructor(isVertical, idx, total) {
    this.isVertical = isVertical;
    this.pos = (idx / total) * (isVertical ? W : H);
    this.progress = 0;
    this.speed = 0.001 + Math.random() * 0.002;
  }
  update() { if (this.progress < 1) this.progress += this.speed; }
  draw() {
    ctx.save();
    ctx.globalAlpha = 0.04 * this.progress;
    ctx.strokeStyle = '#5b4eff';
    ctx.lineWidth = 0.5;
    ctx.beginPath();
    if (this.isVertical) {
      ctx.moveTo(this.pos, H); ctx.lineTo(this.pos, H * (1 - this.progress));
    } else {
      ctx.moveTo(0, this.pos); ctx.lineTo(W * this.progress, this.pos);
    }
    ctx.stroke();
    ctx.restore();
  }
}

const vLines = Array.from({length:20}, (_, i) => new GridLine(true, i, 20));
const hLines = Array.from({length:12}, (_, i) => new GridLine(false, i, 12));

let mouseX = W/2, mouseY = H/2;
window.addEventListener('mousemove', e => { mouseX = e.clientX; mouseY = e.clientY; });

function bgLoop() {
  ctx.clearRect(0, 0, W, H);
  
  // Deep radial glow at mouse
  const grd = ctx.createRadialGradient(mouseX, mouseY, 0, mouseX, mouseY, 500);
  grd.addColorStop(0, 'rgba(91,78,255,0.04)');
  grd.addColorStop(1, 'transparent');
  ctx.fillStyle = grd;
  ctx.fillRect(0, 0, W, H);
  
  vLines.forEach(l => { l.update(); l.draw(); });
  hLines.forEach(l => { l.update(); l.draw(); });
  particles.forEach(p => { p.update(); p.draw(); });
  requestAnimationFrame(bgLoop);
}
bgLoop();

/* ── 3D GRAPH ── */
const g3 = document.getElementById('graph3d');
const gc = g3.getContext('2d');
let angle = 0;

function project(x, y, z, cx, cy, fov=300) {
  const cos = Math.cos(angle), sin = Math.sin(angle);
  const rx = x * cos - z * sin;
  const rz = x * sin + z * cos;
  const scale = fov / (fov + rz + 100);
  return { x: cx + rx * scale, y: cy - y * scale, scale };
}

function draw3D() {
  gc.clearRect(0, 0, 520, 420);
  const cx = 260, cy = 320;
  angle += 0.008;

  // Axes
  const axisLen = 120;
  const origin = project(0,0,0,cx,cy);
  const xEnd = project(axisLen,0,0,cx,cy);
  const yEnd = project(0,axisLen,0,cx,cy);
  const zEnd = project(0,0,axisLen,cx,cy);

  const drawAxis = (from, to, color, label) => {
    gc.beginPath();
    gc.strokeStyle = color;
    gc.globalAlpha = 0.6;
    gc.lineWidth = 1.5;
    gc.moveTo(from.x, from.y);
    gc.lineTo(to.x, to.y);
    gc.stroke();
    gc.globalAlpha = 0.8;
    gc.fillStyle = color;
    gc.font = '600 13px Syne, sans-serif';
    gc.fillText(label, to.x + 6, to.y + 4);
    gc.globalAlpha = 1;
  };
  drawAxis(origin, xEnd, '#ff3cac', 'X');
  drawAxis(origin, yEnd, '#00e5ff', 'Z');
  drawAxis(origin, zEnd, '#c9a84c', 'Y');

  // Exponential surface
  const steps = 18;
  const pts = [];
  for (let i = 0; i <= steps; i++) {
    pts[i] = [];
    for (let j = 0; j <= steps; j++) {
      const xi = (i / steps) * 2 - 1;
      const zi = (j / steps) * 2 - 1;
      const yi = 0.5 * Math.exp((xi + 1) * 1.5) / Math.exp(3) * 100 + Math.exp((zi + 1) * 0.5) * 5;
      pts[i][j] = project(xi * 90, yi * 0.9, zi * 90, cx, cy);
    }
  }

  // Draw quads
  for (let i = 0; i < steps; i++) {
    for (let j = 0; j < steps; j++) {
      const a = pts[i][j], b = pts[i+1][j], c = pts[i+1][j+1], d = pts[i][j+1];
      const t = (i + j) / (steps * 2);
      const r = Math.round(91 + t * 164);
      const g = Math.round(78 + t * 151);
      const bl = Math.round(255 - t * 55);
      gc.beginPath();
      gc.moveTo(a.x, a.y); gc.lineTo(b.x, b.y); gc.lineTo(c.x, c.y); gc.lineTo(d.x, d.y);
      gc.closePath();
      gc.strokeStyle = `rgba(${r},${g},${bl},0.25)`;
      gc.lineWidth = 0.5;
      gc.stroke();
      gc.fillStyle = `rgba(${r},${g},${bl},0.04)`;
      gc.fill();
    }
  }

  // Highlight curve along top
  gc.beginPath();
  gc.lineWidth = 2;
  gc.strokeStyle = '#00e5ff';
  gc.shadowColor = '#00e5ff';
  gc.shadowBlur = 12;
  gc.globalAlpha = 0.9;
  for (let i = 0; i <= steps; i++) {
    const p = pts[i][steps];
    i === 0 ? gc.moveTo(p.x, p.y) : gc.lineTo(p.x, p.y);
  }
  gc.stroke();
  gc.shadowBlur = 0;
  gc.globalAlpha = 1;

  requestAnimationFrame(draw3D);
}
draw3D();

/* ── EXPONENTIAL CHART ── */
const expC = document.getElementById('expCanvas');
const eCtx = expC.getContext('2d');
expC.width = expC.offsetWidth || 900;
expC.height = 320;

let expT = 0;
function drawExpChart() {
  const W2 = expC.width, H2 = expC.height;
  eCtx.clearRect(0, 0, W2, H2);

  // Grid
  eCtx.strokeStyle = 'rgba(91,78,255,0.1)';
  eCtx.lineWidth = 0.5;
  for (let i = 1; i < 8; i++) {
    eCtx.beginPath(); eCtx.moveTo(i * W2/8, 0); eCtx.lineTo(i * W2/8, H2); eCtx.stroke();
  }
  for (let i = 1; i < 5; i++) {
    eCtx.beginPath(); eCtx.moveTo(0, i * H2/4); eCtx.lineTo(W2, i * H2/4); eCtx.stroke();
  }

  // Linear comparison
  const grad1 = eCtx.createLinearGradient(0,0,W2,0);
  grad1.addColorStop(0,'rgba(255,60,172,0.0)'); grad1.addColorStop(1,'rgba(255,60,172,0.4)');
  eCtx.beginPath();
  eCtx.strokeStyle = 'rgb(33, 237, 15)';
  eCtx.lineWidth = 1.5;
  eCtx.setLineDash([4,4]);
  eCtx.moveTo(0, H2);
  eCtx.lineTo(Math.min(expT * W2, W2), H2 - Math.min(expT, 1) * H2 * 0.6);
  eCtx.stroke();
  eCtx.setLineDash([]);

  // Label
  if (expT > 0.2) {
    eCtx.fillStyle = 'rgba(243, 243, 246, 0.95)';
    eCtx.font = '500 11px DM Mono, monospace';
    eCtx.fillText('Linear', 12, H2 - expT * H2 * 0.55);
  }

  // Exponential curve
  const grad2 = eCtx.createLinearGradient(0, H2, 0, 0);
  grad2.addColorStop(0,'rgba(0,229,255,0.68)');
  grad2.addColorStop(1,'rgba(0,229,255,0.25)');

  eCtx.beginPath();
  let firstPoint = true;
  const maxX = Math.min(expT, 1);
  for (let x = 0; x <= maxX; x += 0.002) {
    const screenX = x * W2;
    const expVal = (Math.exp(x * 4) - 1) / (Math.exp(4) - 1);
    const screenY = H2 - expVal * H2 * 0.92;
    firstPoint ? eCtx.moveTo(screenX, screenY) : eCtx.lineTo(screenX, screenY);
    firstPoint = false;
  }
  eCtx.strokeStyle = '#00e5ff';
  eCtx.lineWidth = 2.5;
  eCtx.shadowColor = '#00e5ff';
  eCtx.shadowBlur = 16;
  eCtx.stroke();

  // Fill under
  const lastX2 = maxX * W2;
  const lastExpVal = (Math.exp(maxX * 4) - 1) / (Math.exp(4) - 1);
  const lastY2 = H2 - lastExpVal * H2 * 0.92;
  eCtx.lineTo(lastX2, H2); eCtx.lineTo(0, H2); eCtx.closePath();
  eCtx.fillStyle = grad2; eCtx.fill();
  eCtx.shadowBlur = 0;

  if (expT > 0.5) {
    eCtx.fillStyle = '#00e5ff';
    eCtx.font = '600 11px DM Mono, monospace';
    eCtx.fillText('eᶻ (Zexponent)', lastX2 - 120, lastY2 - 12);
  }

  // Axes
  eCtx.strokeStyle = 'rgba(240,238,232,0.2)';
  eCtx.lineWidth = 1;
  eCtx.beginPath(); eCtx.moveTo(0,H2); eCtx.lineTo(W2,H2); eCtx.stroke();
  eCtx.beginPath(); eCtx.moveTo(0,0); eCtx.lineTo(0,H2); eCtx.stroke();

  eCtx.fillStyle = 'rgba(246, 246, 250, 0.8)';
  eCtx.font = '500 10px DM Mono, monospace';
  eCtx.fillText('Time →', W2 - 60, H2 - 8);
  eCtx.save(); eCtx.translate(12, 60); eCtx.rotate(-Math.PI/2);
  eCtx.fillText('Growth ↑', 0, 0); eCtx.restore();

  if (expT < 1) expT += 0.004;
  requestAnimationFrame(drawExpChart);
}
drawExpChart();

/* ── INTERSECTION OBSERVER ── */
const obs = new IntersectionObserver(entries => {
  entries.forEach(e => {
    if (e.isIntersecting) {
      e.target.classList.add('visible');
      // stagger children if it's the stats section
      const items = e.target.querySelectorAll('.stat-item');
      items.forEach((item, i) => {
        setTimeout(() => item.classList.add('visible'), i * 120);
      });
    }
  });
}, { threshold: 0.15 });

document.querySelectorAll('.pillar, #stats').forEach(el => obs.observe(el));

/* ── SMOOTH PARALLAX ── */
let scrollY = 0;
window.addEventListener('scroll', () => { scrollY = window.scrollY; });
const heroZ = document.querySelector('.hero-z');
function parallax() {
  if (heroZ) heroZ.style.transform = `translateY(calc(-50% + ${scrollY * 0.25}px)) rotate(-2deg)`;
  requestAnimationFrame(parallax);
}
parallax();