// Moonquest mini-games. Each game: { title, icon, desc, available(unit), items(unit), run(ctx, items) }
// ctx: { root, unit, finish(correct, total, mistakes) }
(function () {
  const { h, shuffle, sample, norm, speak } = MQ;
  const PRAISE = ['Great job! ⭐', 'Well done! 🚀', 'Super! 🌟', 'Yes! Correct! 🎉', 'Brilliant! ✨'];
  const MAGIC_PRAISE = ['Magical! ✨', 'Brilliant spell! 🪄', 'Wonderful, young wizard! 🧙', 'Yes! Ten points! 🏆', 'Perfect potion! 🧪'];
  const WOODS_PRAISE = ['Mystery solved! 🔍', 'Great detective work! 🔦', 'You cracked the code! 🗝️', 'Yes! Another clue! 📓', 'Awesome, explorer! 🌲'];
  const praise = () => { const l = MQ.isMagic() ? MAGIC_PRAISE : MQ.isWoods() ? WOODS_PRAISE : PRAISE; return l[Math.floor(Math.random() * l.length)]; };

  const sayBtn = (text) => h('button', { class: 'chip', title: 'Listen', onclick: (e) => { e.stopPropagation(); speak(text); } }, '🔊');
  const bar = (part) => h('div', { class: 'progress' }, h('div', { style: `width:${Math.round(part * 100)}%` }));

  // Generic round-by-round runner used by most games.
  // renderRound(item, body, answer) returns { answerText } for the "I don't know" button.
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
      // ok: right first time · soft: right in the end (after tries / hints) · otherwise wrong.
      // "soft" is shown in yellow with a gentle sound, but the item still goes to "practise mistakes".
      const answer = (ok, msg, soft) => {
        if (answered) return;
        answered = true;
        if (ok) correct++; else mistakes.push(item);
        MQ.sfx[ok ? 'good' : soft ? 'pop' : 'bad']();
        fb.className = 'feedback ' + (ok ? 'good' : soft ? 'soft' : 'bad');
        fb.textContent = ok ? praise() : msg;
        nextBtn.hidden = false;
        if (dunnoBtn) dunnoBtn.hidden = true;
        nextBtn.focus();
      };
      const body = h('div', { class: 'center' });
      const info = renderRound(item, body, answer) || {};
      const dunnoBtn = info.answerText
        ? h('button', { class: 'ghost', onclick: () => { answer(false, 'Answer: ' + info.answerText + (info.why ? '  ·  💡 ' + info.why : '')); if (info.onReveal) info.onReveal(); } }, "🤷 I don't know")
        : null;
      wrap.append(
        h('div', { class: 'row space muted' }, h('span', {}, `${i + 1} / ${items.length}`), h('span', {}, `✔ ${correct}`)),
        bar(i / items.length),
        h('div', { class: 'panel' }, body, fb, h('div', { class: 'row' }, dunnoBtn, nextBtn)),
      );
    }
    step();
  }

  // Keyboard handler that works while `el` is on the page (removed automatically afterwards).
  // Keys typed into a text field are left alone unless allowInputs is set.
  function onKeys(el, handler, allowInputs) {
    const fn = (e) => {
      if (!el.isConnected) { document.removeEventListener('keydown', fn); return; }
      if (!allowInputs && e.target.closest && e.target.closest('input, textarea, select')) return;
      if (e.ctrlKey || e.metaKey || e.altKey) return;
      handler(e);
    };
    setTimeout(() => document.addEventListener('keydown', fn), 0);
  }
  const typeField = (placeholder) => h('input', {
    class: 'field type-answer', placeholder, autocomplete: 'off', autocapitalize: 'off', spellcheck: 'false',
  });

  // Options buttons: marks right/wrong, calls answer().
  // Keyboard: 1–4 choose an option; with `typing`, the answer can also be typed (Enter).
  function optionButtons(options, right, answer, hint, cls, typing) {
    const box = h('div', { class: 'options ' + (cls || '') });
    const buttons = [];
    const choose = (k) => {
      if (box.dataset.done) return;
      box.dataset.done = '1';
      const ok = options[k].value === right.value;
      buttons[k].classList.add(ok ? 'right' : 'wrong');
      if (!ok) buttons.forEach((c, j) => { if (options[j].value === right.value) c.classList.add('right'); });
      if (input) input.disabled = true;
      answer(ok, hint || 'Look at the green answer.');
    };
    options.forEach((opt, k) => {
      const b = h('button', { onclick: () => choose(k) }, h('span', { class: 'key-badge' }, String(k + 1)), opt.label);
      buttons.push(b);
      box.append(b);
    });
    let input = null;
    if (typing) {
      input = typeField('⌨️ …or type it');
      input.addEventListener('keydown', (e) => {
        if (e.key !== 'Enter' || !input.value.trim()) return;
        e.preventDefault();
        const k = options.findIndex(o => norm(o.value) === norm(input.value));
        if (k >= 0) return choose(k);
        // typed something that is not an option: show the right one
        box.dataset.done = '1'; input.disabled = true;
        input.classList.add('bad');
        buttons.forEach((c, j) => { if (options[j].value === right.value) c.classList.add('right'); });
        answer(false, hint || 'Look at the green answer.');
      });
    }
    onKeys(box, (e) => { const k = Number(e.key) - 1; if (k >= 0 && k < options.length) { e.preventDefault(); choose(k); } });
    if (!typing) return box;
    return h('div', {}, box, input);
  }

  const hasPics = (vocab) => vocab.length > 0 && vocab.every(v => v.pic || v.img);

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
        MQ.pic(w),
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
          .map(v => ({ value: v.en, label: pics ? MQ.pic(v, 'opt-pic') : ru ? v.ru : v.en }));
        body.append(
          h('div', { class: 'prompt' }, 'Listen and choose!'),
          h('button', { class: 'primary', style: 'font-size:1.6em', onclick: () => speak(w.en) }, '🔊 Listen'),
          optionButtons(opts, { value: w.en }, answer, `It is “${w.en}”.`, pics ? 'pics' : '', true),
        );
        setTimeout(() => speak(w.en), 300);
        return { answerText: w.en };
      });
    },
  };

  // ---------- 3. Find pairs (memory) ----------
  games.memory = {
    title: 'Find pairs', icon: '🧠', desc: 'Find the word and its pair.',
    available: u => (u.vocab || []).filter(v => v.pic || v.img || v.ru).length >= 4,
    items: u => sample(u.vocab.filter(v => v.pic || v.img || v.ru), 6),
    run(ctx, items) {
      // a card pair: picture (or translation) <-> English word
      const cards = shuffle(items.flatMap((w, k) => [
        { k, face: w.pairA ? h('span', {}, w.pairA) : (w.pic || w.img) ? MQ.pic(w, 'e') : h('span', {}, w.ru), w },
        { k, face: h('span', {}, w.pairB || w.en), w },
      ]));
      let open = [], pairs = 0, tries = 0, lock = false;
      const mistakes = [];
      const info = h('div', { class: 'row space muted' });
      const sb = h('div');
      const updateInfo = () => { info.innerHTML = ''; info.append(h('span', {}, `Pairs: ${pairs} / ${items.length}`), h('span', {}, `Tries: ${tries}`)); };
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
              MQ.sfx.good();
              speak(a.w.say || a.w.en);
              pairs++; open = [];
              updateInfo();
              if (pairs === items.length) setTimeout(() => ctx.finish(items.length, Math.max(tries, items.length), mistakes), 700);
            } else {
              lock = true;
              MQ.sfx.bad();
              [a, b].forEach(x => { if (!mistakes.includes(x.w)) mistakes.push(x.w); });
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
        const sayText = w.say || target;
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
          if (word === target) { speak(sayText); answer(hintsUsed < 2, `👍 Good! Next time try with fewer hints. It is “${target}”.`, true); }
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
          MQ.pic(w),
          w.prompt || (!w.pic && !w.img && w.ru) ? h('div', { class: 'prompt' }, w.prompt || w.ru) : null,
          h('div', { class: 'row' }, sayBtn(sayText), hintBtn),
          h('div', { class: 'hint' }, `The word has ${target.replace(/ /g, '').length} letters.`),
          slots, tiles,
          h('div', { class: 'hint feedback-inline' }),
          h('div', { class: 'hint kb-hint' }, '⌨️ You can type the letters. Backspace takes one back.'),
        );
        render();
        onKeys(slots, (e) => {
          if (e.key === 'Backspace') { e.preventDefault(); picked.pop(); render(); return; }
          if (e.key.length !== 1) return;
          const want = e.key.toLowerCase();
          const l = letters.find(x => !picked.includes(x) && x.ch === e.key) || letters.find(x => !picked.includes(x) && x.ch.toLowerCase() === want);
          if (l) { e.preventDefault(); picked.push(l); render(); check(); }
        });
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
          MQ.pic(it),
          sentence,
          optionButtons(shuffle(it.options).map(o => ({ value: o, label: o })), { value: it.a }, (ok, msg) => {
            sentence.querySelector('b').textContent = it.a;
            speak(it.q.replace('___', it.a));
            answer(ok, msg);
          }, '💡 ' + (it.hint || it.rule), '', true),
        );
        return { answerText: it.a, why: it.hint || it.rule };
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
          if (norm(built) === norm(words.join(' '))) { speak(s.en); answer(tries === 0, `👍 Good, you got it! It is: “${s.en}”`, true); }
          else {
            tries++;
            const i = picked.findIndex((w, n) => norm(w.t) !== norm(words[n]));
            msg.textContent = i <= 0 ? `Not yet. Start with “${words[0]}”.` : `Not yet. “${picked.slice(0, i).map(w => w.t).join(' ')}” is right. What comes next?`;
          }
        };
        const typed = typeField('⌨️ …or type it');
        typed.addEventListener('keydown', (e) => {
          if (e.key !== 'Enter' || !typed.value.trim()) return;
          e.preventDefault();
          if (norm(typed.value) === norm(s.en)) { typed.disabled = true; speak(s.en); answer(tries === 0, `👍 Good, you got it! It is: “${s.en}”`, true); }
          else { tries++; typed.classList.add('bad'); msg.textContent = 'Not yet. Check the word order and try again.'; setTimeout(() => typed.classList.remove('bad'), 600); }
        });
        body.append(
          MQ.pic(s),
          h('div', { class: 'row' }, h('span', { class: 'prompt' }, 'Make a sentence!'), sayBtn(s.en)),
          s.hint ? h('div', { class: 'hint' }, '💡 ' + s.hint) : null,
          slots, tiles, msg, typed,
        );
        render();
        return { answerText: s.en };
      });
    },
  };

  MQ.grammarItems = (u, k) => ((k == null ? (u && u.grammar) : [u && u.grammar && u.grammar[k]]) || []).filter(Boolean).flatMap(g => (g.items || []).map(it => Object.assign({ rule: g.rule, topic: g.title, en: it.q }, it)));
  MQ.games = games;
  MQ.gameKit = { runRounds, optionButtons, sayBtn, bar, praise, onKeys };
})();
