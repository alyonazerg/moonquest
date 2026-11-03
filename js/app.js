// Moonquest app: routing and screens.
(function () {
  const { h, courses, games, settings } = MQ;
  const app = document.getElementById('app');
  const zoomBtn = document.getElementById('zoomToggle');

  function applyZoom() {
    document.body.classList.toggle('zoom', settings.zoom);
    zoomBtn.classList.toggle('on', settings.zoom);
    zoomBtn.textContent = '🎥 Zoom lesson: ' + (settings.zoom ? 'on' : 'off');
  }
  zoomBtn.onclick = () => { settings.zoom = !settings.zoom; MQ.saveSettings(); applyZoom(); route(); };
  applyZoom();

  const starStr = (n, max = 3) => '★'.repeat(n) + '☆'.repeat(max - n);
  const gameIds = (unit) => Object.keys(games).filter(id => games[id].available(unit));
  const unitStars = (c, unit) => gameIds(unit).reduce((s, g) => s + MQ.getStars(c, unit.id, g), 0);

  // ---------- screens ----------
  function home() {
    app.append(
      h('h1', {}, 'Hello, space explorer! 👋'),
      h('p', { class: 'muted' }, 'Choose your rocket.'),
      h('div', { class: 'grid' }, Object.values(courses).map(c => {
        const max = c.units.reduce((s, u) => s + gameIds(u).length * 3, 0);
        const got = c.units.reduce((s, u) => s + unitStars(c.id, u), 0);
        return h('a', { class: 'tile', href: `#/c/${c.id}` },
          h('div', { class: 'big' }, c.icon),
          h('div', { class: 'title' }, c.title),
          h('div', { class: 'muted' }, c.who),
          h('div', { class: 'stars' }, `★ ${got} / ${max}`));
      })),
    );
  }

  function course(c) {
    app.append(
      h('a', { href: '#/', class: 'muted' }, '← Home'),
      h('h1', {}, `${c.icon} ${c.title}`),
      h('p', { class: 'muted' }, 'Choose a planet.'),
      h('div', { class: 'grid' }, c.units.map(u => {
        const max = gameIds(u).length * 3;
        return h('a', { class: 'tile', href: `#/c/${c.id}/${u.id}` },
          h('div', { class: 'big' }, u.icon || '🪐'),
          h('div', { class: 'title' }, u.title, ' ', u.demo ? h('span', { class: 'badge' }, 'demo') : null),
          h('div', { class: 'muted' }, u.subtitle || ''),
          h('div', { class: 'stars' }, `★ ${unitStars(c.id, u)} / ${max}`));
      })),
    );
  }

  function unit(c, u) {
    app.append(
      h('a', { href: `#/c/${c.id}`, class: 'muted' }, '← ' + c.title),
      h('h1', {}, `${u.icon || '🪐'} ${u.title}`),
      h('p', { class: 'muted' }, u.subtitle || ''),
      u.demo ? h('p', { class: 'hint' }, 'Демо-содержание: будет заменено материалами учебника.') : null,
      (u.grammar || []).length ? h('div', { class: 'panel' },
        h('h2', {}, '📘 Grammar'),
        u.grammar.map(g => h('p', {}, h('b', {}, g.title + ': '), g.rule))) : null,
      h('div', { class: 'grid' }, gameIds(u).map(id => {
        const g = games[id];
        return h('a', { class: 'tile', href: `#/c/${c.id}/${u.id}/${id}` },
          h('div', { class: 'big' }, g.icon),
          h('div', { class: 'title' }, g.title),
          h('div', { class: 'muted' }, g.desc),
          h('div', { class: 'stars' }, starStr(MQ.getStars(c.id, u.id, id))));
      })),
    );
  }

  function play(c, u, gameId, itemsOverride) {
    const g = games[gameId];
    app.innerHTML = '';
    const root = h('div');
    // two-player score for Zoom lessons
    const players = settings.players.map(name => ({ name, score: 0 }));
    let turn = 0;
    const ctx = {
      root, unit: u,
      scoreboard() {
        if (!settings.zoom) return h('span');
        return h('div', { class: 'score' }, players.map((p, k) =>
          h('div', { class: k === turn ? 'turn' : '' }, (k === turn ? '👉 ' : '') + `${p.name}: ${p.score}`)));
      },
      score(ok, keepTurn) {
        if (!settings.zoom) return;
        if (ok) players[turn].score++;
        if (!keepTurn) turn = 1 - turn;
      },
      finish(correct, total, mistakes) {
        const stars = MQ.starsFor(correct, total);
        if (!itemsOverride) MQ.setStars(c.id, u.id, gameId, stars);
        root.innerHTML = '';
        let winner = null;
        if (settings.zoom) {
          const [a, b] = players;
          winner = a.score === b.score ? `It's a draw! ${a.score} : ${b.score} 🤝` : `${(a.score > b.score ? a : b).name} wins! ${a.score} : ${b.score} 🏆`;
        }
        root.append(h('div', { class: 'panel center' },
          h('div', { class: 'emoji' }, stars === 3 ? '🏆' : stars === 2 ? '🚀' : '🌱'),
          h('h2', {}, stars === 3 ? 'Excellent!' : stars === 2 ? 'Good work!' : 'Keep practising!'),
          h('div', { class: 'stars', style: 'font-size:2em' }, starStr(stars)),
          h('p', {}, `Correct: ${correct} / ${total}`),
          winner ? h('p', { class: 'prompt' }, winner) : null,
          mistakes.length ? h('p', { class: 'muted' }, 'Practise these again: ' + mistakes.map(m => m.en || m.q || '').join(', ')) : null,
          h('div', { class: 'row' },
            mistakes.length ? h('button', { class: 'primary', onclick: () => play(c, u, gameId, MQ.shuffle(mistakes)) }, `🔁 Practise mistakes (${mistakes.length})`) : null,
            h('button', { onclick: () => play(c, u, gameId) }, '▶ Play again'),
            h('a', { class: 'btn', href: `#/c/${c.id}/${u.id}` }, '🪐 Back to planet'))));
      },
    };
    app.append(
      h('a', { href: `#/c/${c.id}/${u.id}`, class: 'muted' }, '← ' + u.title),
      h('h1', {}, `${g.icon} ${g.title}`),
      h('p', { class: 'muted' }, g.desc, itemsOverride ? ' (mistakes only)' : ''),
      settings.zoom ? zoomNames() : null,
      root,
    );
    g.run(ctx, itemsOverride || g.items(u));
  }

  function zoomNames() {
    const inputs = settings.players.map((n, k) => h('input', {
      value: n, size: 10, 'aria-label': 'Player ' + (k + 1),
      style: 'font:inherit;padding:4px 8px;border-radius:8px;border:0',
      onchange: (e) => { settings.players[k] = e.target.value || n; MQ.saveSettings(); },
    }));
    return h('details', { class: 'hint' }, h('summary', {}, 'Player names'), h('div', { class: 'row' }, inputs));
  }

  // ---------- router ----------
  function route() {
    if ('speechSynthesis' in window) speechSynthesis.cancel();
    app.innerHTML = '';
    const [, , cid, uid, gid] = (location.hash || '#/').split('/');
    const c = courses[cid];
    const u = c && c.units.find(x => x.id === uid);
    if (c && u && gid && games[gid]) play(c, u, gid);
    else if (c && u) unit(c, u);
    else if (c) course(c);
    else home();
    window.scrollTo(0, 0);
  }
  window.addEventListener('hashchange', route);
  route();
})();
