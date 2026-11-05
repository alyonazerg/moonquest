// Space background: twinkling stars, glowing planets and shooting stars on a canvas behind the page.
(function () {
  const c = document.createElement('canvas');
  c.id = 'sky';
  document.body.prepend(c);
  const ctx = c.getContext('2d');
  // Animation is off with "reduce motion", on weak devices, or when switched off on the home screen.
  function computeStill() {
    let pref = null;
    try { pref = JSON.parse(localStorage.getItem('mq_anim')); } catch (e) { /* auto */ }
    if (pref === false) return true;
    if (pref === true) return false;
    const weak = (navigator.hardwareConcurrency && navigator.hardwareConcurrency <= 2) || (navigator.deviceMemory && navigator.deviceMemory <= 2);
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches || !!weak;
  }
  let still = computeStill();
  let looping = false;
  document.body.classList.toggle('no-anim', still);
  let stars = [], planets = [], meteors = [], candles = [], w = 0, h = 0;
  let magic = document.body.classList.contains('theme-magic');
  let moonCanvas = null;
  window.addEventListener('mq-theme', (e) => { magic = e.detail === 'magic'; });

  function resize() {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    w = window.innerWidth; h = window.innerHeight;
    c.width = w * dpr; c.height = h * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    stars = Array.from({ length: Math.round(w * h / 2200) }, () => ({
      x: Math.random() * w, y: Math.random() * h,
      r: Math.random() < 0.07 ? 1.5 + Math.random() * 1.1 : 0.35 + Math.random() * 0.9,
      p: Math.random() * Math.PI * 2, s: 0.5 + Math.random() * 1.6,
      tint: Math.random() < 0.15 ? '#ffe9a8' : Math.random() < 0.18 ? '#bfe3ff' : '#ffffff',
    }));
    const m = Math.min(w, h);
    candles = Array.from({ length: Math.max(6, Math.round(w / 140)) }, () => ({
      x: Math.random() * w, y: h * (0.12 + Math.random() * 0.55), s: 0.7 + Math.random() * 0.6, p: Math.random() * 6,
    }));
    planets = [
      { x: w * 0.9, y: h * 0.16, r: m * 0.075, a: '#ffb36b', b: '#c2416b', ring: true, drift: 0.6 },
      { x: w * 0.07, y: h * 0.82, r: m * 0.11, a: '#7fe3ff', b: '#3a3fb8', ring: false, drift: 0.4 },
      { x: w * 0.18, y: h * 0.1, r: m * 0.028, a: '#e0d4ff', b: '#7b5cff', ring: false, drift: 0.9 },
    ];
  }

  function planet(p, t) {
    const y = p.y + (still ? 0 : Math.sin(t * 0.0003 * p.drift) * 6);
    // glow
    const g = ctx.createRadialGradient(p.x, y, p.r * 0.6, p.x, y, p.r * 2.4);
    g.addColorStop(0, p.a + '55'); g.addColorStop(1, p.a + '00');
    ctx.fillStyle = g; ctx.beginPath(); ctx.arc(p.x, y, p.r * 2.4, 0, Math.PI * 2); ctx.fill();
    // back half of the ring
    if (p.ring) ring(p, y, Math.PI, Math.PI * 2);
    // body with light from the top-left
    const body = ctx.createRadialGradient(p.x - p.r * 0.4, y - p.r * 0.45, p.r * 0.1, p.x, y, p.r);
    body.addColorStop(0, '#ffffff'); body.addColorStop(0.18, p.a); body.addColorStop(1, p.b);
    ctx.fillStyle = body; ctx.beginPath(); ctx.arc(p.x, y, p.r, 0, Math.PI * 2); ctx.fill();
    // night side
    const shade = ctx.createLinearGradient(p.x - p.r, y - p.r, p.x + p.r, y + p.r);
    shade.addColorStop(0.45, 'rgba(10,5,40,0)'); shade.addColorStop(1, 'rgba(10,5,40,.55)');
    ctx.fillStyle = shade; ctx.beginPath(); ctx.arc(p.x, y, p.r, 0, Math.PI * 2); ctx.fill();
    if (p.ring) ring(p, y, 0, Math.PI);
  }
  function ring(p, y, from, to) {
    ctx.save();
    ctx.translate(p.x, y); ctx.rotate(-0.35);
    ctx.strokeStyle = 'rgba(255, 225, 190, .55)'; ctx.lineWidth = p.r * 0.14;
    ctx.beginPath(); ctx.ellipse(0, 0, p.r * 1.75, p.r * 0.45, 0, from, to); ctx.stroke();
    ctx.restore();
  }

  // ---------- magic school sky: crescent moon, floating candles, castle on the hill ----------
  function drawMagic(t) {
    const m = Math.min(w, h);
    // crescent moon
    const mx = w * 0.84, my = h * 0.17, mr = m * 0.085;
    const glow = ctx.createRadialGradient(mx, my, mr * 0.5, mx, my, mr * 3);
    glow.addColorStop(0, 'rgba(255,230,170,.35)'); glow.addColorStop(1, 'rgba(255,230,170,0)');
    ctx.fillStyle = glow; ctx.beginPath(); ctx.arc(mx, my, mr * 3, 0, Math.PI * 2); ctx.fill();
    // the crescent is cut on its own small canvas, so the sky behind it stays untouched
    const size = Math.ceil(mr * 2 + 4);
    if (!moonCanvas || moonCanvas.width !== size) {
      moonCanvas = document.createElement('canvas');
      moonCanvas.width = moonCanvas.height = size;
      const mc = moonCanvas.getContext('2d');
      const grad = mc.createRadialGradient(size * 0.4, size * 0.4, 1, size / 2, size / 2, mr);
      grad.addColorStop(0, '#fff6d6'); grad.addColorStop(1, '#f2d58a');
      mc.fillStyle = grad; mc.beginPath(); mc.arc(size / 2, size / 2, mr, 0, Math.PI * 2); mc.fill();
      mc.globalCompositeOperation = 'destination-out';
      mc.beginPath(); mc.arc(size / 2 + mr * 0.45, size / 2 - mr * 0.2, mr * 0.88, 0, Math.PI * 2); mc.fill();
    }
    ctx.drawImage(moonCanvas, mx - size / 2, my - size / 2);
    // castle silhouette
    const base = h, cw = Math.min(w * 0.55, 620), cx = w * 0.2;
    ctx.fillStyle = 'rgba(10,4,20,.85)';
    ctx.beginPath();
    ctx.moveTo(0, base); ctx.quadraticCurveTo(w * 0.25, base - m * 0.12, w * 0.6, base - m * 0.05); ctx.lineTo(w, base - m * 0.02); ctx.lineTo(w, base);
    ctx.fill();
    const tower = (x, tw, th, roof) => {
      ctx.fillRect(x, base - m * 0.1 - th, tw, th + m * 0.1);
      ctx.beginPath(); ctx.moveTo(x - tw * 0.15, base - m * 0.1 - th); ctx.lineTo(x + tw / 2, base - m * 0.1 - th - roof); ctx.lineTo(x + tw * 1.15, base - m * 0.1 - th); ctx.fill();
    };
    const u = cw / 10;
    tower(cx, u * 1.1, m * 0.22, m * 0.09);
    tower(cx + u * 1.6, u * 1.6, m * 0.32, m * 0.12);
    ctx.fillRect(cx + u * 0.8, base - m * 0.1 - m * 0.13, u * 5.5, m * 0.13 + m * 0.1);
    tower(cx + u * 3.8, u * 0.9, m * 0.26, m * 0.1);
    tower(cx + u * 5.4, u * 1.3, m * 0.18, m * 0.07);
    // lit windows
    ctx.fillStyle = 'rgba(255,200,90,.9)';
    [[cx + u * 2.2, 0.36], [cx + u * 0.35, 0.27], [cx + u * 4.1, 0.3], [cx + u * 5.85, 0.22], [cx + u * 2.9, 0.2]].forEach(([x, k]) => {
      ctx.globalAlpha = 0.7 + 0.3 * Math.sin(t / 700 + x);
      ctx.fillRect(x, base - m * 0.1 - m * k + m * 0.04, u * 0.25, m * 0.035);
    });
    ctx.globalAlpha = 1;
    // floating candles
    for (const c of candles) {
      const y = c.y + (still ? 0 : Math.sin(t / 1400 + c.p) * 10);
      const s2 = c.s;
      const fg = ctx.createRadialGradient(c.x, y - 14 * s2, 1, c.x, y - 14 * s2, 26 * s2);
      fg.addColorStop(0, 'rgba(255,210,120,.55)'); fg.addColorStop(1, 'rgba(255,210,120,0)');
      ctx.fillStyle = fg; ctx.beginPath(); ctx.arc(c.x, y - 14 * s2, 26 * s2, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#f3ead8'; ctx.fillRect(c.x - 4 * s2, y - 6 * s2, 8 * s2, 26 * s2);
      ctx.fillStyle = 'rgba(0,0,0,.18)'; ctx.fillRect(c.x + 1 * s2, y - 6 * s2, 3 * s2, 26 * s2);
      const fl = still ? 1 : 1 + Math.sin(t / 90 + c.p) * 0.15;
      ctx.fillStyle = '#ffcf5a';
      ctx.beginPath(); ctx.ellipse(c.x, y - 12 * s2, 3 * s2, 6 * s2 * fl, 0, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#fff6d0';
      ctx.beginPath(); ctx.ellipse(c.x, y - 11 * s2, 1.4 * s2, 3 * s2 * fl, 0, 0, Math.PI * 2); ctx.fill();
    }
  }

  function draw(t) {
    ctx.clearRect(0, 0, w, h);
    for (const s of stars) {
      const a = still ? 0.8 : 0.4 + 0.6 * Math.abs(Math.sin(s.p + t * 0.001 * s.s));
      ctx.globalAlpha = a; ctx.fillStyle = s.tint;
      ctx.beginPath(); ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2); ctx.fill();
      if (s.r > 1.4) {
        ctx.globalAlpha = a * 0.35;
        ctx.fillRect(s.x - s.r * 3.2, s.y - 0.3, s.r * 6.4, 0.6);
        ctx.fillRect(s.x - 0.3, s.y - s.r * 3.2, 0.6, s.r * 6.4);
      }
    }
    ctx.globalAlpha = 1;
    if (magic) drawMagic(t); else planets.forEach(p => planet(p, t));
    if (!still) {
      if (Math.random() < 0.004 && meteors.length < 2) meteors.push({ x: Math.random() * w * 0.8 + w * 0.2, y: Math.random() * h * 0.4, life: 1 });
      meteors = meteors.filter(m => m.life > 0);
      for (const m of meteors) {
        const len = 140;
        const grad = ctx.createLinearGradient(m.x, m.y, m.x + len, m.y - len * 0.45);
        grad.addColorStop(0, `rgba(255,255,255,${m.life})`); grad.addColorStop(1, 'rgba(255,255,255,0)');
        ctx.strokeStyle = grad; ctx.lineWidth = 2; ctx.lineCap = 'round';
        ctx.beginPath(); ctx.moveTo(m.x, m.y); ctx.lineTo(m.x + len, m.y - len * 0.45); ctx.stroke();
        m.x -= 9; m.y += 4; m.life -= 0.018;
      }
    }
  }
  function loop(t) {
    draw(t);
    if (!still) requestAnimationFrame(loop); else looping = false;
  }
  function start() { if (!looping) { looping = true; requestAnimationFrame(loop); } }
  window.addEventListener('resize', () => { resize(); if (still) draw(0); });
  window.addEventListener('mq-theme', () => { if (still) setTimeout(() => draw(0), 0); });
  window.addEventListener('mq-anim', () => {
    still = computeStill();
    document.body.classList.toggle('no-anim', still);
    if (still) draw(0); else start();
  });
  resize();
  start();
})();
