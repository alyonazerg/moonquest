// Moonquest mini-games. Each game: { title, icon, desc, available(unit), items(unit), run(ctx, items) }
// ctx: { root, unit, finish(correct, total, mistakes), scoreboard(), score(ok) }
(function () {
  const { h, shuffle, sample, norm, speak } = MQ;
  const PRAISE = ['Great job! ⭐', 'Well done! 🚀', 'Super! 🌟', 'Yes! Correct! 🎉', 'Brilliant! ✨'];
  const praise = () => PRAISE[Math.floor(Math.random() * PRAISE.length)];

  const sayBtn = (text) => h('button', { class: 'chip', title: 'Listen', onclick: (e) => { e.stopPropagation(); speak(text); } }, '🔊');
  const bar = (part) => h('div', { class: 'progress' }, h('div', { style: `width:${Math.round(part * 100)}%` }));

  // Generic round-by-round runner used by most games.
  // renderRound(item, body, answer) must return { answerText } for the teacher "Show answer" button.
  function runRounds(ctx, items, renderRound) {
    let i = 0, correct = 0;
    const mistakes = [];
    const wrap = h('div');
    ctx.root.append(wrap);

    function step() {
      if (i >= items.length) return ctx.finish(correct, items.length, mistakes);
      wrap.innerHTML = '';
      const item = items[i];
      const fb = h('div', { class: 'feedback' });
      const nextBtn = h('button', { class: 'primary', onclick: () => { i++; step(); } }, i === items.length - 1 ? 'Finish 🏁' : 'Next ➜');
      nextBtn.hidden = true;
      let answered = false;
      const answer = (ok, msg) => {
        if (answered) return;
        answered = true;
        if (ok) correct++; else mistakes.push(item);
        ctx.score(ok);
        fb.className = 'feedback ' + (ok ? 'good' : 'bad');
        fb.textContent = ok ? praise() : msg;
        nextBtn.hidden = false;
        if (teacherBtn) teacherBtn.hidden = true;
        nextBtn.focus();
      };
      const body = h('div', { class: 'center' });
      const info = renderRound(item, body, answer) || {};
      const teacherBtn = MQ.settings.zoom && info.answerText
        ? h('button', { class: 'teacher', onclick: () => answer(false, 'Answer: ' + info.answerText) }, '👩‍🏫 Show answer')
        : null;
      wrap.append(
        ctx.scoreboard(),
        h('div', { class: 'row space muted' }, h('span', {}, `${i + 1} / ${items.length}`), h('span', {}, `✔ ${correct}`)),
        bar(i / items.length),
        h('div', { class: 'panel' }, body, fb, h('div', { class: 'row' }, teacherBtn, nextBtn)),
      );
    }
    step();
  }

  // Options buttons: marks right/wrong, calls answer().
  function optionButtons(options, right, answer, hint, cls) {
    const box = h('div', { class: 'options ' + (cls || '') });
    options.forEach((opt) => {
      const b = h('button', {
        onclick: () => {
          if (box.dataset.done) return;
          box.dataset.done = '1';
          const ok = opt.value === right.value;
          b.classList.add(ok ? 'right' : 'wrong');
          if (!ok) [...box.children].forEach((c, k) => { if (options[k].value === right.value) c.classList.add('right'); });
          answer(ok, hint || 'Look at the green answer.');
        },
      }, opt.label);
      box.append(b);
    });
    return box;
  }

  const hasPics = (vocab) => vocab.length > 0 && vocab.every(v => v.pic);

  const games = {};

  // ---------- 1. Word cards ----------
  games.flash = {
    title: 'Word cards', icon: '🃏', desc: 'Look, listen, say. Tap the card.',
    available: u => (u.vocab || []).length > 0,
    items: u => shuffle(u.vocab),
    run(ctx, items) {
      let queue = items.slice();
      let known = 0;
      const total = items.length;
      const mistakes = [];
      const wrap = h('div');
      ctx.root.append(wrap);
      function step() {
        if (!queue.length) return ctx.finish(total - mistakes.length, total, mistakes);
        const w = queue[0];
        let flipped = false;
        wrap.innerHTML = '';
        const back = h('div', { class: 'hint' });
        const card = h('div', {
          class: 'flash',
          onclick: () => {
            flipped = !flipped;
            back.textContent = flipped ? [w.ru, w.example].filter(Boolean).join(' · ') : 'Tap to turn over';
            if (flipped) speak(w.say || w.en);
          },
        },
        w.pic ? h('div', { class: 'emoji' }, w.pic) : null,
        h('div', { class: 'word' }, w.en),
        back);
        back.textContent = 'Tap to turn over';
        wrap.append(
          h('div', { class: 'row space muted' }, h('span', {}, `Words left: ${queue.length}`), h('span', {}, `I know: ${known} / ${total}`)),
          bar(known / total),
          card,
          h('div', { class: 'row', style: 'margin-top:14px' },
            sayBtn(w.say || w.en),
            h('button', { onclick: () => { queue.push(queue.shift()); if (!mistakes.includes(w)) mistakes.push(w); step(); } }, '🔁 Again later'),
            h('button', { class: 'primary', onclick: () => { queue.shift(); known++; step(); } }, '✅ I know it')),
        );
      }
      step();
    },
  };

  // ---------- 2. Listen and choose ----------
  games.listen = {
    title: 'Listen and choose', icon: '👂', desc: 'Listen to the word. Choose the answer.',
    available: u => (u.vocab || []).length >= 4,
    items: u => sample(u.vocab, Math.min(10, u.vocab.length)),
    run(ctx, items) {
      const vocab = ctx.unit.vocab;
      const pics = hasPics(vocab);
      const ru = !pics && vocab.every(v => v.ru);
      runRounds(ctx, items, (w, body, answer) => {
        const opts = shuffle([w, ...sample(vocab.filter(v => v !== w), 3)])
          .map(v => ({ value: v.en, label: pics ? v.pic : ru ? v.ru : v.en }));
        body.append(
          h('div', { class: 'prompt' }, 'Listen and choose!'),
          h('button', { class: 'primary', style: 'font-size:1.6em', onclick: () => speak(w.en) }, '🔊 Listen'),
          optionButtons(opts, { value: w.en }, answer, `It is “${w.en}”.`, pics ? 'pics' : ''),
        );
        setTimeout(() => speak(w.en), 300);
        return { answerText: w.en };
      });
    },
  };

  // ---------- 3. Find pairs (memory) ----------
  games.memory = {
    title: 'Find pairs', icon: '🧠', desc: 'Find the word and its pair.',
    available: u => (u.vocab || []).filter(v => v.pic || v.ru).length >= 4,
    items: u => sample(u.vocab.filter(v => v.pic || v.ru), 6),
    run(ctx, items) {
      // a card pair: picture (or translation) <-> English word
      const cards = shuffle(items.flatMap((w, k) => [
        { k, face: w.pairA ? h('span', {}, w.pairA) : w.pic ? h('span', { class: 'e' }, w.pic) : h('span', {}, w.ru), w },
        { k, face: h('span', {}, w.pairB || w.en), w },
      ]));
      let open = [], pairs = 0, tries = 0, lock = false;
      const mistakes = [];
      const info = h('div', { class: 'row space muted' });
      const sb = h('div');
      const updateInfo = () => { info.innerHTML = ''; info.append(h('span', {}, `Pairs: ${pairs} / ${items.length}`), h('span', {}, `Tries: ${tries}`)); sb.replaceChildren(ctx.scoreboard()); };
      const grid = h('div', { class: 'memory' });
      cards.forEach(c => {
        c.el = h('button', {
          class: 'mcard hidden',
          onclick: () => {
            if (lock || c.done || open.includes(c)) return;
            c.el.classList.remove('hidden');
            open.push(c);
            if (open.length < 2) return;
            tries++;
            const [a, b] = open;
            if (a.k === b.k) {
              a.done = b.done = true;
              a.el.classList.add('done'); b.el.classList.add('done');
              speak(a.w.say || a.w.en);
              pairs++; open = [];
              ctx.score(true, true);
              updateInfo();
              if (pairs === items.length) setTimeout(() => ctx.finish(items.length, Math.max(tries, items.length), mistakes), 700);
            } else {
              lock = true;
              [a, b].forEach(x => { if (!mistakes.includes(x.w)) mistakes.push(x.w); });
              ctx.score(false);
              setTimeout(() => { a.el.classList.add('hidden'); b.el.classList.add('hidden'); open = []; lock = false; updateInfo(); }, 900);
            }
          },
        }, c.face);
        grid.append(c.el);
      });
      updateInfo();
      ctx.root.append(sb, info, grid);
    },
  };

  // ---------- 4. Spell the word ----------
  games.spell = {
    title: 'Spell the word', icon: '🔤', desc: 'Put the letters in the right order.',
    available: u => (u.vocab || []).length > 0,
    items: u => sample(u.vocab, Math.min(8, u.vocab.length)),
    run(ctx, items) {
      runRounds(ctx, items, (w, body, answer) => {
        const target = w.target || w.en;
        const letters = shuffle(target.split('').map((ch, idx) => ({ ch, idx })));
        let picked = [];
        let hintsUsed = 0;
        const slots = h('div', { class: 'slots' });
        const tiles = h('div', { class: 'tiles' });
        const render = () => {
          slots.innerHTML = ''; tiles.innerHTML = '';
          picked.forEach((l, n) => slots.append(h('button', { onclick: () => { picked.splice(n, 1); render(); } }, l.ch === ' ' ? '␣' : l.ch)));
          letters.filter(l => !picked.includes(l)).forEach(l => tiles.append(h('button', { onclick: () => { picked.push(l); render(); check(); } }, l.ch === ' ' ? '␣' : l.ch)));
        };
        const check = () => {
          if (picked.length !== target.length) return;
          const word = picked.map(l => l.ch).join('');
          if (word === target) { speak(target); answer(hintsUsed < 2, hintsUsed < 2 ? '' : `Good! Next time try with fewer hints. It is “${target}”.`); }
          else { body.querySelector('.feedback-inline').textContent = 'Not yet. Try again! Tap a letter to take it back.'; }
        };
        const hintBtn = h('button', {
          onclick: () => {
            hintsUsed++;
            // keep the correct prefix, then add the next right letter
            let n = 0;
            while (n < picked.length && picked[n].ch === target[n]) n++;
            picked = picked.slice(0, n);
            const next = letters.find(l => l.ch === target[n] && !picked.includes(l));
            if (next) picked.push(next);
            render(); check();
          },
        }, '💡 Hint');
        body.append(
          w.pic ? h('div', { class: 'emoji' }, w.pic) : null,
          w.prompt || (!w.pic && w.ru) ? h('div', { class: 'prompt' }, w.prompt || w.ru) : null,
          h('div', { class: 'row' }, sayBtn(target), hintBtn),
          h('div', { class: 'hint' }, `The word has ${target.replace(/ /g, '').length} letters.`),
          slots, tiles,
          h('div', { class: 'hint feedback-inline' }),
        );
        render();
        return { answerText: target };
      });
    },
  };

  // ---------- 5. Choose the right word (grammar) ----------
  games.quiz = {
    title: 'Choose the right word', icon: '✏️', desc: 'Grammar practice. Choose the answer.',
    available: u => (u.grammar || []).some(g => g.items.length),
    items: u => shuffle(MQ.grammarItems(u)).slice(0, 12),
    run(ctx, items) {
      runRounds(ctx, items, (it, body, answer) => {
        const parts = it.q.split('___');
        const sentence = h('div', { class: 'prompt' }, parts[0], h('b', { style: 'color:var(--accent)' }, '___'), parts.slice(1).join('___'));
        body.append(
          h('div', { class: 'hint' }, '📘 ' + it.topic),
          it.pic ? h('div', { class: 'emoji' }, it.pic) : null,
          sentence,
          optionButtons(shuffle(it.options).map(o => ({ value: o, label: o })), { value: it.a }, (ok, msg) => {
            sentence.querySelector('b').textContent = it.a;
            speak(it.q.replace('___', it.a));
            answer(ok, msg);
          }, '💡 ' + (it.hint || it.rule)),
        );
        return { answerText: it.a };
      });
    },
  };

  // ---------- 6. Make a sentence ----------
  games.order = {
    title: 'Make a sentence', icon: '🧩', desc: 'Put the words in the right order.',
    available: u => (u.sentences || []).length > 0,
    items: u => sample(u.sentences, Math.min(8, u.sentences.length)),
    run(ctx, items) {
      runRounds(ctx, items, (s, body, answer) => {
        const words = s.en.replace(/([.?!])$/, ' $1').split(' ').filter(Boolean);
        const pool = shuffle(words.map((t, idx) => ({ t, idx })));
        let picked = [];
        let tries = 0;
        const slots = h('div', { class: 'slots' });
        const tiles = h('div', { class: 'tiles' });
        const msg = h('div', { class: 'hint' });
        const render = () => {
          slots.innerHTML = ''; tiles.innerHTML = '';
          picked.forEach((w, n) => slots.append(h('button', { onclick: () => { picked.splice(n, 1); render(); } }, w.t)));
          pool.filter(w => !picked.includes(w)).forEach(w => tiles.append(h('button', { onclick: () => { picked.push(w); render(); check(); } }, w.t)));
        };
        const check = () => {
          if (picked.length !== words.length) return;
          const built = picked.map(w => w.t).join(' ');
          if (norm(built) === norm(words.join(' '))) { speak(s.en); answer(tries === 0, `Good! It is: “${s.en}”`); }
          else { tries++; msg.textContent = 'Not yet. Tap a word to take it back and try again.'; }
        };
        body.append(
          s.pic ? h('div', { class: 'emoji' }, s.pic) : null,
          h('div', { class: 'row' }, h('span', { class: 'prompt' }, 'Make a sentence!'), sayBtn(s.en)),
          s.hint ? h('div', { class: 'hint' }, '💡 ' + s.hint) : null,
          slots, tiles, msg,
        );
        render();
        return { answerText: s.en };
      });
    },
  };

  MQ.grammarItems = (u, k) => (k == null ? u.grammar : [u.grammar[k]]).flatMap(g => g.items.map(it => Object.assign({ rule: g.rule, topic: g.title, en: it.q }, it)));
  MQ.games = games;
  MQ.gameKit = { runRounds, optionButtons, sayBtn, bar, praise };
})();
