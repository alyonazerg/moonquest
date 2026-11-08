// Word Blocks: letters fall from the sky, catch them in the right order to build the word.
// Wrong taps and missed letters turn into stones and pile up; every finished word clears
// the bottom row. Game over when the pile reaches the top.
(function () {
  const { h, shuffle, speak, games } = MQ;
  const COLS = 6;
  const ABC = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';

  games.blocks = {
    title: 'Word Blocks', icon: '🧱', desc: 'Catch the falling letters in the right order. Do not let the stones reach the top!',
    available: u => MQ.puzzleWords(u).length >= 3,
    items: u => MQ.puzzleWords(u, { max: 10 }),
    run(ctx, items) {
      const total = items.length;
      const slow = MQ.slow();
      let wi = 0, pos = 0, score = 0, solved = 0, speed = slow ? 38 : 55, over = false, running = false, last = 0, spawnT = 0;
      let wordHadMistake = false;
      const mistakes = [];
      const stack = Array(COLS).fill(0); // stones per column
      let falling = [], particles = [], flash = 0, msg = null;

      const hud = h('div', { class: 'rn-hud' });
      const clue = h('div', { class: 'bl-clue' });
      const slots = h('div', { class: 'bl-slots' });
      const canvas = h('canvas', { class: 'rn-canvas' });
      const overlay = h('div', { class: 'rn-overlay' });
      const stage = h('div', { class: 'rn-stage' }, canvas, overlay);
      ctx.root.append(h('div', { class: 'rn bl' }, hud, h('div', { class: 'rn-top' }, clue, slots), stage));
      const g = canvas.getContext('2d');
      let W = 0, H = 0, S = 0, ROWS = 10;

      function resize() {
        const w = Math.min(stage.clientWidth || 520, 560);
        const box = ctx.root.querySelector('.bl');
        const extra = box ? box.querySelector('.rn-hud').offsetHeight + box.querySelector('.rn-top').offsetHeight : 140;
        const topbar = (document.querySelector('.topbar') || {}).offsetHeight || 70;
        const fit = Math.max(260, window.innerHeight - topbar - extra - ((document.querySelector('.game-head') || {}).offsetHeight || 0) - 30);
        // square cells: as wide as possible, but at least 8 rows must fit in the height
        S = Math.floor(Math.min(w / COLS, fit / 8));
        W = S * COLS;
        ROWS = Math.max(7, Math.min(12, Math.floor(fit / S)));
        H = ROWS * S;
        const dpr = Math.min(window.devicePixelRatio || 1, 2);
        canvas.width = W * dpr; canvas.height = H * dpr;
        canvas.style.width = W + 'px'; canvas.style.height = H + 'px';
        stage.style.width = W + 'px'; stage.style.margin = '0 auto';
        g.setTransform(dpr, 0, 0, dpr, 0, 0);
      }
      resize(); requestAnimationFrame(resize);
      window.addEventListener('resize', resize);

      const word = () => items[wi];
      function updateTop() {
        hud.innerHTML = '';
        hud.append(h('span', {}, `🧱 ${Math.max(...stack)} / ${ROWS - 1}`), h('span', {}, `⭐ ${score}`), h('span', {}, ''), h('span', {}, `${Math.min(wi + 1, total)} / ${total}`));
        const x = word();
        clue.innerHTML = '';
        slots.innerHTML = '';
        if (!x) return;
        clue.append(x.pic && (x.pic.pic || x.pic.img) ? MQ.pic(x.pic, 'rn-pic') : null, h('span', { class: 'rn-word' }, x.clueText || '?'));
        x.answer.split('').forEach((ch, k) => slots.append(h('span', { class: 'bl-slot' + (k < pos ? ' on' : '') }, k < pos ? ch : '')));
      }

      function spawn() {
        const need = word().answer[pos];
        const free = [...Array(COLS).keys()].filter(c => !falling.some(b => b.col === c && b.y < S * 1.5));
        if (!free.length) return;
        const col = free[Math.floor(Math.random() * free.length)];
        const hasNeed = falling.some(b => b.letter === need);
        const letter = !hasNeed || Math.random() < 0.3 ? need : ABC[Math.floor(Math.random() * 26)];
        falling.push({ col, y: -S, letter });
      }
      function burst(x, y, color, n) {
        for (let i = 0; i < n; i++) {
          const a = Math.random() * Math.PI * 2, s = 60 + Math.random() * 180;
          particles.push({ x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s, life: 1, color });
        }
      }
      function addStone(col) {
        stack[col]++;
        if (stack[col] >= ROWS - 1) end(false);
      }
      function catchBlock(b) {
        if (!running) return;
        const need = word().answer[pos];
        falling = falling.filter(x => x !== b);
        const cx = b.col * S + S / 2;
        if (b.letter === need) {
          pos++;
          burst(cx, b.y + S / 2, '#8dffc8', 14);
          MQ.sfx.pop();
          if (pos >= word().answer.length) wordDone();
        } else {
          wordHadMistake = true;
          flash = 0.7;
          MQ.sfx.bad();
          burst(cx, b.y + S / 2, '#ff6b81', 10);
          msg = { text: `Next letter is not “${b.letter}”`, t: 1.1, color: '#ffd34d' };
          addStone(b.col);
        }
        updateTop();
      }
      function wordDone() {
        const x = word();
        solved += wordHadMistake ? 0 : 1;
        if (wordHadMistake) mistakes.push(x.item);
        score += 10 * x.answer.length;
        speak(x.say || x.shown);
        MQ.sfx.win();
        // reward: clear the bottom row of stones
        for (let c = 0; c < COLS; c++) if (stack[c] > 0) stack[c]--;
        msg = { text: '🎉 ' + x.shown, t: 1.3, color: '#8dffc8' };
        falling = [];
        wi++; pos = 0; wordHadMistake = false;
        if (!slow) speed = Math.min(150, speed + 9);
        if (wi >= total) return end(true);
        updateTop();
      }
      function end(win) {
        if (over) return;
        over = true; running = false;
        // words not reached count as not solved
        for (let k = wi; k < total; k++) if (!mistakes.includes(items[k].item)) mistakes.push(items[k].item);
        overlay.hidden = false; overlay.innerHTML = '';
        overlay.append(h('div', { class: 'rn-count small' }, win ? '🏁 Well done!' : '🧱 The stones won!'), h('div', { class: 'rn-score' }, `⭐ ${score}`));
        setTimeout(() => ctx.finish(solved, total, mistakes), 1600);
      }

      function rr(x, y, w, hh, r) {
        g.beginPath(); g.moveTo(x + r, y); g.arcTo(x + w, y, x + w, y + hh, r); g.arcTo(x + w, y + hh, x, y + hh, r);
        g.arcTo(x, y + hh, x, y, r); g.arcTo(x, y, x + w, y, r); g.closePath();
      }
      function block(x, y, letter, kind) {
        const p = 3;
        const grad = g.createLinearGradient(0, y, 0, y + S);
        const magic = MQ.isMagic();
        if (kind === 'stone') { grad.addColorStop(0, magic ? '#5a4a5e' : '#6d6aa8'); grad.addColorStop(1, magic ? '#2e2233' : '#3b386e'); }
        else if (magic) { grad.addColorStop(0, '#f2c96b'); grad.addColorStop(1, '#a05a2c'); }
        else { grad.addColorStop(0, '#a58bff'); grad.addColorStop(1, '#5b3fd6'); }
        g.save();
        g.shadowColor = kind === 'stone' ? 'rgba(0,0,0,.4)' : 'rgba(155,123,255,.8)'; g.shadowBlur = kind === 'stone' ? 4 : 14;
        g.fillStyle = grad; rr(x + p, y + p, S - p * 2, S - p * 2, 10); g.fill();
        g.shadowBlur = 0;
        g.strokeStyle = 'rgba(255,255,255,.45)'; g.lineWidth = 1.5; g.stroke();
        g.fillStyle = 'rgba(255,255,255,.22)'; rr(x + p + 3, y + p + 3, S - p * 2 - 6, (S - p * 2) * 0.35, 7); g.fill();
        if (letter) {
          g.fillStyle = '#fff'; g.font = `700 ${Math.floor(S * 0.5)}px Lexend, system-ui, sans-serif`;
          g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(letter, x + S / 2, y + S / 2 + 2);
        } else {
          g.fillStyle = 'rgba(255,255,255,.18)'; g.beginPath(); g.arc(x + S * 0.35, y + S * 0.6, S * 0.08, 0, 7); g.arc(x + S * 0.62, y + S * 0.45, S * 0.06, 0, 7); g.fill();
        }
        g.restore();
      }
      function frame(t) {
        if (!canvas.isConnected) { window.removeEventListener('resize', resize); document.removeEventListener('keydown', onKey); return; }
        const dt = Math.min(0.05, last ? (t - last) / 1000 : 0); last = t;
        g.clearRect(0, 0, W, H);
        const bg = g.createLinearGradient(0, 0, 0, H);
        bg.addColorStop(0, 'rgba(20,10,60,.3)'); bg.addColorStop(1, 'rgba(40,20,120,.5)');
        g.fillStyle = bg; g.fillRect(0, 0, W, H);
        g.strokeStyle = 'rgba(255,255,255,.06)';
        for (let c = 1; c < COLS; c++) { g.beginPath(); g.moveTo(c * S, 0); g.lineTo(c * S, H); g.stroke(); }
        // danger line
        g.strokeStyle = 'rgba(255,107,129,.5)'; g.setLineDash([8, 8]);
        g.beginPath(); g.moveTo(0, S); g.lineTo(W, S); g.stroke(); g.setLineDash([]);
        if (running) {
          spawnT -= dt;
          if (spawnT <= 0) { spawn(); spawnT = Math.max(0.55, 1.3 - speed / 200); }
          for (const b of falling.slice()) {
            b.y += speed * dt;
            const floor = H - stack[b.col] * S - S;
            if (b.y >= floor) {
              falling = falling.filter(x => x !== b);
              if (b.letter === word().answer[pos]) { addStone(b.col); msg = { text: `Missed “${b.letter}”!`, t: 1, color: '#ffd34d' }; wordHadMistake = true; updateTop(); }
              else burst(b.col * S + S / 2, floor + S / 2, 'rgba(255,255,255,.6)', 6);
            }
          }
        }
        for (let c = 0; c < COLS; c++) for (let r = 0; r < stack[c]; r++) block(c * S, H - (r + 1) * S, '', 'stone');
        for (const b of falling) block(b.col * S, b.y, b.letter, 'live');
        particles = particles.filter(p => p.life > 0);
        for (const p of particles) {
          p.x += p.vx * dt; p.y += p.vy * dt; p.vy += 260 * dt; p.life -= dt * 1.6;
          g.globalAlpha = Math.max(0, p.life); g.fillStyle = p.color; g.beginPath(); g.arc(p.x, p.y, 3, 0, 7); g.fill();
        }
        g.globalAlpha = 1;
        if (flash > 0) { g.fillStyle = `rgba(255,60,90,${flash * 0.3})`; g.fillRect(0, 0, W, H); flash = Math.max(0, flash - dt * 2.5); }
        if (msg) {
          g.globalAlpha = Math.min(1, msg.t * 2); g.fillStyle = msg.color;
          g.font = `700 ${Math.min(26, W / 16)}px Lexend, system-ui, sans-serif`; g.textAlign = 'center';
          g.shadowColor = 'rgba(0,0,0,.6)'; g.shadowBlur = 10; g.fillText(msg.text, W / 2, H * 0.4); g.shadowBlur = 0; g.globalAlpha = 1;
          msg.t -= dt; if (msg.t <= 0) msg = null;
        }
        if (running) updateHudOnly();
        requestAnimationFrame(frame);
      }
      let lastH = -1;
      function updateHudOnly() { const m = Math.max(...stack); if (m !== lastH) { lastH = m; const s = hud.firstChild; if (s) s.textContent = `🧱 ${m} / ${ROWS - 1}`; } }

      canvas.addEventListener('pointerdown', (e) => {
        const r = canvas.getBoundingClientRect();
        const x = (e.clientX - r.left) * (W / r.width), y = (e.clientY - r.top) * (H / r.height);
        const b = falling.find(b => x >= b.col * S && x < (b.col + 1) * S && y >= b.y - 6 && y < b.y + S + 6);
        if (b) catchBlock(b);
      });
      function onKey(e) {
        if (!canvas.isConnected) return;
        if ((e.key === ' ' || e.key === 'Enter') && !running && !over && !overlay.hidden) { e.preventDefault(); start(); return; }
        if (!running || !/^[a-z]$/i.test(e.key)) return;
        const L = e.key.toUpperCase();
        // the lowest falling block with this letter
        const b = falling.filter(x => x.letter === L).sort((a, b2) => b2.y - a.y)[0];
        if (b) catchBlock(b);
      }
      document.addEventListener('keydown', onKey);

      function start() {
        const box = ctx.root.querySelector('.bl');
        if (box) { const tb = (document.querySelector('.topbar') || {}).offsetHeight || 70; window.scrollTo({ top: box.getBoundingClientRect().top + window.scrollY - tb - 6, behavior: 'smooth' }); }
        resize();
        let n = 3;
        const tick = () => {
          overlay.innerHTML = '';
          if (n === 0) { overlay.hidden = true; running = true; spawnT = 0.3; return; }
          overlay.append(h('div', { class: 'rn-count' }, String(n))); n--; setTimeout(tick, 650);
        };
        tick();
      }
      overlay.append(
        h('div', { class: 'rn-title' }, MQ.isMagic() ? '🔮 Falling Runes' : '🧱 Word Blocks'),
        h('p', {}, 'Tap the falling letters (or type them) in the right order to build the word.'),
        h('button', { class: 'primary', onclick: start }, '▶ Start'));
      updateTop();
      requestAnimationFrame(frame);
    },
  };
})();
