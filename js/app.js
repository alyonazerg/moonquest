// Moonquest app: routing and student screens.
(function () {
  const { h, courses, games, store } = MQ;
  const app = document.getElementById('app');
  const who = document.getElementById('who');

  const starStr = (n, max = 3) => '★'.repeat(n) + '☆'.repeat(max - n);
  const gameIds = (unit) => Object.keys(games).filter(id => games[id].available(unit));
  // "c" is a course, or the pseudo-course of teacher-made sets
  const SETS = { id: 'sets', title: 'My tasks', icon: '🗂', href: '#/s', key: (u, g) => `set:${u.id}/${g}` };
  Object.values(courses).forEach(c => { c.key = (u, g) => `${c.id}/${u.id}/${g}`; });
  const unitStars = (c, u) => gameIds(u).reduce((s, g) => s + store.getStars(c.key(u, g)), 0);

  function renderWho() {
    who.innerHTML = '';
    who.append(
      store.me ? h('a', { class: 'btn chip', href: '#/who', title: 'Change player' }, '👤 ' + store.me.name) : null,
      h('a', { class: 'btn chip', href: '#/teacher', title: 'Teacher' }, '👩‍🏫'));
  }

  // ---------- screens ----------
  async function whoScreen() {
    const students = await store.students();
    const enter = async (s) => { await store.setMe({ id: s.id, name: s.name, course: s.course }); location.hash = '#/'; };
    // Ask for the personal code before entering
    const pick = (s) => {
      if (store.mode === 'local' && !s.pin) return enter(s);
      const code = h('input', { class: 'field big-field', type: 'password', inputmode: 'numeric', autocomplete: 'off', maxlength: 8, placeholder: '• • • •' });
      const msg = h('div', { class: 'feedback bad' });
      const go = async () => {
        msg.textContent = '';
        try { if (await store.checkPin(s.id, code.value)) return enter(s); msg.textContent = 'Wrong code. Try again or ask your teacher.'; }
        catch (e) { msg.textContent = '⚠️ ' + e.message; }
        code.value = ''; code.focus();
      };
      code.addEventListener('keydown', (e) => { if (e.key === 'Enter') go(); });
      app.innerHTML = '';
      app.append(
        h('div', { class: 'emoji' }, '🔐'),
        h('h1', {}, `Hi, ${s.name}!`),
        h('div', { class: 'panel narrow' }, h('p', {}, 'Enter your secret code:'), code, msg,
          h('div', { class: 'row' }, h('a', { class: 'btn ghost', href: '#/who', onclick: (e) => { e.preventDefault(); MQ.route(); } }, '← Back'), h('button', { class: 'primary', onclick: go }, "Let's go! 🚀"))),
      );
      setTimeout(() => code.focus(), 50);
    };
    const nameInput = h('input', { class: 'field big-field', placeholder: 'Your name', maxlength: 30 });
    const addSelf = async () => {
      const name = nameInput.value.trim();
      if (!name) return;
      const existing = students.find(s => s.name.toLowerCase() === name.toLowerCase());
      if (existing) pick(existing); else enter(await store.saveStudent({ name }));
    };
    nameInput.addEventListener('keydown', (e) => { if (e.key === 'Enter') addSelf(); });
    app.append(
      h('div', { class: 'emoji' }, '👩‍🚀'),
      h('h1', {}, "Who's playing?"),
      students.length ? h('div', { class: 'grid names' }, students.map(s =>
        h('button', { class: 'tile name-btn', onclick: () => pick(s) }, h('div', { class: 'big' }, '🧑‍🚀'), h('div', { class: 'title' }, s.name)))) : null,
      store.mode === 'local'
        ? h('div', { class: 'panel narrow' }, h('p', {}, students.length ? 'New here? Write your name:' : 'What is your name?'), nameInput, h('button', { class: 'primary', onclick: addSelf }, "Let's go! 🚀"))
        : (students.length ? null : h('p', { class: 'muted' }, 'Ask your teacher to add your name.')),
    );
  }

  async function home() {
    if (!store.me) { location.replace('#/who'); return; }
    const [sets, assigns] = await Promise.all([store.sets(), store.assignments()]);
    const mine = new Set(assigns.filter(a => a.student_id === store.me.id).map(a => a.set_id));
    const tasks = sets.filter(s => mine.has(s.id));
    // the irregular verbs galaxy is for everyone except the Academy Stars 2 course
    const own = store.me.course && courses[store.me.course] ? [courses[store.me.course]] : [courses.as2, courses.as4];
    const myCourses = own.filter(c => c.id !== 'irr');
    const showVerbs = store.me.course !== 'as2';
    app.append(
      h('h1', {}, `Hello, ${store.me.name}! 👋`),
      tasks.length ? h('h2', {}, '🗂 My tasks') : null,
      tasks.length ? h('div', { class: 'grid' }, tasks.map(s => {
        const u = MQ.sets.setToUnit(s);
        return h('a', { class: 'tile', href: `#/s/${s.id}` },
          h('div', { class: 'big' }, u.icon), h('div', { class: 'title' }, s.title), h('div', { class: 'muted' }, u.subtitle),
          h('div', { class: 'stars' }, `★ ${unitStars(SETS, u)} / ${gameIds(u).length * 3}`));
      })) : null,
      h('h2', {}, '🪐 My planets'),
      h('div', { class: 'grid' }, myCourses.flatMap(c => c.units.map(u =>
        h('a', { class: 'tile', href: `${c.href}/${u.id}` },
          h('div', { class: 'big' }, u.icon || '🪐'),
          h('div', { class: 'title' }, u.title),
          h('div', { class: 'muted' }, c.title),
          h('div', { class: 'stars' }, `★ ${unitStars(c, u)} / ${gameIds(u).length * 3}`)))),
        showVerbs ? folderTile(courses.irr) : null),
    );
  }

  // A folder tile that opens a whole collection (e.g. all irregular verb groups)
  function folderTile(c) {
    const verbs = c.units.reduce((n, u) => n + (u.verbs || []).length, 0);
    const got = c.units.reduce((n, u) => n + unitStars(c, u), 0);
    const max = c.units.reduce((n, u) => n + gameIds(u).length * 3, 0);
    return h('a', { class: 'tile folder', href: c.href },
      h('div', { class: 'big' }, '📁'),
      h('div', { class: 'title' }, c.title),
      h('div', { class: 'muted' }, `${c.units.length} groups · ${verbs} verbs`),
      h('div', { class: 'stars' }, `★ ${got} / ${max}`));
  }

  function course(c) {
    app.append(
      h('a', { href: '#/', class: 'back' }, '← Home'),
      h('h1', {}, `${c.icon} ${c.title}`),
      h('div', { class: 'grid' }, c.units.map(u => h('a', { class: 'tile', href: `${c.href}/${u.id}` },
        h('div', { class: 'big' }, u.icon || '🪐'),
        h('div', { class: 'title' }, u.title),
        h('div', { class: 'muted' }, u.subtitle || ''),
        h('div', { class: 'stars' }, `★ ${unitStars(c, u)} / ${gameIds(u).length * 3}`)))),
    );
  }

  function unit(c, u) {
    app.append(
      c === courses.irr ? h('a', { href: c.href, class: 'back' }, '← ' + c.title) : h('a', { href: '#/', class: 'back' }, '← Home'),
      h('h1', {}, `${u.icon || '🪐'} ${u.title}`),
      h('p', { class: 'muted' }, u.subtitle || ''),
      u.note ? h('div', { class: 'panel note' }, h('div', { class: 'big-note' }, '💡'), h('p', {}, u.note)) : null,
      (u.grammar || []).length ? h('div', { class: 'panel left' },
        h('h2', {}, '📘 Grammar'),
        u.grammar.map((g, k) => h('div', { class: 'topic' },
          h('div', {}, h('b', {}, g.title), h('div', { class: 'muted' }, g.rule)),
          h('button', { class: 'chip', onclick: () => play(c, u, 'quiz', MQ.shuffle(MQ.grammarItems(u, k)), g.title) }, '▶ Practise')))) : null,
      (u.verbs || []).length ? h('details', { class: 'panel' },
        h('summary', {}, '📋 Verb table'),
        h('table', { class: 'table' },
          h('tr', {}, h('th', {}, 'V1'), h('th', {}, 'V2'), h('th', {}, 'V3'), h('th', {})),
          u.verbs.map(v => h('tr', {},
            h('td', {}, v.base), h('td', {}, v.v2), h('td', {}, v.v3),
            h('td', {}, h('button', { class: 'chip', onclick: () => MQ.speak(`${v.base}, ${v.v2}, ${v.v3}`) }, '🔊')))))) : null,
      h('div', { class: 'grid' }, gameIds(u).map(id => {
        const g = games[id];
        return h('a', { class: 'tile', href: `${c.href}/${u.id}/${id}` },
          h('div', { class: 'big' }, g.icon),
          h('div', { class: 'title' }, g.title),
          h('div', { class: 'muted' }, g.desc),
          h('div', { class: 'stars' }, starStr(store.getStars(c.key(u, id)))));
      })),
    );
  }

  function play(c, u, gameId, itemsOverride, label) {
    const g = games[gameId];
    app.innerHTML = '';
    window.scrollTo(0, 0);
    const root = h('div');
    const ctx = {
      root, unit: u, key: c.key(u, gameId), override: !!itemsOverride,
      finish(correct, total, mistakes) {
        const stars = MQ.starsFor(correct, total);
        if (!itemsOverride || label !== 'mistakes only') store.record(c.key(u, gameId), { stars, correct, total, mistakes });
        root.innerHTML = '';
        root.append(h('div', { class: 'panel' },
          h('div', { class: 'emoji' }, stars === 3 ? '🏆' : stars === 2 ? '🚀' : '🌱'),
          h('h2', {}, stars === 3 ? 'Excellent!' : stars === 2 ? 'Good work!' : 'Keep practising!'),
          h('div', { class: 'stars', style: 'font-size:2em' }, starStr(stars)),
          h('p', {}, `Correct: ${correct} / ${total}`),
          mistakes.length ? h('p', { class: 'muted' }, 'Practise these again: ' + mistakes.map(m => m.en || m.q || m.base || '').join(', ')) : null,
          h('div', { class: 'row' },
            mistakes.length ? h('button', { class: 'primary', onclick: () => play(c, u, gameId, MQ.shuffle(mistakes), 'mistakes only') }, `🔁 Practise mistakes (${mistakes.length})`) : null,
            h('button', { onclick: () => play(c, u, gameId, itemsOverride, label) }, '▶ Play again'),
            h('a', { class: 'btn', href: `${c.href}/${u.id}` }, '🪐 Back'))));
      },
    };
    app.append(
      h('a', { href: `${c.href}/${u.id}`, class: 'back' }, '← ' + u.title),
      h('h1', {}, `${g.icon} ${g.title}`),
      h('p', { class: 'muted' }, g.desc, itemsOverride ? ` (${label})` : ''),
      root,
    );
    g.run(ctx, itemsOverride || g.items(u));
  }

  async function setRoute(id, gid) {
    const set = await store.getSet(id);
    if (!set) { app.append(h('p', {}, 'This task was deleted.'), h('a', { class: 'btn', href: '#/' }, 'Home')); return; }
    const u = MQ.sets.setToUnit(set);
    if (gid && games[gid]) play(SETS, u, gid); else unit(SETS, u);
  }

  // Personal link from the teacher: #/login/<student id>/<code>
  async function loginLink(id, pin) {
    const s = (await store.students()).find(x => x.id === id);
    if (s && await store.checkPin(id, pin)) { await store.setMe({ id: s.id, name: s.name, course: s.course }); location.replace('#/'); return; }
    location.replace('#/who');
  }

  // ---------- router ----------
  let seq = 0;
  async function route() {
    const my = ++seq;
    MQ.stopSpeech();
    app.innerHTML = '';
    renderWho();
    const parts = (location.hash || '#/').split('/');
    try {
      const [, top, a, b, c3] = parts;
      if (top === 'who') { await store.setMe(null); renderWho(); await whoScreen(); }
      else if (top === 'login' && a) await loginLink(a, decodeURIComponent(b || ''));
      else if (top === 'teacher') await MQ.teacher.route(app, parts);
      else if (top === 's' && a) await setRoute(a, b);
      else if (top === 'c' && courses[a]) {
        const c = courses[a];
        const u = c.units.find(x => x.id === b);
        if (u && c3 && games[c3]) play(c, u, c3);
        else if (u) unit(c, u);
        else course(c);
      } else await home();
    } catch (e) {
      console.error(e);
      if (my === seq) app.append(h('div', { class: 'panel' }, h('p', {}, '⚠️ ' + e.message), h('a', { class: 'btn', href: '#/' }, 'Home')));
    }
    if (my === seq) window.scrollTo(0, 0);
  }
  MQ.route = route;

  // A link to the page we are already on (e.g. "← Unit" after "Practise") must still re-render.
  document.addEventListener('click', (e) => {
    const a = e.target.closest('a[href^="#"]');
    if (a && a.getAttribute('href') === (location.hash || '#/')) { e.preventDefault(); route(); }
  });
  window.addEventListener('hashchange', route);

  (async () => {
    try { await store.init(); } catch (e) { console.error(e); MQ.toast('⚠️ ' + e.message); }
    if (store.me) await store.setMe(store.me);
    route();
  })();
})();
