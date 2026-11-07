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
  let stars = [], planets = [], meteors = [], candles = [], pines = [], flies = [], eyes = [], w = 0, h = 0;
  let magic = document.body.classList.contains('theme-magic');
  let woods = document.body.classList.contains('theme-woods');
  let moonCanvas = null;
  window.addEventListener('mq-theme', (e) => { magic = e.detail === 'magic'; woods = e.detail === 'woods'; });

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
    // mystery woods: three rows of pine trees, fireflies and eyes that blink in the dark
    pines = [0, 1, 2].map(row => {
      const list = [];
      let x = -40;
      while (x < w + 40) {
        const s = (0.55 + Math.random() * 0.6) * m * (row === 0 ? 0.2 : row === 1 ? 0.28 : 0.38);
        list.push({ x, s });
        x += s * (0.35 + Math.random() * 0.35);
      }
      return list;
    });
    flies = Array.from({ length: Math.max(14, Math.round(w / 70)) }, () => ({
      x: Math.random() * w, y: h * (0.45 + Math.random() * 0.5), p: Math.random() * 6, s: 0.5 + Math.random(),
    }));
    eyes = Array.from({ length: 4 }, () => ({ x: w * (0.05 + Math.random() * 0.9), y: h * (0.8 + Math.random() * 0.12), p: Math.random() * 20, k: 0.7 + Math.random() * 0.6 }));
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

  // ---------- mystery woods: dusk over a pine forest, a cabin with a lit window ----------
  function pine(x, base, s, color) {
    ctx.fillStyle = color;
    ctx.fillRect(x - s * 0.04, base - s * 0.18, s * 0.08, s * 0.2);
    for (let i = 0; i < 4; i++) {
      const y = base - s * 0.12 - i * s * 0.22, wd = s * (0.34 - i * 0.07);
      ctx.beginPath(); ctx.moveTo(x - wd, y); ctx.lineTo(x, y - s * 0.38); ctx.lineTo(x + wd, y); ctx.closePath(); ctx.fill();
    }
  }
  function drawWoods(t) {
    const m = Math.min(w, h);
    // warm glow of the sunset low over the trees
    const dusk = ctx.createLinearGradient(0, h * 0.35, 0, h);
    dusk.addColorStop(0, 'rgba(255,140,80,0)'); dusk.addColorStop(0.55, 'rgba(255,140,80,.22)'); dusk.addColorStop(1, 'rgba(255,190,110,.32)');
    ctx.fillStyle = dusk; ctx.fillRect(0, h * 0.35, w, h * 0.65);
    // big pale moon
    const narrow = w < 600, mx = w * (narrow ? 0.86 : 0.78), my = h * (narrow ? 0.07 : 0.2), mr = m * 0.07;
    const glow = ctx.createRadialGradient(mx, my, mr * 0.6, mx, my, mr * 3.2);
    glow.addColorStop(0, 'rgba(230,255,235,.3)'); glow.addColorStop(1, 'rgba(230,255,235,0)');
    ctx.fillStyle = glow; ctx.beginPath(); ctx.arc(mx, my, mr * 3.2, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#f1f7df'; ctx.beginPath(); ctx.arc(mx, my, mr, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = 'rgba(160,180,150,.35)';
    [[-0.3, -0.2, 0.22], [0.25, 0.15, 0.16], [-0.05, 0.4, 0.12]].forEach(([dx, dy, r]) => { ctx.beginPath(); ctx.arc(mx + dx * mr, my + dy * mr, r * mr, 0, Math.PI * 2); ctx.fill(); });
    // three rows of pines: far ones are lighter (mist), near ones are almost black
    const colors = ['rgba(38,70,72,.9)', 'rgba(20,44,44,.95)', '#0a1a1a'];
    const bases = [h * 0.86, h * 0.95, h * 1.04];
    pines.forEach((row, i) => {
      row.forEach(p => pine(p.x, bases[i], p.s, colors[i]));
      if (i === 1) cabin(w * 0.16, h * 0.95, m * 0.2, t);
    });
    // eyes in the dark woods: they blink from time to time
    if (!still) eyes.forEach(e => {
      const phase = ((t / 1000) * e.k + e.p) % 9;
      if (phase > 2.2) return; // hidden most of the time
      const open = phase < 0.12 || (phase > 1.1 && phase < 1.22) ? 0.15 : 1;
      ctx.fillStyle = 'rgba(255,230,90,.9)';
      [-5, 5].forEach(dx => { ctx.beginPath(); ctx.ellipse(e.x + dx, e.y, 3, 2.4 * open, 0, 0, Math.PI * 2); ctx.fill(); });
    });
    // fireflies
    flies.forEach(f => {
      const x = f.x + (still ? 0 : Math.sin(t / 1800 * f.s + f.p) * 26);
      const y = f.y + (still ? 0 : Math.cos(t / 2300 * f.s + f.p) * 14);
      const a = still ? 0.7 : 0.25 + 0.75 * Math.max(0, Math.sin(t / 600 * f.s + f.p));
      const g = ctx.createRadialGradient(x, y, 0, x, y, 9);
      g.addColorStop(0, `rgba(220,255,120,${a})`); g.addColorStop(1, 'rgba(220,255,120,0)');
      ctx.fillStyle = g; ctx.beginPath(); ctx.arc(x, y, 9, 0, Math.PI * 2); ctx.fill();
    });
  }
  // a small log cabin on the edge of the forest
  function cabin(x, base, s, t) {
    ctx.fillStyle = '#1b1210';
    ctx.fillRect(x, base - s * 0.45, s, s * 0.45);
    ctx.beginPath(); ctx.moveTo(x - s * 0.12, base - s * 0.43); ctx.lineTo(x + s * 0.5, base - s * 0.8); ctx.lineTo(x + s * 1.12, base - s * 0.43); ctx.fill();
    ctx.fillRect(x + s * 0.72, base - s * 0.86, s * 0.1, s * 0.25); // chimney
    // lit windows
    const flick = still ? 1 : 0.85 + 0.15 * Math.sin(t / 500);
    ctx.fillStyle = `rgba(255,190,90,${0.85 * flick})`;
    ctx.fillRect(x + s * 0.14, base - s * 0.33, s * 0.2, s * 0.14);
    ctx.fillRect(x + s * 0.62, base - s * 0.33, s * 0.2, s * 0.14);
    ctx.fillStyle = '#1b1210';
    ctx.fillRect(x + s * 0.235, base - s * 0.33, s * 0.015, s * 0.14);
    ctx.fillRect(x + s * 0.715, base - s * 0.33, s * 0.015, s * 0.14);
    // smoke from the chimney
    if (!still) for (let i = 0; i < 4; i++) {
      const k = ((t / 2600) + i / 4) % 1;
      ctx.fillStyle = `rgba(200,210,220,${0.22 * (1 - k)})`;
      ctx.beginPath(); ctx.arc(x + s * 0.77 + Math.sin(k * 6 + i) * 6, base - s * 0.9 - k * s * 0.6, s * (0.04 + k * 0.08), 0, Math.PI * 2); ctx.fill();
    }
  }

  function draw(t) {
    ctx.clearRect(0, 0, w, h);
    for (const s of stars) {
      if (woods && (s.y > h * 0.6 || s.r < 0.6)) continue;
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
    if (magic) drawMagic(t); else if (woods) drawWoods(t); else planets.forEach(p => planet(p, t));
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
