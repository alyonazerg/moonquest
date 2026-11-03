// Jeopardy-style quiz board ("Своя игра").
// Board = [{ cat, pts, q, a }]. Made by the teacher (by hand or with AI) as a set of kind "jeopardy",
// or built automatically from any unit: grammar topics, word translations, verb forms.
(function () {
  const { h, shuffle, sample, speak, games } = MQ;
  const PTS = [100, 200, 300, 400, 500];

  function autoBoard(u) {
    const cats = [];
    (u.grammar || []).forEach(g => {
      if (g.items.length >= 3) cats.push({ cat: g.title, qs: sample(g.items, 5).map(it => ({ q: (it.pic ? it.pic + ' ' : '') + it.q, a: it.a })) });
    });
    const vocab = (u.vocab || []).filter(v => v.ru);
    if (vocab.length >= 3) cats.push({ cat: 'Words: say it in English', qs: sample(vocab, 5).map(v => ({ q: `${v.pic || ''} ${v.ru}`.trim(), a: v.en })) });
    if (vocab.length >= 8) cats.push({ cat: 'Words: what does it mean?', qs: sample(vocab, 5).map(v => ({ q: v.en, a: v.ru })) });
    const verbs = u.verbs || [];
    if (verbs.length >= 3) {
      cats.push({ cat: 'Past Simple (V2)', qs: sample(verbs, 5).map(v => ({ q: `${v.base} → ?`, a: v.v2 })) });
      cats.push({ cat: 'Past Participle (V3)', qs: sample(verbs, 5).map(v => ({ q: `${v.base} → ?`, a: v.v3 })) });
    }
    (u.sentences || []).length >= 3 && cats.push({ cat: 'Make a sentence', qs: sample(u.sentences, 5).map(s => ({ q: shuffle(s.en.replace(/[.?!]$/, '').split(' ')).join(' / '), a: s.en })) });
    return cats.slice(0, 5).flatMap(c => c.qs.map((x, i) => ({ cat: c.cat, pts: PTS[i], q: x.q, a: x.a })));
  }
  const boardOf = (u) => (u.jeopardy && u.jeopardy.length ? u.jeopardy : autoBoard(u));

  games.jeopardy = {
    title: 'Jeopardy', icon: '🏆', desc: 'Choose a topic and points, answer the question!',
    available: u => new Set(boardOf(u).map(x => x.cat)).size >= 2,
    items: u => boardOf(u),
    run(ctx, items) {
      const cats = [...new Set(items.map(x => x.cat))];
      const byCat = cats.map(c => items.filter(x => x.cat === c).sort((a, b) => (a.pts || 0) - (b.pts || 0)));
      const rowsN = Math.max(...byCat.map(c => c.length));
      const players = [{ name: (MQ.store.me && MQ.store.me.name) || 'Player 1', score: 0 }];
      let turn = 0, answered = 0, correct = 0;
      const mistakes = [];
      const used = new Set();

      const scoreBar = h('div', { class: 'jp-players' });
      const board = h('div', { class: 'jp-board', style: `grid-template-columns: repeat(${cats.length}, minmax(0, 1fr))` });
      const modal = h('div', { class: 'jp-modal', hidden: true });
      ctx.root.append(h('div', { class: 'jp' }, scoreBar, board, h('div', { class: 'row', style: 'margin-top:14px' },
        h('button', { class: 'ghost', onclick: finish }, '🏁 Finish game')), modal));

      function renderPlayers() {
        scoreBar.innerHTML = '';
        players.forEach((p, k) => scoreBar.append(h('button', { class: 'jp-player' + (k === turn ? ' on' : ''), onclick: () => { turn = k; renderPlayers(); }, ondblclick: () => {
          const n = prompt('Name:', p.name); if (n) { p.name = n; renderPlayers(); }
        } }, h('span', {}, p.name), h('b', {}, String(p.score)))));
        scoreBar.append(h('button', { class: 'chip', title: 'Add a player', onclick: () => {
          const n = prompt('Player name:', 'Player ' + (players.length + 1)); if (n) { players.push({ name: n, score: 0 }); renderPlayers(); }
        } }, '＋ player'));
      }
      function renderBoard() {
        board.innerHTML = '';
        cats.forEach(c => board.append(h('div', { class: 'jp-cat' }, c)));
        for (let r = 0; r < rowsN; r++) cats.forEach((c, k) => {
          const x = byCat[k][r];
          if (!x) { board.append(h('div', {})); return; }
          const id = k + ':' + r;
          board.append(h('button', { class: 'jp-cell' + (used.has(id) ? ' used' : ''), disabled: used.has(id), onclick: () => open(x, id) }, used.has(id) ? '' : String(x.pts || PTS[r] || 100)));
        });
      }
      function open(x, id) {
        const ans = h('div', { class: 'jp-a', hidden: true }, x.a);
        const pts = x.pts || 100;
        const judge = h('div', { class: 'row', hidden: true },
          h('button', { class: 'rate good', onclick: () => close(true) }, '✔ Right'),
          h('button', { class: 'rate again', onclick: () => close(false) }, '✘ Wrong'));
        const showBtn = h('button', { class: 'primary', onclick: () => { ans.hidden = false; judge.hidden = false; showBtn.hidden = true; if (/^[\x00-\x7F’'.,?!\s-]+$/.test(x.a)) speak(x.a); } }, '👀 Show answer');
        modal.innerHTML = '';
        modal.append(h('div', { class: 'jp-card' },
          h('div', { class: 'muted' }, `${x.cat} · ${pts}`),
          h('div', { class: 'jp-q' }, x.q),
          ans, showBtn, judge,
          h('div', { class: 'hint' }, `${players[turn].name}, it's your turn!`)));
        modal.hidden = false;
        function close(ok) {
          used.add(id); answered++;
          if (ok) { correct++; players[turn].score += pts; } else { mistakes.push(Object.assign({ en: `${x.q} → ${x.a}` }, x)); }
          if (players.length > 1) turn = (turn + 1) % players.length;
          modal.hidden = true;
          renderPlayers(); renderBoard();
          if (used.size === items.length) setTimeout(finish, 500);
        }
      }
      function finish() {
        const best = players.slice().sort((a, b) => b.score - a.score);
        MQ.toast(players.length > 1 ? `🏆 ${best[0].name} wins with ${best[0].score}!` : `🏆 Score: ${best[0].score}`);
        ctx.finish(correct, Math.max(answered, 1), mistakes);
      }
      renderPlayers(); renderBoard();
    },
  };

  MQ.jeopardy = { autoBoard };
})();
