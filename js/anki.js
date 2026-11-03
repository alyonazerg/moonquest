// Anki-style flashcards with a 3D flip and spaced repetition (simplified SM-2).
// Replaces the simple "Word cards" / "Verb cards" games.
(function () {
  const { h, shuffle, speak, games } = MQ;
  const store = { deck: (k) => MQ.store.deck(k), saveDeck: (k, d) => MQ.store.saveDeck(k, d) };
  const MIN = 60e3, DAY = 864e5;
  const NEW_PER_SESSION = 20;

  // ---------- scheduling ----------
  // state: { due, ivl (days), ease, reps, lapses }
  function schedule(st, rating, now) {
    const s = Object.assign({ ivl: 0, ease: 2.5, reps: 0, lapses: 0 }, st);
    const learning = s.ivl < 1;
    if (rating === 1) { // Again
      if (!learning) { s.lapses++; s.ease = Math.max(1.3, s.ease - 0.2); }
      s.ivl = 0; s.due = now + (learning ? 1 : 10) * MIN;
    } else if (rating === 2) { // Hard
      if (learning) { s.ivl = 0; s.due = now + 5 * MIN; }
      else { s.ivl = Math.max(1, s.ivl * 1.2); s.ease = Math.max(1.3, s.ease - 0.15); s.due = now + s.ivl * DAY; }
    } else if (rating === 3) { // Good
      s.ivl = learning ? 1 : s.ivl * s.ease; s.reps++; s.due = now + s.ivl * DAY;
    } else { // Easy
      s.ivl = learning ? 3 : s.ivl * s.ease * 1.3; s.ease += 0.15; s.reps++; s.due = now + s.ivl * DAY;
    }
    s.ivl = Math.round(s.ivl * 10) / 10;
    return s;
  }
  function fmt(ms) {
    if (ms < MIN) return '<1m';
    if (ms < 60 * MIN) return Math.round(ms / MIN) + 'm';
    if (ms < 20 * 3600e3) return Math.round(ms / 3600e3) + 'h';
    if (ms < 30 * DAY) return Math.max(1, Math.round(ms / DAY)) + 'd';
    return Math.round(ms / (30 * DAY)) + 'mo';
  }

  // ---------- card faces ----------
  function wordFaces(w) {
    return {
      front: [MQ.pic(w, 'emoji card-pic'), h('div', { class: 'card-word' }, w.en)],
      back: [
        MQ.pic(w, 'emoji card-pic small'),
        h('div', { class: 'card-en' }, w.en),
        h('div', { class: 'card-line' }),
        h('div', { class: 'card-ru' }, w.ru || '—'),
        w.example ? h('div', { class: 'card-example' }, '“' + w.example + '”') : null,
      ],
      say: w.en,
    };
  }
  function verbFaces(v) {
    const col = (label, form, cls) => h('div', { class: 'form ' + cls }, h('div', { class: 'form-label' }, label), h('div', { class: 'form-word' }, form));
    return {
      front: [h('div', { class: 'card-word' }, v.base), v.ru ? h('div', { class: 'card-sub' }, v.ru) : null, h('div', { class: 'card-ask' }, 'V2 ? · V3 ?')],
      back: [
        h('div', { class: 'forms' }, col('V1', v.base, 'f1'), col('V2 · Past Simple', v.v2, 'f2'), col('V3 · Past Participle', v.v3, 'f3')),
        v.ru ? h('div', { class: 'card-ru small' }, v.ru) : null,
      ],
      say: `${v.base}, ${v.v2}, ${v.v3}`,
    };
  }

  // cram = practise every card now ("practise anyway", "practise mistakes")
  function runAnki(ctx, cards, cram) {
    const key = ctx.key;
    const deck = store.deck(key);
    let now = Date.now();
    const due = shuffle(cards.filter(c => deck[c.id] && deck[c.id].due <= now));
    const fresh = cards.filter(c => !deck[c.id]).slice(0, NEW_PER_SESSION);
    let queue = cram ? shuffle(cards) : due.concat(fresh);
    const total = new Set(queue.map(c => c.id)).size;
    const firstRating = {};
    const wrap = h('div');
    ctx.root.append(wrap);

    if (!queue.length) {
      const next = Math.min(...cards.map(c => (deck[c.id] || {}).due || Infinity));
      wrap.append(h('div', { class: 'panel' },
        h('div', { class: 'emoji' }, '🎉'),
        h('h2', {}, 'All done for now!'),
        h('p', { class: 'muted' }, isFinite(next) ? `Next cards in ${fmt(next - now)}.` : ''),
        h('button', { class: 'primary', onclick: () => { wrap.remove(); runAnki(ctx, cards, true); } }, '🔁 Practise all cards anyway')));
      return;
    }

    let flipped = false, current = null;
    const counts = h('div', { class: 'row space muted' });
    const card = h('div', { class: 'card3d', onclick: () => flip() });
    const inner = h('div', { class: 'inner' });
    card.append(inner);
    const rateRow = h('div', { class: 'rate-row' });
    const hint = h('div', { class: 'hint' }, 'Tap the card (or press Space) to see the answer');
    wrap.append(counts, card, h('div', { class: 'row', style: 'margin-top:14px' }, h('button', { class: 'chip', onclick: () => current && speak(current.faces.say) }, '🔊 Listen')), hint, rateRow);

    // The flip is animated from JavaScript (Web Animations), so it works in every browser
    // and is not switched off by CSS settings.
    let anim = null;
    function flip() {
      if (!current) return;
      flipped = !flipped;
      const from = flipped ? 0 : 180, to = flipped ? 180 : 0;
      card.classList.toggle('flipped', flipped);
      if (anim) anim.cancel();
      if (inner.animate) {
        anim = inner.animate([
          { transform: `rotateY(${from}deg)` },
          { transform: `rotateY(${(from + to) / 2}deg) translateZ(70px) scale(1.06)`, offset: 0.5 },
          { transform: `rotateY(${to}deg)` },
        ], { duration: 650, easing: 'cubic-bezier(.45,.05,.25,1)' });
      }
      if (flipped) { speak(current.faces.say); showRates(); }
    }
    function showRates() {
      const st = deck[current.id];
      now = Date.now();
      rateRow.innerHTML = '';
      [['Again', 1, 'again'], ['Hard', 2, 'hard'], ['Good', 3, 'good'], ['Easy', 4, 'easy']].forEach(([label, r, cls]) => {
        const nx = schedule(st, r, now);
        rateRow.append(h('button', { class: 'rate ' + cls, onclick: (e) => { e.stopPropagation(); rate(r); } },
          h('span', { class: 'rate-time' }, fmt(nx.due - now)), h('span', {}, label)));
      });
      hint.textContent = 'How well did you know it? (keys 1–4)';
    }
    function rate(r) {
      now = Date.now();
      const c = queue.shift();
      if (firstRating[c.id] === undefined) firstRating[c.id] = r;
      deck[c.id] = schedule(deck[c.id], r, now);
      store.saveDeck(key, deck);
      // still learning: show again later in this session
      if (deck[c.id].due - now < 30 * MIN) queue.splice(Math.min(queue.length, 3 + Math.floor(Math.random() * 3)), 0, c);
      show();
    }
    function show() {
      rateRow.innerHTML = '';
      hint.textContent = 'Tap the card (or press Space) to see the answer';
      if (!queue.length) {
        document.removeEventListener('keydown', onKey);
        const ids = Object.keys(firstRating);
        const good = ids.filter(id => firstRating[id] >= 3).length;
        const mistakes = cards.filter(c => firstRating[c.id] === 1).map(c => c.item);
        return ctx.finish(good, ids.length, mistakes);
      }
      current = queue[0];
      current.faces = current.faces || (current.verb ? verbFaces(current.item) : wordFaces(current.item));
      const left = new Set(queue.map(c => c.id)).size;
      counts.innerHTML = '';
      counts.append(h('span', {}, `🃏 Cards left: ${left}`), h('span', {}, `✔ ${Object.keys(firstRating).length} / ${total}`));
      // reset to the front without animating
      flipped = false;
      if (anim) { anim.cancel(); anim = null; }
      card.classList.remove('flipped');
      inner.innerHTML = '';
      inner.append(
        h('div', { class: 'face front' }, ...current.faces.front, h('div', { class: 'face-hint' }, '↻ tap to flip')),
        h('div', { class: 'face back' }, ...current.faces.back));
    }
    function onKey(e) {
      if (!wrap.isConnected) { document.removeEventListener('keydown', onKey); return; }
      if (e.target.closest && e.target.closest('input, textarea')) return;
      if (e.key === ' ' || e.key === 'Enter') { e.preventDefault(); flip(); }
      else if (flipped && ['1', '2', '3', '4'].includes(e.key)) rate(Number(e.key));
    }
    document.addEventListener('keydown', onKey);
    show();
  }

  games.flash = {
    title: 'Flashcards', icon: '🃏', desc: 'Anki style: flip the card, then say how well you knew it.',
    available: u => (u.vocab || []).length > 0,
    items: u => u.vocab.map(w => ({ id: w.en, item: w })),
    run: (ctx, items) => runAnki(ctx, items.map(x => x.item && x.id ? x : { id: x.en, item: x }), ctx.override),
  };
  games.vflash = {
    title: 'Verb flashcards', icon: '🃏', desc: 'Anki style: say the three forms, flip and check.',
    available: u => (u.verbs || []).length > 0,
    items: u => u.verbs.map(v => ({ id: v.base, item: v, verb: true })),
    run: (ctx, items) => runAnki(ctx, items.map(x => x.item && x.id ? x : { id: x.base, item: x, verb: true }), ctx.override),
  };
})();
