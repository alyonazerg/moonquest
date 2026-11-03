// Word puzzles built from any material (textbook unit, teacher's set, student's own words):
// Crossword and Space Hangman.
(function () {
  const { h, shuffle, sample, speak, games } = MQ;

  // ---------- words from any unit / set ----------
  // -> [{ answer: 'APPLE', shown: 'apple', clue: [nodes], text: 'яблоко', item }]
  function puzzleWords(u, { letters = true, max = 12 } = {}) {
    const out = [];
    (u.vocab || []).forEach(w => out.push({
      shown: w.en, clueText: w.ru || '', pic: w, item: w,
    }));
    (u.verbs || []).forEach(v => {
      [['v2', 'Past Simple'], ['v3', 'Past Participle']].forEach(([f, name]) => {
        if (v[f].includes('/')) return;
        out.push({ shown: v[f], say: MQ.formSay(v, f), clueText: `${v.base} → ${name}`, item: Object.assign({ en: `${v.base} (${f.toUpperCase()})` }, v) });
      });
    });
    // unique answers
    const seen = new Set();
    return shuffle(out).filter(x => {
      x.answer = x.shown.toUpperCase().replace(/[’']/g, '');
      if (letters) x.answer = x.answer.replace(/\s+/g, '');
      const ok = letters ? /^[A-Z]{2,13}$/.test(x.answer) : /^[A-Z ]{2,24}$/.test(x.answer);
      if (!ok || seen.has(x.answer)) return false;
      seen.add(x.answer); return true;
    }).slice(0, max);
  }
  const clueNode = (x) => h('span', { class: 'clue' }, x.pic && (x.pic.pic || x.pic.img) ? MQ.pic(x.pic, 'clue-pic') : null, ' ', x.clueText || '');

  // ---------- crossword generator ----------
  function buildCrossword(words) {
    const N = 40, grid = Array.from({ length: N }, () => Array(N).fill(null));
    const placed = [];
    const at = (r, c) => (r >= 0 && c >= 0 && r < N && c < N ? grid[r][c] : null);
    function fits(word, r, c, dir) {
      const dr = dir === 'down' ? 1 : 0, dc = dir === 'across' ? 1 : 0;
      if (at(r - dr, c - dc) || at(r + dr * word.length, c + dc * word.length)) return -1;
      let cross = 0;
      for (let i = 0; i < word.length; i++) {
        const rr = r + dr * i, cc = c + dc * i;
        if (rr < 0 || cc < 0 || rr >= N || cc >= N) return -1;
        const cell = grid[rr][cc];
        if (cell) { if (cell !== word[i]) return -1; cross++; continue; }
        // no side neighbours for new letters
        if (at(rr + dc, cc + dr) || at(rr - dc, cc - dr)) return -1;
      }
      return cross;
    }
    function put(w, r, c, dir) {
      const dr = dir === 'down' ? 1 : 0, dc = dir === 'across' ? 1 : 0;
      for (let i = 0; i < w.answer.length; i++) grid[r + dr * i][c + dc * i] = w.answer[i];
      placed.push(Object.assign({ r, c, dir }, w));
    }
    const list = words.slice().sort((a, b) => b.answer.length - a.answer.length);
    if (!list.length) return null;
    put(list[0], Math.floor(N / 2), Math.floor((N - list[0].answer.length) / 2), 'across');
    for (const w of list.slice(1)) {
      let best = null;
      for (const p of placed) {
        for (let i = 0; i < p.answer.length; i++) {
          for (let j = 0; j < w.answer.length; j++) {
            if (p.answer[i] !== w.answer[j]) continue;
            const dir = p.dir === 'across' ? 'down' : 'across';
            const r = p.dir === 'across' ? p.r - j : p.r + i;
            const c = p.dir === 'across' ? p.c + i : p.c - j;
            const score = fits(w.answer, r, c, dir);
            if (score > 0 && (!best || score > best.score || (score === best.score && Math.random() < 0.3))) best = { r, c, dir, score };
          }
        }
      }
      if (best) put(w, best.r, best.c, best.dir);
    }
    // crop and number
    let r0 = N, c0 = N, r1 = 0, c1 = 0;
    placed.forEach(p => {
      const len = p.answer.length;
      r0 = Math.min(r0, p.r); c0 = Math.min(c0, p.c);
      r1 = Math.max(r1, p.dir === 'down' ? p.r + len - 1 : p.r); c1 = Math.max(c1, p.dir === 'across' ? p.c + len - 1 : p.c);
    });
    placed.forEach(p => { p.r -= r0; p.c -= c0; });
    placed.sort((a, b) => a.r - b.r || a.c - b.c);
    let num = 0; const nums = {};
    placed.forEach(p => { const k = p.r + ',' + p.c; if (!nums[k]) nums[k] = ++num; p.num = nums[k]; });
    return { rows: r1 - r0 + 1, cols: c1 - c0 + 1, words: placed, nums };
  }

  games.crossword = {
    title: 'Crossword', icon: '🧩', desc: 'Fill in the crossword. Look at the pictures and clues.',
    available: u => puzzleWords(u).length >= 4,
    items: u => puzzleWords(u, { max: 10 }),
    run(ctx, items) {
      const cw = buildCrossword(items.map(x => Object.assign({}, x)));
      const cells = {}; // "r,c" -> { input, letter, words: [] }
      cw.words.forEach(w => {
        for (let i = 0; i < w.answer.length; i++) {
          const r = w.r + (w.dir === 'down' ? i : 0), c = w.c + (w.dir === 'across' ? i : 0);
          const k = r + ',' + c;
          cells[k] = cells[k] || { letter: w.answer[i], words: [] };
          cells[k].words.push(w);
        }
      });
      let dir = 'across', active = null;
      const board = h('div', { class: 'cw-grid', style: `grid-template-columns: repeat(${cw.cols}, var(--cw))` });
      for (let r = 0; r < cw.rows; r++) for (let c = 0; c < cw.cols; c++) {
        const k = r + ',' + c, cell = cells[k];
        if (!cell) { board.append(h('div', { class: 'cw-empty' })); continue; }
        const inp = h('input', { class: 'cw-cell', maxlength: 1, autocomplete: 'off', autocapitalize: 'characters', spellcheck: 'false', 'aria-label': 'letter' });
        cell.input = inp; cell.r = r; cell.c = c;
        inp.addEventListener('focus', () => {
          if (!cell.words.some(w => w.dir === dir)) dir = cell.words[0].dir;
          highlight(cell.words.find(w => w.dir === dir));
          inp.select();
        });
        inp.addEventListener('click', () => {
          if (active && cell.words.length > 1 && document.activeElement === inp) { dir = dir === 'across' ? 'down' : 'across'; highlight(cell.words.find(w => w.dir === dir)); }
        });
        inp.addEventListener('input', () => {
          inp.value = inp.value.replace(/[^a-z]/gi, '').toUpperCase().slice(-1);
          inp.classList.remove('ok', 'bad');
          if (inp.value) step(cell, 1);
        });
        inp.addEventListener('keydown', (e) => {
          if (e.key === 'Backspace' && !inp.value) { e.preventDefault(); step(cell, -1, true); }
          else if (e.key === 'ArrowRight') { dir = 'across'; step(cell, 1); }
          else if (e.key === 'ArrowLeft') { dir = 'across'; step(cell, -1); }
          else if (e.key === 'ArrowDown') { dir = 'down'; step(cell, 1); }
          else if (e.key === 'ArrowUp') { dir = 'down'; step(cell, -1); }
        });
        board.append(h('div', { class: 'cw-box' }, cw.nums[k] ? h('span', { class: 'cw-num' }, cw.nums[k]) : null, inp));
      }
      function step(cell, d, erase) {
        const dr = dir === 'down' ? d : 0, dc = dir === 'across' ? d : 0;
        const next = cells[(cell.r + dr) + ',' + (cell.c + dc)];
        if (next) { next.input.focus(); if (erase) next.input.value = ''; }
      }
      const clueEls = new Map();
      function highlight(w) {
        active = w;
        Object.values(cells).forEach(c => c.input.parentNode.classList.toggle('hl', c.words.includes(w)));
        clueEls.forEach((el, ww) => el.classList.toggle('on', ww === w));
      }
      const clueList = (d, title) => h('div', { class: 'cw-clues' }, h('h3', {}, title),
        cw.words.filter(w => w.dir === d).map(w => {
          const el = h('button', { class: 'cw-clue', onclick: () => { dir = d; const f = cells[w.r + ',' + w.c]; f.input.focus(); } },
            h('b', {}, w.num + '. '), clueNode(w), h('span', { class: 'muted' }, ` (${w.answer.length})`));
          clueEls.set(w, el);
          return el;
        }));
      const msg = h('div', { class: 'feedback' });
      let hints = 0;
      const wordOk = (w) => w.answer.split('').every((ch, i) => {
        const r = w.r + (w.dir === 'down' ? i : 0), c = w.c + (w.dir === 'across' ? i : 0);
        return cells[r + ',' + c].input.value === ch;
      });
      function check(final) {
        let wrongCells = 0;
        Object.values(cells).forEach(c => {
          if (!c.input.value) return;
          const ok = c.input.value === c.letter;
          c.input.classList.toggle('ok', ok); c.input.classList.toggle('bad', !ok);
          if (!ok) wrongCells++;
        });
        const done = cw.words.filter(wordOk);
        if (done.length === cw.words.length) {
          msg.className = 'feedback good'; msg.textContent = 'You did it! 🎉'; MQ.sfx.win();
          setTimeout(() => ctx.finish(Math.max(0, cw.words.length - Math.floor(hints / 2)), cw.words.length, []), 900);
        } else if (final) {
          cw.words.forEach(w => w.answer.split('').forEach((ch, i) => {
            const c = cells[(w.r + (w.dir === 'down' ? i : 0)) + ',' + (w.c + (w.dir === 'across' ? i : 0))];
            if (c.input.value !== ch) { c.input.value = ch; c.input.classList.add('shown'); }
          }));
          const missed = cw.words.filter(w => !done.includes(w));
          setTimeout(() => ctx.finish(done.length, cw.words.length, missed.map(w => w.item)), 1500);
        } else {
          msg.className = 'feedback ' + (wrongCells ? 'bad' : 'good');
          MQ.sfx[wrongCells ? 'bad' : 'good']();
          msg.textContent = `Words ready: ${done.length} / ${cw.words.length}` + (wrongCells ? ` · red letters are wrong` : '');
        }
      }
      ctx.root.append(
        h('div', { class: 'cw' },
          h('div', { class: 'cw-board-wrap' }, board),
          h('div', { class: 'cw-side' }, clueList('across', '➡️ Across'), clueList('down', '⬇️ Down'))),
        msg,
        h('div', { class: 'row' },
          h('button', { onclick: () => {
            const target = active && !wordOk(active) ? active : cw.words.find(w => !wordOk(w));
            if (!target) return;
            for (let i = 0; i < target.answer.length; i++) {
              const c = cells[(target.r + (target.dir === 'down' ? i : 0)) + ',' + (target.c + (target.dir === 'across' ? i : 0))];
              if (c.input.value !== c.letter) { c.input.value = c.letter; c.input.classList.add('shown'); hints++; break; }
            }
          } }, '💡 Hint'),
          h('button', { class: 'primary', onclick: () => check(false) }, '✔ Check'),
          h('button', { class: 'ghost', onclick: () => check(true) }, "🏳 Show answers")),
      );
      // fit cell size to the width
      const fit = () => {
        const wrap = ctx.root.querySelector('.cw-board-wrap');
        if (!wrap) return;
        const size = Math.max(22, Math.min(46, Math.floor((wrap.clientWidth - 8 - 3 * (cw.cols - 1)) / cw.cols)));
        board.style.setProperty('--cw', size + 'px');
      };
      requestAnimationFrame(fit);
      window.addEventListener('resize', fit);
    },
  };

  // ---------- Space Hangman ----------
  const PARTS = 6;
  function rocketSvg() {
    // six parts disappear one by one: flame, left fin, right fin, window, nose, body
    return `<svg viewBox="0 0 120 170" class="hm-rocket" aria-hidden="true">
      <g class="p p6"><path d="M60 8 C82 30 84 92 76 122 L44 122 C36 92 38 30 60 8 Z" fill="url(#hb)"/></g>
      <g class="p p5"><path d="M60 8 C70 18 75 30 77 42 L43 42 C45 30 50 18 60 8 Z" fill="#ff5c8a"/></g>
      <g class="p p4"><circle cx="60" cy="68" r="13" fill="#5ee7ff" stroke="#3a2a9a" stroke-width="5"/></g>
      <g class="p p3"><path d="M76 92 L98 128 L76 118 Z" fill="#ff5c8a"/></g>
      <g class="p p2"><path d="M44 92 L22 128 L44 118 Z" fill="#ff5c8a"/></g>
      <g class="p p1 flame"><path d="M48 124 Q60 168 72 124 Z" fill="url(#hf)"/></g>
      <defs>
        <linearGradient id="hb" x1="0" x2="1"><stop offset="0" stop-color="#c9d2ff"/><stop offset=".5" stop-color="#fff"/><stop offset="1" stop-color="#9aa6e8"/></linearGradient>
        <linearGradient id="hf" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fff6a8"/><stop offset=".5" stop-color="#ffb03b"/><stop offset="1" stop-color="#ff5028" stop-opacity="0"/></linearGradient>
      </defs></svg>`;
  }
  games.hangman = {
    title: 'Space Hangman', icon: '🛸', desc: 'Guess the word letter by letter before the rocket falls apart!',
    available: u => puzzleWords(u, { letters: false }).length >= 3,
    items: u => puzzleWords(u, { letters: false, max: 6 }),
    run(ctx, items) {
      let i = 0, guessed = 0;
      const mistakes = [];
      const wrap = h('div');
      ctx.root.append(wrap);
      function round() {
        if (i >= items.length) { document.removeEventListener('keydown', onKey); return ctx.finish(guessed, items.length, mistakes); }
        const x = items[i];
        const used = new Set();
        let wrong = 0, over = false;
        wrap.innerHTML = '';
        const rocket = h('div', { class: 'hm-rocket-box' }); rocket.innerHTML = rocketSvg();
        const slots = h('div', { class: 'hm-word' });
        const info = h('div', { class: 'hm-info' });
        const keys = h('div', { class: 'hm-keys' });
        const fb = h('div', { class: 'feedback' });
        const next = h('button', { class: 'primary', hidden: true, onclick: () => { i++; round(); } }, i === items.length - 1 ? 'Finish 🏁' : 'Next ➜');
        const render = () => {
          slots.innerHTML = '';
          x.answer.split('').forEach(ch => slots.append(ch === ' '
            ? h('span', { class: 'hm-gap' })
            : h('span', { class: 'hm-slot' + (used.has(ch) || over ? ' open' : '') + (over && !used.has(ch) ? ' missed' : '') }, used.has(ch) || over ? ch : '')));
          info.textContent = `Lives: ${'🚀'.repeat(PARTS - wrong)}${'·'.repeat(wrong)}`;
          for (let k = 1; k <= PARTS; k++) rocket.querySelector('.p' + k).classList.toggle('gone', k <= wrong);
        };
        const press = (ch) => {
          if (over || used.has(ch)) return;
          used.add(ch);
          const b = keys.querySelector(`[data-k="${ch}"]`);
          if (x.answer.includes(ch)) { if (b) b.classList.add('right'); MQ.sfx.pop(); }
          else { wrong++; MQ.sfx.bad(); if (b) b.classList.add('wrong'); rocket.classList.remove('shake'); void rocket.offsetWidth; rocket.classList.add('shake'); }
          const win = x.answer.replace(/ /g, '').split('').every(c => used.has(c));
          if (win || wrong >= PARTS) {
            over = true;
            if (win) { guessed++; fb.className = 'feedback good'; fb.textContent = 'Yes! 🎉 ' + x.shown; rocket.classList.add('launch'); MQ.sfx.win(); }
            else { mistakes.push(x.item); fb.className = 'feedback bad'; fb.textContent = 'The word was: ' + x.shown; }
            speak(x.say || x.shown);
            next.hidden = false; next.focus();
          }
          render();
        };
        'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('').forEach(ch => keys.append(h('button', { class: 'hm-key', 'data-k': ch, onclick: () => press(ch) }, ch)));
        handler = press;
        wrap.append(
          h('div', { class: 'row space muted' }, h('span', {}, `${i + 1} / ${items.length}`), h('span', {}, `✔ ${guessed}`)),
          h('div', { class: 'panel hm' },
            h('div', { class: 'hm-top' }, rocket, h('div', { class: 'hm-clue' }, clueNode(x), info)),
            slots, fb, keys, h('div', { class: 'row', style: 'margin-top:12px' }, next)));
        render();
      }
      let handler = null;
      function onKey(e) {
        if (!wrap.isConnected) { document.removeEventListener('keydown', onKey); return; }
        if (/^[a-z]$/i.test(e.key) && handler) handler(e.key.toUpperCase());
      }
      document.addEventListener('keydown', onKey);
      round();
    },
  };

  MQ.puzzleWords = puzzleWords;
})();
