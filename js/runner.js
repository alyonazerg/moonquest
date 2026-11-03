// Runner games: a rocket flies up a 3-lane space road, gates with three answers come down,
// steer into the right one. Verb Runner (irregular verb forms) and Word Runner (vocabulary).
(function () {
  const { h, shuffle, sample, speak, games } = MQ;
  const FORM = { v2: 'Past Simple · V2', v3: 'Past Participle · V3' };
  const LIVES = 3;

  function fakeRegular(b) {
    if (/e$/.test(b)) return b + 'd';
    if (/[^aeiou]y$/.test(b)) return b.slice(0, -1) + 'ied';
    return b + 'ed';
  }

  // ---------- question makers ----------
  // A round: { prompt: [nodes], answers: [3 strings], right: index, say, item (for mistakes), reveal }
  function verbRound(x, all) {
    const { v, f } = x;
    const right = v[f];
    const other = v[f === 'v2' ? 'v3' : 'v2'];
    const pool = [...new Set([fakeRegular(v.base), other, v.base, ...shuffle(all).map(o => o[f])])].filter(a => a !== right);
    // prefer the most "tempting" wrong answers: made-up -ed form and the other form
    const wrong = pool.slice(0, 2);
    const answers = shuffle([right, ...wrong]);
    return {
      prompt: [h('span', { class: 'rn-word' }, v.base), h('span', { class: 'rn-arrow' }, ' → '), h('span', { class: 'rn-ask' }, FORM[f])],
      sub: v.ru || '',
      answers, right: answers.indexOf(right), say: right,
      reveal: `${v.base} – ${v.v2} – ${v.v3}`,
      item: x,
    };
  }
  function wordRound(w, all) {
    const wrong = sample(all.filter(o => o.en !== w.en), 2).map(o => o.en);
    const answers = shuffle([w.en, ...wrong]);
    return {
      prompt: [w.pic || w.img ? MQ.pic(w, 'rn-pic') : null, h('span', { class: 'rn-word' }, w.ru || '?')],
      sub: '',
      answers, right: answers.indexOf(w.en), say: w.en,
      reveal: `${w.ru ? w.ru + ' = ' : ''}${w.en}`,
      item: w,
    };
  }

  // ---------- the game ----------
  function runGame(ctx, items, makeRound) {
    const total = items.length;
    let idx = 0, correct = 0, lives = LIVES, score = 0, combo = 0, bestCombo = 0;
    const mistakes = [];

    const banner = h('div', { class: 'rn-banner' });
    const sub = h('div', { class: 'rn-sub' });
    const hud = h('div', { class: 'rn-hud' });
    const canvas = h('canvas', { class: 'rn-canvas' });
    const wrapC = h('div', { class: 'rn-stage' }, canvas);
    const left = h('button', { class: 'rn-btn', 'aria-label': 'Left' }, '◀');
    const right = h('button', { class: 'rn-btn', 'aria-label': 'Right' }, '▶');
    const overlay = h('div', { class: 'rn-overlay' });
    wrapC.append(overlay);
    ctx.root.append(h('div', { class: 'rn' }, hud, h('div', { class: 'rn-top' }, banner, sub), wrapC, h('div', { class: 'rn-controls' }, left, right)));

    const g = canvas.getContext('2d');
    let W = 0, H = 0, dpr = 1;
    // The whole game (score, task, road, buttons) must fit on one screen
    const rnBox = () => ctx.root.querySelector('.rn');
    function resize() {
      const w = Math.min(wrapC.clientWidth || 600, 640);
      const box = rnBox();
      const controls = box ? box.querySelector('.rn-controls') : null;
      const extra = (box ? box.querySelector('.rn-hud').offsetHeight + box.querySelector('.rn-top').offsetHeight : 120)
        + (controls && controls.offsetParent ? controls.offsetHeight + 14 : 0);
      const topbar = (document.querySelector('.topbar') || {}).offsetHeight || 70;
      const fit = window.innerHeight - topbar - extra - 24;
      W = w; H = Math.round(Math.max(260, Math.min(560, fit, w * 1.3)));
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = W * dpr; canvas.height = H * dpr;
      canvas.style.height = H + 'px';
      g.setTransform(dpr, 0, 0, dpr, 0, 0);
    }
    resize();
    requestAnimationFrame(resize);
    window.addEventListener('resize', resize);

    // world
    const laneX = (i) => W * (i + 0.5) / 3;
    let lane = 1, shipX = laneX(1), speed = 150;
    const stars = Array.from({ length: 90 }, () => ({ x: Math.random(), y: Math.random(), z: 0.3 + Math.random() * 0.7 }));
    let particles = [], flash = 0, shake = 0, msg = null;
    let gate = null, round = null, running = false, over = false, last = 0;

    function updateHud() {
      hud.innerHTML = '';
      hud.append(
        h('span', {}, '❤️'.repeat(lives) + '🖤'.repeat(LIVES - lives)),
        h('span', {}, `⭐ ${score}`),
        h('span', {}, combo >= 2 ? `🔥 x${combo}` : ''),
        h('span', {}, `${Math.min(idx + 1, total)} / ${total}`));
    }
    function nextGate() {
      if (idx >= total || lives <= 0) return end();
      round = makeRound(items[idx]);
      banner.innerHTML = ''; banner.append(...round.prompt);
      sub.textContent = round.sub;
      gate = { y: -60, round, resolved: false };
      canvas.dataset.answers = JSON.stringify(round.answers); // for automated tests
      updateHud();
    }
    function move(d) { if (!over) lane = Math.max(0, Math.min(2, lane + d)); }
    function goLane(i) { if (!over) lane = i; }

    function burst(x, y, color, n) {
      for (let i = 0; i < n; i++) {
        const a = Math.random() * Math.PI * 2, s = 80 + Math.random() * 220;
        particles.push({ x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s, life: 1, color });
      }
    }
    function resolve() {
      gate.resolved = true;
      const ok = lane === round.right;
      const shipY = H - 90;
      if (ok) {
        correct++; combo++; bestCombo = Math.max(bestCombo, combo);
        score += 10 * Math.min(combo, 5);
        speed = Math.min(360, speed + 12);
        burst(shipX, shipY - 30, '#3ddc97', 26);
        msg = { text: combo >= 3 ? `🔥 Combo x${combo}!` : 'Great!', color: '#8dffc8', t: 1 };
      } else {
        lives--; combo = 0;
        mistakes.push(round.item);
        flash = 1; shake = 1;
        speed = Math.max(130, speed - 30);
        burst(shipX, shipY - 30, '#ff6b81', 18);
        msg = { text: round.reveal, color: '#ffd34d', t: 1.6 };
      }
      speak(round.say);
      idx++;
      updateHud();
    }

    // ---------- drawing ----------
    function roundRect(x, y, w, hh, r) {
      g.beginPath(); g.moveTo(x + r, y); g.arcTo(x + w, y, x + w, y + hh, r); g.arcTo(x + w, y + hh, x, y + hh, r);
      g.arcTo(x, y + hh, x, y, r); g.arcTo(x, y, x + w, y, r); g.closePath();
    }
    function drawShip(x, y, t) {
      g.save(); g.translate(x, y);
      // flame
      const fl = 18 + Math.sin(t / 40) * 6;
      const grad = g.createLinearGradient(0, 22, 0, 22 + fl * 2);
      grad.addColorStop(0, '#fff6a8'); grad.addColorStop(0.4, '#ffb03b'); grad.addColorStop(1, 'rgba(255,80,40,0)');
      g.fillStyle = grad; g.beginPath(); g.moveTo(-10, 22); g.quadraticCurveTo(0, 22 + fl * 2.2, 10, 22); g.fill();
      // fins
      g.fillStyle = '#ff5c8a';
      g.beginPath(); g.moveTo(-14, 6); g.lineTo(-28, 28); g.lineTo(-12, 22); g.fill();
      g.beginPath(); g.moveTo(14, 6); g.lineTo(28, 28); g.lineTo(12, 22); g.fill();
      // body
      const body = g.createLinearGradient(-16, 0, 16, 0);
      body.addColorStop(0, '#c9d2ff'); body.addColorStop(0.5, '#ffffff'); body.addColorStop(1, '#9aa6e8');
      g.fillStyle = body; g.beginPath(); g.moveTo(0, -38); g.bezierCurveTo(22, -20, 18, 18, 12, 26); g.lineTo(-12, 26); g.bezierCurveTo(-18, 18, -22, -20, 0, -38); g.fill();
      // window
      g.fillStyle = '#5ee7ff'; g.strokeStyle = '#3a2a9a'; g.lineWidth = 3;
      g.beginPath(); g.arc(0, -8, 8, 0, Math.PI * 2); g.fill(); g.stroke();
      g.restore();
    }
    function drawGate(y) {
      const gw = W / 3 - 18, gh = 58;
      for (let i = 0; i < 3; i++) {
        const x = laneX(i) - gw / 2;
        const glow = gate.resolved ? (i === round.right ? '#3ddc97' : (i === lane ? '#ff6b81' : null)) : null;
        g.save();
        g.shadowColor = glow || 'rgba(155,123,255,.7)'; g.shadowBlur = glow ? 26 : 16;
        const grad = g.createLinearGradient(0, y, 0, y + gh);
        grad.addColorStop(0, glow ? glow : 'rgba(255,255,255,.32)');
        grad.addColorStop(1, glow ? glow + 'aa' : 'rgba(120,100,255,.28)');
        g.fillStyle = grad; roundRect(x, y, gw, gh, 16); g.fill();
        g.shadowBlur = 0; g.strokeStyle = 'rgba(255,255,255,.55)'; g.lineWidth = 1.5; g.stroke();
        // text, shrunk to fit
        const text = round.answers[i];
        let fs = Math.min(26, W / 18);
        g.font = `900 ${fs}px Nunito, system-ui, sans-serif`;
        while (g.measureText(text).width > gw - 14 && fs > 11) { fs -= 1; g.font = `900 ${fs}px Nunito, system-ui, sans-serif`; }
        g.fillStyle = glow && i === round.right ? '#03341f' : '#fff';
        g.textAlign = 'center'; g.textBaseline = 'middle';
        g.fillText(text, laneX(i), y + gh / 2 + 1);
        g.restore();
      }
    }
    function frame(t) {
      if (!canvas.isConnected) { window.removeEventListener('resize', resize); document.removeEventListener('keydown', onKey); return; }
      const dt = Math.min(0.05, last ? (t - last) / 1000 : 0); last = t;
      g.clearRect(0, 0, W, H);
      g.save();
      if (shake > 0) { g.translate((Math.random() - 0.5) * 12 * shake, (Math.random() - 0.5) * 12 * shake); shake = Math.max(0, shake - dt * 3); }
      // road
      const road = g.createLinearGradient(0, 0, 0, H);
      road.addColorStop(0, 'rgba(20,10,60,.25)'); road.addColorStop(1, 'rgba(40,20,120,.45)');
      g.fillStyle = road; g.fillRect(0, 0, W, H);
      // moving stars
      for (const s of stars) {
        if (running) s.y += (speed * s.z * dt) / H;
        if (s.y > 1) { s.y -= 1; s.x = Math.random(); }
        g.globalAlpha = 0.4 + s.z * 0.6; g.fillStyle = '#fff';
        g.fillRect(s.x * W, s.y * H, 1.5 * s.z, 4 * s.z + speed / 120);
      }
      g.globalAlpha = 1;
      // lane lines
      g.strokeStyle = 'rgba(255,255,255,.12)'; g.setLineDash([14, 18]); g.lineDashOffset = -(t / 1000) * speed;
      for (const i of [1, 2]) { g.beginPath(); g.moveTo(W * i / 3, 0); g.lineTo(W * i / 3, H); g.stroke(); }
      g.setLineDash([]);
      // gate
      const shipY = H - 90;
      if (gate && running) {
        gate.y += speed * dt;
        if (!gate.resolved && gate.y + 58 >= shipY - 40) resolve();
        if (gate.y > H + 20) { gate = null; nextGate(); }
      }
      if (gate) drawGate(gate.y);
      // ship
      shipX += (laneX(lane) - shipX) * Math.min(1, dt * 14);
      drawShip(shipX, shipY, t);
      // particles
      particles = particles.filter(p => p.life > 0);
      for (const p of particles) {
        p.x += p.vx * dt; p.y += p.vy * dt; p.vy += 300 * dt; p.life -= dt * 1.4;
        g.globalAlpha = Math.max(0, p.life); g.fillStyle = p.color;
        g.beginPath(); g.arc(p.x, p.y, 3, 0, Math.PI * 2); g.fill();
      }
      g.globalAlpha = 1;
      g.restore();
      // red flash
      if (flash > 0) { g.fillStyle = `rgba(255,60,90,${flash * 0.35})`; g.fillRect(0, 0, W, H); flash = Math.max(0, flash - dt * 2.5); }
      // message
      if (msg) {
        g.globalAlpha = Math.min(1, msg.t * 2);
        g.font = `900 ${Math.min(30, W / 16)}px Nunito, system-ui, sans-serif`;
        g.textAlign = 'center'; g.fillStyle = msg.color;
        g.shadowColor = 'rgba(0,0,0,.6)'; g.shadowBlur = 10;
        g.fillText(msg.text, W / 2, H * 0.42);
        g.shadowBlur = 0; g.globalAlpha = 1;
        msg.t -= dt; if (msg.t <= 0) msg = null;
      }
      requestAnimationFrame(frame);
    }

    // ---------- controls ----------
    function onKey(e) {
      if (!canvas.isConnected) return;
      if (['ArrowLeft', 'a', 'A', 'ф', 'Ф'].includes(e.key)) { e.preventDefault(); move(-1); }
      else if (['ArrowRight', 'd', 'D', 'в', 'В'].includes(e.key)) { e.preventDefault(); move(1); }
      else if (['1', '2', '3'].includes(e.key)) goLane(Number(e.key) - 1);
      else if ((e.key === ' ' || e.key === 'Enter') && !running && !over) { e.preventDefault(); start(); }
    }
    document.addEventListener('keydown', onKey);
    left.addEventListener('pointerdown', (e) => { e.preventDefault(); move(-1); });
    right.addEventListener('pointerdown', (e) => { e.preventDefault(); move(1); });
    // tap a lane, or swipe
    let sx = null;
    canvas.addEventListener('pointerdown', (e) => { sx = e.clientX; });
    canvas.addEventListener('pointerup', (e) => {
      if (sx === null) return;
      const dx = e.clientX - sx; sx = null;
      if (Math.abs(dx) > 30) move(dx > 0 ? 1 : -1);
      else { const r = canvas.getBoundingClientRect(); goLane(Math.max(0, Math.min(2, Math.floor((e.clientX - r.left) / (r.width / 3))))); }
    });

    // ---------- start / end ----------
    function start() {
      // scroll so the game sits right under the top bar, then fit it to the screen
      const box = rnBox();
      if (box) {
        const topbar = (document.querySelector('.topbar') || {}).offsetHeight || 70;
        window.scrollTo({ top: box.getBoundingClientRect().top + window.scrollY - topbar - 6, behavior: 'smooth' });
      }
      resize();
      overlay.innerHTML = '';
      let n = 3;
      const tick = () => {
        overlay.innerHTML = '';
        if (n === 0) { overlay.hidden = true; running = true; nextGate(); return; }
        overlay.append(h('div', { class: 'rn-count' }, String(n)));
        n--; setTimeout(tick, 650);
      };
      tick();
    }
    function end() {
      running = false; over = true;
      overlay.hidden = false; overlay.innerHTML = '';
      overlay.append(h('div', { class: 'rn-count small' }, lives > 0 ? '🏁 Finish!' : '💥 Game over'), h('div', { class: 'rn-score' }, `⭐ ${score} · best combo x${bestCombo}`));
      setTimeout(() => ctx.finish(correct, total, mistakes), 1600);
    }
    overlay.append(
      h('div', { class: 'rn-title' }, '🚀 Ready?'),
      h('p', {}, 'Fly into the right answer! ◀ ▶ / swipe / tap a lane'),
      h('button', { class: 'primary', onclick: start }, '▶ Start'));
    updateHud();
    banner.append(h('span', { class: 'rn-word' }, '…'));
    requestAnimationFrame(frame);
  }

  games.vrunner = {
    title: 'Verb Runner', icon: '🚀', desc: 'Fly into the right verb form. Do not crash!',
    available: u => (u.verbs || []).length >= 2,
    items: u => shuffle(u.verbs.flatMap(v => [{ v, f: 'v2' }, { v, f: 'v3' }])).slice(0, 16)
      .map(x => Object.assign({ en: `${x.v.base} (${x.f.toUpperCase()})` }, x)),
    run(ctx, items) { runGame(ctx, items, (x) => verbRound(x, ctx.unit.verbs)); },
  };
  games.wrunner = {
    title: 'Word Runner', icon: '🚀', desc: 'Look at the picture and fly into the right word.',
    available: u => (u.vocab || []).length >= 3,
    items: u => sample(u.vocab, Math.min(14, u.vocab.length)),
    run(ctx, items) { runGame(ctx, items, (w) => wordRound(w, ctx.unit.vocab)); },
  };
})();
