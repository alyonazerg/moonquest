// More games built from any material: Odd one out, Matching, Sort it!, Whack, Fill the gaps.
(function () {
  const { h, shuffle, sample, speak, norm, games } = MQ;
  const { runRounds, optionButtons, onKeys } = MQ.gameKit;
  const ru = (w) => w.ru || '';

  // vocabulary groups (from the unit data: group: 'Days of the week' …)
  function groupsOf(u) {
    const m = new Map();
    (u.vocab || []).forEach(w => { if (w.group) { if (!m.has(w.group)) m.set(w.group, []); m.get(w.group).push(w); } });
    return [...m.entries()].map(([name, items]) => ({ name, items })).filter(g => g.items.length >= 2);
  }
  const fake = (b) => /e$/.test(b) ? b + 'd' : /[^aeiou]y$/.test(b) ? b.slice(0, -1) + 'ied' : b + 'ed';
  const pastVerbs = (u) => (u.verbs || []).filter(v => v.v2 !== v.base && !v.v2.includes('/'));

  // ======================= Odd one out =======================
  function oddRounds(u) {
    const out = [];
    const gs = groupsOf(u);
    const big = gs.filter(g => g.items.length >= 3);
    if (gs.length >= 2 && big.length) {
      for (let i = 0; i < 8; i++) {
        const A = big[Math.floor(Math.random() * big.length)];
        const B = shuffle(gs.filter(g => g !== A))[0];
        const odd = sample(B.items, 1)[0];
        out.push({ en: odd.en, options: shuffle([...sample(A.items, 3), odd]).map(w => w.en), answer: odd.en,
          why: `“${odd.en}” is from “${B.name}”. The others are “${A.name}”.` });
      }
    }
    const pv = pastVerbs(u);
    if (pv.length >= 4) {
      for (let i = 0; i < 6; i++) {
        const [a, b2, c, d] = sample(pv, 4);
        if (i % 2 === 0) out.push({ en: d.base, options: shuffle([a.v2, b2.v2, c.v2, d.base]), answer: d.base, why: `“${d.base}” is not Past Simple (${d.base} → ${d.v2}). The others are Past Simple.` });
        else out.push({ en: d.v2, options: shuffle([a.base, b2.base, c.base, d.v2]), answer: d.v2, why: `“${d.v2}” is Past Simple (${d.base} → ${d.v2}). The others are the first form.` });
      }
    }
    return shuffle(out).slice(0, 8);
  }
  games.odd = {
    title: 'Odd one out', icon: '🔍', desc: 'Three words go together. Find the one that does not!',
    available: u => oddRounds(u).length >= 4,
    items: u => oddRounds(u),
    run(ctx, items) {
      runRounds(ctx, items, (r, body, answer) => {
        body.append(h('div', { class: 'prompt' }, 'Which one is different?'),
          optionButtons(r.options.map(o => ({ value: o, label: o })), { value: r.answer }, (ok, msg) => { speak(r.answer); answer(ok, msg); }, '💡 ' + r.why));
        return { answerText: r.answer + ' — ' + r.why };
      });
    },
  };

  // ======================= Matching (two columns with lines) =======================
  function matchPairs(u) {
    const vocab = (u.vocab || []).filter(w => w.ru).map(w => ({ en: w.en, left: w.en, right: ru(w), pic: w, item: w }));
    const verbs = (u.verbs || []).map(v => ({ en: v.base, left: v.base, right: `${v.v2} – ${v.v3}`, item: v }));
    return shuffle(vocab.length >= 4 ? vocab : verbs).slice(0, 15);
  }
  games.match = {
    title: 'Matching', icon: '🔗', desc: 'Connect each word with its pair. Click left, then right.',
    available: u => matchPairs(u).length >= 4,
    items: u => matchPairs(u),
    run(ctx, items) {
      const rounds = [];
      for (let i = 0; i < items.length; i += 5) rounds.push(items.slice(i, i + 5));
      if (rounds.length > 1 && rounds[rounds.length - 1].length < 3) rounds[rounds.length - 2].push(...rounds.pop());
      let ri = 0, correct = 0;
      const mistakes = [];
      const wrap = h('div');
      ctx.root.append(wrap);
      function round() {
        if (ri >= rounds.length) return ctx.finish(correct, items.length, mistakes);
        const pairs = rounds[ri];
        const wrongOnce = new Set();
        let sel = null, done = 0;
        wrap.innerHTML = '';
        const box = h('div', { class: 'mt' });
        const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
        svg.setAttribute('class', 'mt-lines');
        const L = h('div', { class: 'mt-col' }), R = h('div', { class: 'mt-col' });
        const lines = [];
        const mk = (p, side, k) => {
          const b = h('button', { class: 'mt-item', onclick: () => pick(b) },
            h('span', { class: 'key-badge' }, side === 'L' ? String(k + 1) : 'abcdef'[k]),
            side === 'R' && p.pic && (p.pic.pic || p.pic.img) ? MQ.pic(p.pic, 'mt-pic') : null,
            h('span', {}, side === 'L' ? p.left : p.right));
          b.pair = p; b.side = side;
          return b;
        };
        const leftBtns = pairs.map((p, k) => mk(p, 'L', k));
        const rightBtns = shuffle(pairs).map((p, k) => mk(p, 'R', k));
        L.append(...leftBtns); R.append(...rightBtns);
        box.append(svg, L, R);
        function pick(b) {
          if (b.disabled) return;
          if (!sel || sel.side === b.side) {
            if (sel) sel.classList.remove('sel');
            sel = b; b.classList.add('sel');
            if (b.side === 'L') speak(b.pair.left);
            return;
          }
          const a = sel; sel = null; a.classList.remove('sel');
          const lb = a.side === 'L' ? a : b, rb = a.side === 'L' ? b : a;
          if (lb.pair === rb.pair) {
            lb.disabled = rb.disabled = true;
            lb.classList.add('ok'); rb.classList.add('ok');
            lines.push([lb, rb]); draw();
            MQ.sfx.good(); speak(lb.pair.left);
            if (!wrongOnce.has(lb.pair)) correct++;
            if (++done === pairs.length) setTimeout(() => { ri++; round(); }, 700);
          } else {
            MQ.sfx.bad();
            [lb, rb].forEach(x => { x.classList.add('bad'); setTimeout(() => x.classList.remove('bad'), 500); });
            if (!wrongOnce.has(lb.pair)) { wrongOnce.add(lb.pair); mistakes.push(lb.pair.item); }
          }
        }
        function draw() {
          const r0 = box.getBoundingClientRect();
          svg.setAttribute('width', r0.width); svg.setAttribute('height', r0.height);
          svg.innerHTML = lines.map(([a, b]) => {
            const ra = a.getBoundingClientRect(), rb = b.getBoundingClientRect();
            const x1 = ra.right - r0.left, y1 = ra.top + ra.height / 2 - r0.top, x2 = rb.left - r0.left, y2 = rb.top + rb.height / 2 - r0.top;
            return `<path d="M${x1} ${y1} C ${(x1 + x2) / 2} ${y1}, ${(x1 + x2) / 2} ${y2}, ${x2} ${y2}" />`;
          }).join('');
        }
        window.addEventListener('resize', draw);
        onKeys(box, (e) => {
          const k = Number(e.key) - 1;
          if (k >= 0 && k < leftBtns.length) return pick(leftBtns[k]);
          const j = 'abcdef'.indexOf(e.key.toLowerCase());
          if (j >= 0 && j < rightBtns.length) pick(rightBtns[j]);
        });
        wrap.append(h('div', { class: 'row space muted' }, h('span', {}, `Round ${ri + 1} / ${rounds.length}`), h('span', {}, `✔ ${correct}`)), box,
          h('div', { class: 'hint kb-hint' }, '⌨️ Keys: 1–5 for the left column, a–e for the right one'));
      }
      round();
    },
  };

  // ======================= Sort it! (baskets) =======================
  function sortModes(u) {
    const modes = [];
    const gs = groupsOf(u).filter(g => g.items.length >= 3).sort((a, b) => b.items.length - a.items.length);
    if (gs.length >= 2) {
      const pick = gs.slice(0, Math.min(3, gs.length));
      modes.push({ baskets: pick.map(g => g.name), cards: shuffle(pick.flatMap(g => sample(g.items, 4).map(w => ({ text: w.en, pic: w, basket: g.name, item: w })))) });
    }
    const pv = pastVerbs(u);
    if (pv.length >= 3) {
      modes.push({ baskets: ['V1 · now', 'V2 · past'], cards: shuffle(sample(pv, 6).flatMap(v => [
        { text: v.base, basket: 'V1 · now', item: v }, { text: v.v2, basket: 'V2 · past', item: Object.assign({ en: `${v.base} – ${v.v2}` }, v) }])).slice(0, 12) });
    }
    const gi = (u.grammar || []).flatMap(g => g.items).filter(it => it.options && it.options.length > 1 && it.q.includes(' '));
    if (gi.length >= 4) {
      modes.push({ baskets: ['✔ Correct', '✘ Mistake'], cards: shuffle(sample(gi, 10).map((it, k) => {
        const good = k % 2 === 0;
        const word = good ? it.a : it.options.find(o => o !== it.a);
        return { text: it.q.replace('___', word), basket: good ? '✔ Correct' : '✘ Mistake', item: Object.assign({ en: it.q.replace('___', it.a) }, it) };
      })) });
    }
    const vocab = (u.vocab || []).filter(w => w.ru);
    if (vocab.length >= 4) {
      modes.push({ baskets: ['✔ Right translation', '✘ Wrong translation'], cards: shuffle(sample(vocab, 10).map((w, k) => {
        const good = k % 2 === 0;
        const other = good ? w : sample(vocab.filter(x => x !== w), 1)[0];
        return { text: `${w.en} = ${other.ru}`, basket: good ? '✔ Right translation' : '✘ Wrong translation', item: w };
      })) });
    }
    return modes;
  }
  games.sort = {
    title: 'Sort it!', icon: '🗂️', desc: 'Send every word into the right basket.',
    available: u => sortModes(u).length > 0,
    items: u => { const m = shuffle(sortModes(u))[0]; return m.cards.map(c => Object.assign({ baskets: m.baskets }, c)); },
    run(ctx, items) {
      const baskets = items[0].baskets;
      const counts = Object.fromEntries(baskets.map(b => [b, 0]));
      let i = 0, correct = 0;
      const mistakes = [];
      const magic = MQ.isMagic();
      const card = h('div', { class: 'st-card' });
      const fb = h('div', { class: 'feedback' });
      const info = h('div', { class: 'row space muted' });
      const bins = baskets.map((b, k) => h('button', { class: 'st-bin', onclick: () => choose(k) },
        h('div', { class: 'st-bin-ico' }, magic ? ['🧪', '⚗️', '🫙'][k] : ['🛸', '🚀', '🛰️'][k]),
        h('div', { class: 'st-bin-name' }, b), h('div', { class: 'st-count' }, '0'), h('span', { class: 'key-badge' }, String(k + 1))));
      const binRow = h('div', { class: 'st-bins', style: `grid-template-columns: repeat(${baskets.length}, minmax(0,1fr))` }, ...bins);
      ctx.root.append(h('div', { class: 'st' }, info, card, fb, binRow, h('div', { class: 'hint kb-hint' }, `⌨️ Keys 1–${baskets.length} or ← →`)));
      let busy = false;
      function show() {
        if (i >= items.length) return ctx.finish(correct, items.length, mistakes);
        const it = items[i];
        info.innerHTML = ''; info.append(h('span', {}, `${i + 1} / ${items.length}`), h('span', {}, `✔ ${correct}`));
        card.className = 'st-card in';
        card.innerHTML = '';
        card.append(it.pic && (it.pic.pic || it.pic.img) && !baskets[0].startsWith('✔') ? MQ.pic(it.pic, 'st-pic') : null, h('div', { class: 'st-text' }, it.text));
        fb.textContent = ''; fb.className = 'feedback';
        busy = false;
      }
      function choose(k) {
        if (busy || i >= items.length) return;
        busy = true;
        const it = items[i];
        const ok = baskets[k] === it.basket;
        const right = baskets.indexOf(it.basket);
        card.className = 'st-card fly-' + (k === 0 ? 'left' : k === baskets.length - 1 ? 'right' : 'down');
        if (ok) { correct++; MQ.sfx.good(); fb.className = 'feedback good'; fb.textContent = '✔ ' + it.basket; }
        else { mistakes.push(it.item); MQ.sfx.bad(); fb.className = 'feedback bad'; fb.textContent = `✘ It goes to “${it.basket}”`; bins[right].classList.add('hint-bin'); }
        counts[it.basket]++;
        bins[right].querySelector('.st-count').textContent = String(counts[it.basket]);
        if (!it.text.includes('=')) speak(it.text.replace(/[✔✘]/g, ''));
        setTimeout(() => { bins.forEach(b => b.classList.remove('hint-bin')); i++; show(); }, ok ? 650 : 1500);
      }
      onKeys(card, (e) => {
        const k = Number(e.key) - 1;
        if (k >= 0 && k < baskets.length) choose(k);
        else if (e.key === 'ArrowLeft') choose(0);
        else if (e.key === 'ArrowRight') choose(baskets.length - 1);
      });
      show();
    },
  };

  // ======================= Whack (aliens / pixies pop out) =======================
  function whackTargets(u) {
    const pv = pastVerbs(u);
    const vocab = (u.vocab || []).filter(w => w.ru || w.pic);
    if (vocab.length >= 5) return sample(vocab, 10).map(w => ({ prompt: w, answer: w.en, pool: vocab.filter(x => x !== w).map(x => x.en), item: w }));
    if (pv.length >= 3) return sample(pv, Math.min(10, pv.length)).map(v => ({ promptText: `${v.base} → Past Simple`, answer: v.v2, say: MQ.formSay(v, 'v2'),
      pool: [v.base, fake(v.base), v.v3 !== v.v2 ? v.v3 : null, ...pv.filter(x => x !== v).map(x => x.v2)].filter(Boolean), item: Object.assign({ en: `${v.base} – ${v.v2}` }, v) }));
    return [];
  }
  games.whack = {
    title: 'Alien Whack', icon: '👾', desc: 'Words pop out of the craters. Hit only the right one, fast!',
    available: u => whackTargets(u).length >= 4,
    items: u => whackTargets(u),
    run(ctx, items) {
      const magic = MQ.isMagic();
      let ti = 0, hits = 0, time = 60, running = false, timer = null, spawnT = null;
      const mistakes = [], wrongFor = new Set();
      const prompt = h('div', { class: 'wh-prompt' });
      const hud = h('div', { class: 'rn-hud' });
      const holes = Array.from({ length: 9 }, (_, k) => {
        const mole = h('button', { class: 'wh-mole', tabindex: -1 }, h('span', { class: 'wh-face' }, magic ? '🧚' : '👾'), h('span', { class: 'wh-word' }));
        const hole = h('div', { class: 'wh-hole' + (magic ? ' cauldron' : '') }, h('span', { class: 'wh-num' }, String(k + 1)), mole);
        mole.addEventListener('pointerdown', (e) => { e.preventDefault(); hit(k); });
        return { hole, mole, word: null, until: 0 };
      });
      const overlay = h('div', { class: 'rn-overlay' },
        h('div', { class: 'rn-title' }, magic ? '🧚 Pixie Pop' : '👾 Alien Whack'),
        h('p', {}, 'Hit the word that matches. Tap it, or press its number 1–9.'),
        h('button', { class: 'primary', onclick: () => start() }, '▶ Start'));
      const field = h('div', { class: 'wh-field' }, ...holes.map(x => x.hole), overlay);
      ctx.root.append(h('div', { class: 'wh' }, hud, prompt, field));
      const cur = () => items[ti];
      function updHud() {
        hud.innerHTML = '';
        hud.append(h('span', {}, `⏱ ${time}s`), h('span', {}, `⭐ ${hits}`), h('span', {}, ''), h('span', {}, `${Math.min(ti + 1, items.length)} / ${items.length}`));
      }
      function setPrompt() {
        prompt.innerHTML = '';
        const t = cur();
        if (!t) return;
        if (t.prompt) prompt.append(MQ.pic(t.prompt, 'wh-pic'), h('span', {}, t.prompt.ru || ''));
        else prompt.append(h('span', {}, t.promptText));
      }
      function popOne() {
        if (!running) return;
        const free = holes.filter(x => !x.word);
        if (!free.length) return;
        const x = free[Math.floor(Math.random() * free.length)];
        const t = cur();
        const showing = holes.some(o => o.word === t.answer);
        x.word = !showing && Math.random() < 0.45 ? t.answer : sample(t.pool, 1)[0];
        x.mole.querySelector('.wh-word').textContent = x.word;
        x.mole.classList.remove('hit', 'miss'); x.mole.classList.add('up');
        const stay = Math.max(1100, 2000 - ti * 70);
        x.until = Date.now() + stay;
        setTimeout(() => { if (x.until <= Date.now() && x.word) { x.mole.classList.remove('up'); x.word = null; } }, stay);
      }
      function hit(k) {
        if (!running) return;
        const x = holes[k];
        if (!x.word) return;
        const t = cur();
        if (x.word === t.answer) {
          hits++; MQ.sfx.good(); speak(t.say || t.answer);
          x.mole.classList.add('hit');
          holes.forEach(o => { if (o !== x) { o.mole.classList.remove('up'); o.word = null; } });
          setTimeout(() => { x.mole.classList.remove('up'); x.word = null; }, 250);
          ti++;
          if (ti >= items.length) return end();
          setPrompt();
        } else {
          MQ.sfx.bad(); x.mole.classList.add('miss');
          if (!wrongFor.has(ti)) { wrongFor.add(ti); mistakes.push(t.item); }
          setTimeout(() => { x.mole.classList.remove('up'); x.word = null; }, 300);
        }
        updHud();
      }
      function start() {
        overlay.hidden = true; running = true; updHud(); setPrompt();
        spawnT = setInterval(() => { if (!field.isConnected) return stop(); popOne(); }, 650);
        timer = setInterval(() => { if (!field.isConnected) return stop(); time--; updHud(); if (time <= 0) end(); }, 1000);
        popOne();
      }
      function stop() { clearInterval(spawnT); clearInterval(timer); running = false; }
      function end() {
        stop();
        holes.forEach(o => { o.mole.classList.remove('up'); o.word = null; });
        for (let k = ti; k < items.length; k++) if (!wrongFor.has(k)) mistakes.push(items[k].item);
        overlay.hidden = false; overlay.innerHTML = '';
        overlay.append(h('div', { class: 'rn-count small' }, time > 0 ? '🏁 Done!' : '⏱ Time is up!'), h('div', { class: 'rn-score' }, `⭐ ${hits} / ${items.length}`));
        // a target counts only if it was hit without a wrong hit before it
        const clean = hits - [...wrongFor].filter(k => k < ti).length;
        setTimeout(() => ctx.finish(Math.max(0, clean), items.length, mistakes), 1500);
      }
      onKeys(field, (e) => { const k = Number(e.key) - 1; if (k >= 0 && k < 9) { e.preventDefault(); hit(k); } else if ((e.key === ' ' || e.key === 'Enter') && !running && !overlay.hidden && ti === 0) { e.preventDefault(); start(); } });
      updHud();
    },
  };

  // ======================= Fill the gaps (word bank) =======================
  function gapItems(u) {
    return (u.grammar || []).flatMap(g => g.items).filter(it => it.q.includes('___') && it.q.length > 8);
  }
  games.gapfill = {
    title: 'Fill the gaps', icon: '📝', desc: 'Put the words from the box into the gaps, then press Check.',
    available: u => gapItems(u).length >= 4,
    items: u => sample(gapItems(u), 6),
    run(ctx, items) {
      const bank = shuffle([...items.map((it, k) => ({ w: it.a, k })),
        ...sample(items.flatMap(it => (it.options || []).filter(o => o !== it.a)), 2).map(w => ({ w, k: -1 }))]);
      const filled = items.map(() => null);
      let selGap = 0, checked = false;
      const bankBox = h('div', { class: 'gf-bank' });
      const list = h('ol', { class: 'gf-list' });
      const fb = h('div', { class: 'feedback' });
      const render = () => {
        bankBox.innerHTML = '';
        bank.forEach((b, j) => {
          const used = filled.includes(b);
          bankBox.append(h('button', { class: 'gf-word' + (used ? ' used' : ''), disabled: used || checked, onclick: () => put(b) }, b.w));
        });
        list.innerHTML = '';
        items.forEach((it, k) => {
          const [pre, ...rest] = it.q.split('___');
          const gap = h('button', { class: 'gf-gap' + (k === selGap && !checked ? ' sel' : '') + (checked ? (filled[k] && filled[k].w === it.a ? ' ok' : ' bad') : ''),
            onclick: () => { if (checked) return; if (filled[k]) { filled[k] = null; } selGap = k; render(); } }, filled[k] ? filled[k].w : '      ');
          list.append(h('li', {}, it.pic ? it.pic + ' ' : '', pre, gap, rest.join('___'),
            checked && !(filled[k] && filled[k].w === it.a) ? h('span', { class: 'gf-fix' }, ' → ' + it.a) : null));
        });
      };
      function put(b) {
        if (checked) return;
        let k = filled[selGap] ? filled.findIndex(f => !f) : selGap;
        if (k < 0) k = selGap;
        filled[k] = b;
        const next = filled.findIndex(f => !f);
        selGap = next >= 0 ? next : k;
        MQ.sfx.pop(); render();
      }
      const checkBtn = h('button', { class: 'primary', onclick: () => {
        if (checked) return;
        checked = true;
        const ok = items.filter((it, k) => filled[k] && filled[k].w === it.a).length;
        fb.className = 'feedback ' + (ok === items.length ? 'good' : 'soft');
        fb.textContent = `${ok} / ${items.length} correct`;
        MQ.sfx[ok === items.length ? 'win' : ok >= items.length / 2 ? 'good' : 'bad']();
        render();
        checkBtn.hidden = true; doneBtn.hidden = false;
        const mistakes = items.filter((it, k) => !(filled[k] && filled[k].w === it.a)).map(it => Object.assign({ en: it.q.replace('___', it.a) }, it));
        doneBtn.onclick = () => ctx.finish(ok, items.length, mistakes);
      } }, '✔ Check');
      const doneBtn = h('button', { class: 'primary', hidden: true }, 'Finish 🏁');
      ctx.root.append(h('div', { class: 'panel gf' }, h('div', { class: 'hint' }, 'Words:'), bankBox, list, fb, h('div', { class: 'row' }, checkBtn, doneBtn)));
      render();
    },
  };

})();
