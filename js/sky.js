// Starry sky background: twinkling stars on a canvas behind the page.
(function () {
  const c = document.createElement('canvas');
  c.id = 'sky';
  document.body.prepend(c);
  const ctx = c.getContext('2d');
  const still = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  let stars = [], w = 0, h = 0, dpr = 1;
  function resize() {
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    w = window.innerWidth; h = window.innerHeight;
    c.width = w * dpr; c.height = h * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    const n = Math.round(w * h / 2500);
    stars = Array.from({ length: n }, () => ({
      x: Math.random() * w, y: Math.random() * h,
      r: Math.random() < 0.08 ? 1.6 + Math.random() : 0.4 + Math.random() * 0.9,
      p: Math.random() * Math.PI * 2, s: 0.5 + Math.random() * 1.5,
      tint: Math.random() < 0.15 ? '#ffe9a8' : Math.random() < 0.15 ? '#bcd7ff' : '#ffffff',
    }));
  }
  function draw(t) {
    ctx.clearRect(0, 0, w, h);
    for (const s of stars) {
      const a = still ? 0.8 : 0.45 + 0.55 * Math.abs(Math.sin(s.p + t * 0.001 * s.s));
      ctx.globalAlpha = a;
      ctx.fillStyle = s.tint;
      ctx.beginPath(); ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2); ctx.fill();
      if (s.r > 1.5) { // little sparkle for big stars
        ctx.globalAlpha = a * 0.35;
        ctx.fillRect(s.x - s.r * 3, s.y - 0.3, s.r * 6, 0.6);
        ctx.fillRect(s.x - 0.3, s.y - s.r * 3, 0.6, s.r * 6);
      }
    }
    ctx.globalAlpha = 1;
    if (!still) requestAnimationFrame(draw);
  }
  window.addEventListener('resize', () => { resize(); if (still) draw(0); });
  resize();
  requestAnimationFrame(draw);
})();
