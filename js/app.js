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
      h('button', { class: 'chip', title: 'Sounds on/off', onclick: (e) => { e.currentTarget.textContent = MQ.sfx.toggle() ? '🔔' : '🔕'; } }, MQ.sfx.on ? '🔔' : '🔕'),
      store.me ? settingsMenu() : null,
      h('a', { class: 'btn chip', href: '#/teacher', title: 'Teacher' }, '👩‍🏫'));
  }

  // ⚙️ theme, light / dark, no timers, animation: one small menu instead of rows of chips on the home page
  function settingsMenu() {
    const id = store.me.id, t = MQ.theme(id);
    const chip = (on, label, fn) => h('button', { class: 'chip' + (on ? ' on' : ''), onclick: () => { fn(); route(); } }, label);
    return h('details', { class: 'settings' },
      h('summary', { class: 'btn chip', title: 'Theme and settings', 'aria-label': 'Theme and settings' }, '⚙️'),
      h('div', { class: 'settings-pop' },
        h('h3', {}, 'Theme'),
        h('div', { class: 'row' }, ['space', 'magic', 'woods'].map(x => chip(t === x, { space: '🚀 Space', magic: '🪄 Magic school', woods: '🌲 Mystery woods' }[x], () => MQ.setTheme(id, x)))),
        t === 'space' ? h('h3', {}, 'Colours') : null,
        t === 'space' ? h('div', { class: 'row' }, chip(MQ.mode(id) !== 'light', '🌙 Dark', () => MQ.setMode(id, 'dark')), chip(MQ.mode(id) === 'light', '☀️ Light', () => MQ.setMode(id, 'light'))) : null,
        h('h3', {}, 'Games'),
        h('div', { class: 'row' },
          chip(MQ.slow(), MQ.slow() ? '🐢 No timers: on' : '🐢 No timers: off', () => MQ.setSlow(!MQ.slow())),
          chip(MQ.animOn(), MQ.animOn() ? '✨ Animation: on' : '✨ Animation: off', () => MQ.setAnim(!MQ.animOn()))),
        h('h3', {}, 'My progress'),
        h('div', { class: 'row' },
          ...MQ.nowUnits(store.me).filter(o => unitPlayed(o.c, o.u).length).map(o => h('button', { class: 'chip', onclick: () => resetUnit(o.c, o.u) }, `↺ ${o.u.title.split('·')[0].trim()} again`)),
          h('button', { class: 'chip', onclick: async () => {
            const keys = store.rows().map(r => r.key).filter(k => !k.startsWith('mistakes:'));
            if (!keys.length) { MQ.toast('Nothing to reset yet'); return; }
            if (!confirm('Reset ALL your stars and results? (Your “My mistakes” cards stay.)')) return;
            try { await store.resetProgress(keys); MQ.toast('↺ Done'); route(); } catch (e) { MQ.toast('⚠️ ' + e.message); }
          } }, '↺ Reset all my progress'))));
  }

  // ---------- star map: the games of a unit are stars; played ones light up and make a constellation ----------
  const STAR_POS = {
    2: [[25, 62], [75, 34]],
    3: [[16, 62], [50, 34], [84, 62]],
    4: [[12, 62], [37, 34], [63, 62], [88, 34]],
    5: [[10, 62], [30, 34], [50, 62], [70, 34], [90, 62]],
    6: [[9, 62], [25.4, 34], [41.8, 62], [58.2, 34], [74.6, 62], [91, 34]],
  };
  const STAR_SVG = '<svg class="ico" viewBox="0 0 24 24" aria-hidden="true"><path d="M12 2.5l2.9 6 6.6.9-4.8 4.6 1.2 6.5L12 17.4l-5.9 3.1 1.2-6.5L2.5 9.4l6.6-.9z"/></svg>';
  const stepInfo = (id) => id === 'vpr' ? { icon: '📝', title: 'Unit test', desc: 'A test in the ВПР format.' } : MQ.gt(id, games[id]);
  function starState(c, u) {
    const steps = pathSteps(c, u).slice(0, 6);
    const done = (id) => store.getStars(c.key(u, id)) >= 2;
    return { steps, done, next: steps.find(id => !done(id)), lit: steps.filter(done).length };
  }
  function starMap(c, u, kicker) {
    const { steps, done, next, lit } = starState(c, u);
    if (steps.length < 2) return null;
    const pos = STAR_POS[steps.length];
    const ns = 'http://www.w3.org/2000/svg';
    const svg = document.createElementNS(ns, 'svg');
    svg.setAttribute('viewBox', '0 0 100 100'); svg.setAttribute('preserveAspectRatio', 'none'); svg.setAttribute('aria-hidden', 'true');
    // a few faint background stars
    [[6, 12], [20, 88], [38, 16], [55, 90], [72, 8], [95, 72], [84, 92], [50, 40]].forEach(([x, y]) => {
      const d = document.createElementNS(ns, 'circle');
      d.setAttribute('cx', x); d.setAttribute('cy', y); d.setAttribute('r', '.3'); d.setAttribute('fill', '#fff'); d.setAttribute('opacity', '.5');
      svg.appendChild(d);
    });
    for (let i = 1; i < steps.length; i++) {
      const l = document.createElementNS(ns, 'line');
      const [a, b] = [pos[i - 1], pos[i]];
      l.setAttribute('x1', a[0]); l.setAttribute('y1', a[1]); l.setAttribute('x2', b[0]); l.setAttribute('y2', b[1]);
      l.setAttribute('vector-effect', 'non-scaling-stroke');
      const both = done(steps[i - 1]) && done(steps[i]);
      const toNext = done(steps[i - 1]) && steps[i] === next;
      l.setAttribute('stroke', both || toNext ? 'var(--star)' : '#4a4290');
      l.setAttribute('stroke-width', both ? '2.5' : '1.5');
      l.setAttribute('class', both ? 'done' : toNext ? 'next' : 'todo');
      if (!both) l.setAttribute('stroke-dasharray', '5 6');
      svg.appendChild(l);
    }
    const stars = steps.map((id, i) => {
      const t = stepInfo(id), st = store.getStars(c.key(u, id));
      const cls = done(id) ? 'done' : id === next ? 'next' : 'locked';
      const a = h('a', { class: 'sm-star ' + cls, href: `${c.href}/${u.id}/${id}`, style: `left:${pos[i][0]}%;top:${pos[i][1]}%`, title: t.title, onclick: (e) => launch(e, a) });
      // .node is a fixed box whose centre sits exactly on the point; the label hangs below it
      const node = h('span', { class: 'node' });
      if (cls === 'done') { node.insertAdjacentHTML('beforeend', STAR_SVG); a.append(node, h('span', { class: 'name' }, t.title, h('span', { class: 'st' }, starStr(st)))); }
      else if (cls === 'next') { node.append(h('span', { class: 'ring' }, h('span', { class: 'core' }, t.icon))); a.append(node, h('span', { class: 'name' }, t.title)); }
      else { node.append(h('span', { class: 'dot' })); a.append(node, h('span', { class: 'name' }, t.title)); }
      return a;
    });
    return h('section', { class: 'starmap-card' },
      h('div', { class: 'row space', style: 'align-items:flex-end;justify-content:space-between' },
        h('div', {}, h('div', { class: 'kicker' }, kicker || c.title), h('h1', {}, `${u.icon || '🪐'} ${u.title}`)),
        h('div', { class: 'row', style: 'gap:8px' },
          h('span', { class: 'lit' }, `★ ${lit} / ${steps.length}`),
          unitPlayed(c, u).length ? h('button', { class: 'chip sm-reset', title: 'Start this unit again', 'aria-label': 'Start this unit again', onclick: () => resetUnit(c, u) }, '↺') : null)),
      h('div', { class: 'starmap' }, svg, stars),
      next ? null : h('p', { class: 'note' }, '🎉 Constellation complete!'));
  }

  // ↺ start a unit again: every game of it that has a result (stars or not)
  const unitPlayed = (c, u) => store.me ? store.rows().map(r => r.key).filter(k => k.startsWith(`${c.id}/${u.id}/`)) : [];
  async function resetUnit(c, u) {
    if (!confirm(`Start “${u.title}” again? All its stars and results will be cleared.`)) return;
    try { await store.resetProgress([...new Set([...unitPlayed(c, u), ...gameIds(u).map(id => c.key(u, id))])]); MQ.toast('↺ Done'); route(); }
    catch (e) { MQ.toast('⚠️ ' + e.message); }
  }

  // a click on a star: it flashes, a ring flies out and the map zooms into it, then the game opens
  function launch(e, star) {
    if (!MQ.animOn() || e.metaKey || e.ctrlKey) return; // no animation: open at once
    e.preventDefault();
    const card = star.closest('.starmap-card');
    if (!card || card.classList.contains('warp')) return;
    const cr = card.getBoundingClientRect(), sr = star.getBoundingClientRect();
    const map = star.parentElement, mr = map.getBoundingClientRect();
    const nr = (star.querySelector('.node') || star).getBoundingClientRect();
    const sx = nr.left + nr.width / 2, sy = nr.top + nr.height / 2;
    card.style.transformOrigin = `${sx - cr.left}px ${sy - cr.top}px`;
    map.append(h('span', { class: 'sm-burst', style: `left:${sx - mr.left}px;top:${sy - mr.top}px` }));
    star.classList.add('launch');
    card.classList.add('warp');
    setTimeout(() => { location.hash = star.getAttribute('href'); }, 720);
  }

  // 🌕 moon week: every day with a game this week is a full moon
  function moonWeek() {
    const now = new Date();
    const monday = new Date(now.getFullYear(), now.getMonth(), now.getDate() - ((now.getDay() + 6) % 7));
    const dayKey = (d) => `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
    const played = new Set(store.rows().filter(r => r.updated_at).map(r => dayKey(new Date(r.updated_at))));
    const names = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
    let count = 0;
    const days = names.map((n, i) => {
      const d = new Date(monday.getFullYear(), monday.getMonth(), monday.getDate() + i);
      const isToday = dayKey(d) === dayKey(now);
      const on = played.has(dayKey(d));
      if (on) count++;
      return h('span', { class: isToday ? 'today' : '' }, h('i', { class: on ? 'full' : isToday ? 'half' : '' }), isToday ? 'Today' : n);
    });
    const today = played.has(dayKey(now));
    return h('div', { class: 'panel' },
      h('div', { class: 'row', style: 'justify-content:space-between' }, h('h2', { style: 'margin:0;font-size:.85em' }, '🌙 Moon week'), h('span', { class: 'stars', style: 'font-size:.7em;letter-spacing:0' }, `${count} / 7`)),
      h('div', { class: 'moonweek', title: today ? 'Full moon today!' : 'Play one game today to make a full moon' }, days));
  }

  // ---------- screens ----------
  async function whoScreen() {
    const enter = async (s, pin) => { await store.setMe({ id: s.id, name: s.name, course: s.course, current_unit: s.current_unit, pin: pin || s.pin || '' }); location.hash = '#/'; };
    // A student types only her personal code: names are never shown on this screen
    const code = h('input', { class: 'field big-field', type: 'password', inputmode: 'numeric', autocomplete: 'off', maxlength: 8, placeholder: '• • • •' });
    const msg = h('div', { class: 'feedback bad' });
    const go = async () => {
      msg.textContent = '';
      const p = code.value.trim();
      if (!p) { code.focus(); return; }
      try { const s = await store.loginByPin(p); if (s) return enter(s, p); msg.textContent = 'Wrong code. Try again or ask your teacher.'; }
      catch (e) { msg.textContent = '⚠️ ' + e.message; }
      code.value = ''; code.focus();
    };
    code.addEventListener('keydown', (e) => { if (e.key === 'Enter') go(); });
    // without the database (one browser only) a new player can still start with a name
    const nameInput = h('input', { class: 'field big-field', placeholder: 'Your name', maxlength: 30 });
    const addSelf = async () => {
      const name = nameInput.value.trim();
      if (!name) return;
      const students = await store.students();
      if (students.some(s => s.name.toLowerCase() === name.toLowerCase())) { msg.textContent = 'This name is already here. Enter your code.'; code.focus(); return; }
      enter(await store.saveStudent({ name, pin: store.newPin(students) }));
    };
    nameInput.addEventListener('keydown', (e) => { if (e.key === 'Enter') addSelf(); });
    app.append(
      h('div', { class: 'emoji' }, '🔐'),
      h('h1', {}, "Who's playing?"),
      h('div', { class: 'panel narrow' }, h('p', {}, 'Enter your secret code:'), code, msg, h('button', { class: 'primary', onclick: go }, "Let's go! 🚀"),
        h('p', { class: 'muted' }, 'No code? Ask your teacher.')),
      store.mode === 'local'
        ? h('details', { class: 'panel narrow' }, h('summary', {}, 'New player? Write your name'), nameInput, h('button', { class: 'primary', onclick: addSelf }, "Let's go! 🚀"))
        : null,
    );
    setTimeout(() => code.focus(), 50);
  }

  // Mystery woods: a secret message in a simple code (every letter moves 3 places: A→D, B→E …)
  const SECRETS = ['EVERY MISTAKE IS A CLUE', 'THE WOODS ARE FULL OF WORDS', 'KEEP EXPLORING', 'READ MORE AND YOU WILL SEE MORE', 'BRAVE EXPLORERS ASK QUESTIONS', 'TODAY YOU WILL LEARN SOMETHING NEW'];
  function secretMessage() {
    const shift = (s, n) => s.replace(/[A-Z]/g, ch => String.fromCharCode((ch.charCodeAt(0) - 65 + n + 26) % 26 + 65));
    const msg = SECRETS[Math.floor(Date.now() / 864e5) % SECRETS.length]; // a new message every day
    const ans = h('input', { class: 'field', placeholder: 'Type the message', style: 'text-transform:uppercase' });
    const out = h('div', { class: 'feedback' });
    const check = () => {
      if (MQ.norm(ans.value).replace(/[^a-z ]/g, '') === msg.toLowerCase()) { out.className = 'feedback good'; out.textContent = '🗝️ You cracked the code! ' + msg; MQ.sfx.win && MQ.sfx.win(); }
      else { out.className = 'feedback bad'; out.textContent = 'Not yet. Move every letter 3 back: D→A, E→B, F→C …'; }
    };
    ans.addEventListener('keydown', (e) => { if (e.key === 'Enter') check(); });
    return h('details', { class: 'panel narrow secret' },
      h('summary', {}, '🔐 Secret message of the day'),
      h('div', { class: 'cipher' }, shift(msg, 3)),
      h('p', { class: 'hint' }, 'Code: A→D, B→E, C→F … Can you read it?'),
      h('div', { class: 'row' }, ans, h('button', { class: 'primary', onclick: check }, 'Check')), out);
  }

  async function home() {
    if (!store.me) { location.replace('#/who'); return; }
    const [sets, assigns, fresh] = await Promise.all([store.sets(), store.assignments(), store.meInfo(store.me.id).catch(e => { console.warn('me', e); return null; })]);
    if (fresh) Object.assign(store.me, { name: fresh.name, course: fresh.course, current_unit: fresh.current_unit });
    const mine = new Set(assigns.filter(a => a.student_id === store.me.id).map(a => a.set_id));
    const tasks = sets.filter(s => mine.has(s.id) || s.student_id === store.me.id);
    const now = MQ.nowUnits(store.me);
    // the irregular verbs galaxy is for everyone except the Academy Stars 2 course
    const own = store.me.course && courses[store.me.course] ? [courses[store.me.course]] : [courses.as2, courses.as4];
    const myCourses = own.filter(c => c.id !== 'irr');
    const showVerbs = true; // the irregular verbs folder is for both students
    const showVpr = store.me.course === 'as2'; // ВПР is only for the Academy Stars 2 pupil
    // the star map shows a unit we study now (several: switch with chips)
    const mapUnits = now.length ? now : myCourses.flatMap(c => c.units.map(u => ({ c, u }))).slice(0, 1);
    const pick = Math.min(MQ.load('mapUnit_' + store.me.id, 0), Math.max(0, mapUnits.length - 1));
    const cur = mapUnits[pick];
    const randomGame = () => {
      // any of my units (textbook, folders) and any game in it
      const pool = [...myCourses, ...(showVerbs ? [courses.irr] : [])].flatMap(c => c.units.map(u => ({ c, u })));
      const { c, u } = pool[Math.floor(Math.random() * pool.length)];
      const ids = gameIds(u);
      location.hash = `${c.href}/${u.id}/${ids[Math.floor(Math.random() * ids.length)]}`;
    };
    let side = null, map = null;
    if (cur) {
      const { next } = starState(cur.c, cur.u);
      const t = next && stepInfo(next);
      map = starMap(cur.c, cur.u, `${cur.c.title}${now.length ? ' · now' : ''}`) || h('a', { class: 'panel tile', href: `${cur.c.href}/${cur.u.id}` }, h('div', { class: 'big' }, cur.u.icon || '🪐'), h('div', { class: 'title' }, cur.u.title));
      side = [
        h('div', { class: 'panel' },
          h('div', { class: 'kicker' }, next ? 'Next game' : 'Unit complete'),
          h('div', { class: 'big-title' }, next ? `${t.icon} ${t.title}` : '🎉 All stars are lit!'),
          h('a', { class: 'btn primary', href: next ? `${cur.c.href}/${cur.u.id}/${next}` : `${cur.c.href}/${cur.u.id}` }, next ? '▶ Play' : 'Open the unit'),
          h('div', { class: 'row', style: 'margin-top:8px;justify-content:space-between' },
            h('a', { class: 'btn chip', href: `${cur.c.href}/${cur.u.id}` }, 'All games'),
            h('a', { class: 'btn chip', href: `#/add/${cur.c.id}/${cur.u.id}` }, '＋ My words'))),
      ];
    }
    app.append(
      h('div', { class: 'home-more', style: 'margin-top:0;display:flex;flex-wrap:wrap;align-items:center;justify-content:space-between;gap:10px' },
        h('h1', { style: 'margin:.2em 0;text-align:left' }, `Hi, ${store.me.name}! ${({ magic: '🪄', woods: '🌲' })[MQ.theme(store.me.id)] || '👋'}`),
        h('div', { class: 'row' },
          mapUnits.length > 1 ? mapUnits.map((o, i) => h('button', { class: 'chip' + (i === pick ? ' on' : ''), onclick: () => { MQ.save('mapUnit_' + store.me.id, i); route(); } }, `${o.u.icon || '🪐'} ${o.u.title.split('·')[0].trim()}`)) : null,
          h('button', { class: 'chip', onclick: randomGame }, '🎲 Random game'))),
      h('div', { class: 'home-grid' },
        map,
        h('aside', { class: 'side' },
          side,
          moonWeek(),
          MQ.mistakes.cards().length ? h('a', { class: 'panel mistakes-tile', href: '#/mistakes' },
            h('div', { class: 'big' }, '🔁'),
            h('div', {}, h('div', { class: 'title' }, 'My mistakes'),
              h('div', { class: 'muted' }, MQ.mistakes.dueCount() ? `${MQ.mistakes.dueCount()} today` : '✓')),
            h('span', { class: 'btn primary' }, '▶')) : null,
          MQ.theme(store.me.id) === 'woods' ? secretMessage() : null)),
      tasks.length ? h('div', { class: 'home-more' }, h('h2', {}, '🗂 My cards & tasks'), h('div', { class: 'grid' }, tasks.map(s => {
        const u = MQ.sets.setToUnit(s);
        if (s.kind === 'lesson') {
          const st = store.getStars(`set:${s.id}/lesson`);
          return h('a', { class: 'tile', href: `#/lesson/${s.id}` },
            h('div', { class: 'big' }, '📚'), h('div', { class: 'title' }, s.title), h('div', { class: 'muted' }, u.subtitle),
            h('div', { class: 'stars' }, st ? starStr(st) : 'New lesson'));
        }
        return h('a', { class: 'tile', href: `#/s/${s.id}` },
          h('div', { class: 'big' }, u.icon), h('div', { class: 'title' }, s.title), h('div', { class: 'muted' }, u.subtitle),
          h('div', { class: 'stars' }, `★ ${unitStars(SETS, u)} / ${gameIds(u).length * 3}`));
      }))) : null,
      h('div', { class: 'home-more' }, h('h2', {}, MQ.themed('planets')),
        h('div', { class: 'grid' }, myCourses.flatMap(c => c.units.map(u =>
          h('a', { class: 'tile', href: `${c.href}/${u.id}` },
            h('div', { class: 'big' }, u.icon || '🪐'),
            h('div', { class: 'title' }, u.title),
            h('div', { class: 'muted' }, c.title),
            h('div', { class: 'stars' }, `★ ${unitStars(c, u)} / ${gameIds(u).length * 3}`)))),
          showVerbs ? folderTile(courses.irr) : null,
          showVpr ? folderTile(courses.vpr) : null,
          h('a', { class: 'tile', href: '#/add' }, h('div', { class: 'big' }, '＋'), h('div', { class: 'title' }, 'Add my words'), h('div', { class: 'muted' }, 'Make cards from any text')))),
    );
  }

  // A folder tile that opens a whole collection (e.g. all irregular verb groups)
  function folderTile(c) {
    const verbs = c.units.reduce((n, u) => n + (u.verbs || []).length + (u.vocab || []).length, 0);
    const got = c.units.reduce((n, u) => n + unitStars(c, u), 0);
    const max = c.units.reduce((n, u) => n + gameIds(u).length * 3, 0);
    return h('a', { class: 'tile folder', href: c.href },
      h('div', { class: 'big' }, c.id === 'irr' ? '📁' : c.icon),
      h('div', { class: 'title' }, c.title),
      h('div', { class: 'muted' }, c.id === 'irr' ? `${c.units.length} groups · ${verbs} verbs` : c.id === 'vpr' ? `Вариантов: ${c.units.length}` : `${c.units.length} ${MQ.themed('planet')} · ${verbs} words`),
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
      c.id === 'vpr' ? teacherVariants() : null,
    );
  }
  // ВПР tests made in the teacher room that are not attached to a unit: extra variants in the ВПР folder
  function teacherVariants() {
    const box = h('div');
    store.sets().then(sets => {
      const list = sets.filter(s => s.kind === 'vpr' && !s.unit_key);
      if (!list.length) return;
      box.append(h('h2', {}, '✨ New variants'), h('div', { class: 'grid' }, list.map(s => {
        const su = MQ.sets.setToUnit(s);
        return h('a', { class: 'tile', href: `#/s/${s.id}/vpr` },
          h('div', { class: 'big' }, '📝'), h('div', { class: 'title' }, s.title), h('div', { class: 'muted' }, su.subtitle),
          h('div', { class: 'stars' }, `★ ${unitStars(SETS, su)} / 3`));
      })));
    }).catch(() => {});
    return box;
  }

  // Card sets attached to a textbook unit: the teacher's and this student's own
  function extraCards(c, u) {
    if (c === SETS || !store.me) return null;
    const box = h('div');
    const key = `${c.id}/${u.id}`;
    store.sets().then(sets => {
      const list = sets.filter(s => s.unit_key === key && (!s.student_id || s.student_id === store.me.id));
      if (!list.length) { box.append(h('div', { class: 'row', style: 'margin:6px 0 14px' }, h('a', { class: 'btn chip', href: `#/add/${c.id}/${u.id}` }, '＋ Add my words'))); return; }
      box.append(h('div', { class: 'panel' },
        h('h2', {}, '🃏 Extra cards'),
        list.length ? h('div', { class: 'grid' }, list.map(s => {
          const su = MQ.sets.setToUnit(s);
          return h('a', { class: 'tile', href: `#/s/${s.id}` },
            h('div', { class: 'big' }, s.student_id ? '✍️' : su.icon), h('div', { class: 'title' }, s.title), h('div', { class: 'muted' }, su.subtitle),
            h('div', { class: 'stars' }, `★ ${unitStars(SETS, su)} / ${gameIds(su).length * 3}`));
        })) : h('p', { class: 'muted' }, 'No extra cards yet.'),
        h('div', { class: 'row', style: 'margin-top:12px' }, h('a', { class: 'btn primary', href: `#/add/${c.id}/${u.id}` }, '＋ Add my words'))));
    }).catch(() => {});
    return box;
  }

  // Student adds own words: AI makes cards (word, translation, emoji); they are attached to a unit
  async function addScreen(cid, uid) {
    if (!store.me) { location.replace('#/who'); return; }
    const opts = MQ.unitOptions().filter(o => !store.me.course || o.c.id === store.me.course || (o.c.id === 'irr' && store.me.course !== 'as2'));
    const unitSel = h('select', { class: 'field' }, opts.map(o => h('option', { value: o.key }, o.label)));
    unitSel.value = cid && uid ? `${cid}/${uid}` : ((MQ.nowUnits(store.me)[0] || opts[0] || {}).key || '');
    let items = [];
    const words = h('textarea', { class: 'field', rows: 5, placeholder: 'apple\nbanana\nride a bike' });
    const photo = h('input', { type: 'file', accept: 'image/*', class: 'field' });
    const msg = h('div', { class: 'hint' });
    const table = h('div', { class: 'table-wrap' });
    const render = () => {
      table.innerHTML = '';
      if (!items.length) return;
      table.append(h('table', { class: 'table' },
        h('tr', {}, h('th', {}, 'English'), h('th', {}, 'Перевод'), h('th', {}, '🖼'), h('th', {})),
        items.map((it, k) => h('tr', {},
          ['en', 'ru', 'pic'].map(f => h('td', {}, h('input', { class: 'cell' + (f === 'pic' ? ' pic' : ''), value: it[f] || '', oninput: (e) => { it[f] = e.target.value; } }))),
          h('td', {}, h('button', { class: 'chip', onclick: () => { items.splice(k, 1); render(); } }, '🗑'))))));
    };
    const makeBtn = h('button', { class: 'primary', onclick: async () => {
      if (!words.value.trim() && !photo.files.length) { msg.textContent = 'Write some words or add a photo.'; return; }
      makeBtn.disabled = true; msg.textContent = '✨ Making cards… (10–30 seconds)';
      try {
        if (!MQ.ai.canMakeCards()) throw new Error('no-ai');
        const r = await MQ.ai.recognize({ text: words.value.trim(), files: [...photo.files] });
        const got = r.kind === 'verbs' ? r.items.map(v => ({ en: v.base, ru: `${v.v2} – ${v.v3}${v.ru ? ' · ' + v.ru : ''}` })) : r.items;
        items = items.concat(got);
        msg.textContent = `✅ ${got.length} cards. Check them and press Save.`;
      } catch (e) {
        // without AI: make simple cards from the lines ("apple - яблоко 🍎")
        const r = MQ.sets.parse('words', words.value);
        items = items.concat(r.items);
        msg.textContent = e.message === 'no-ai' ? 'Cards are ready — add the translations yourself.' : '⚠️ AI: ' + e.message + ' — you can add translations yourself.';
      }
      words.value = ''; makeBtn.disabled = false; render();
    } }, '✨ Make cards');
    const saveBtn = h('button', { class: 'primary', onclick: async () => {
      const clean = items.filter(it => it.en && it.en.trim()).map(it => ({ en: it.en.trim(), ru: (it.ru || '').trim(), pic: (it.pic || '').trim() }));
      if (!clean.length) { msg.textContent = 'Add at least one card.'; return; }
      saveBtn.disabled = true;
      try {
        const { set: saved } = await MQ.dict.saveMyWords(unitSel.value, clean);
        location.hash = `#/s/${saved.id}`;
      } catch (e) { msg.textContent = '⚠️ ' + e.message; saveBtn.disabled = false; }
    } }, '💾 Save my cards');
    app.append(
      h('a', { href: '#/', class: 'back' }, '← Home'),
      h('h1', {}, '✍️ Add my words'),
      h('div', { class: 'panel narrow', style: 'max-width:640px' },
        h('label', { class: 'lbl' }, '📍 Unit'), unitSel,
        h('label', { class: 'lbl' }, 'Write English words — one per line'), words,
        h('label', { class: 'lbl' }, '…or take a photo of the page'), photo,
        h('div', { class: 'row', style: 'margin-top:10px' }, makeBtn), msg),
      h('div', { class: 'panel' }, h('h2', {}, '🃏 My new cards'), table, h('div', { class: 'row', style: 'margin-top:12px' }, saveBtn)),
    );
    render();
  }

  function unit(c, u) {
    app.append(
      c.folder ? h('a', { href: c.href, class: 'back' }, '← ' + c.title) : h('a', { href: '#/', class: 'back' }, '← Home'),
      starMap(c, u, [c.title, u.subtitle].filter(Boolean).join(' · ')) || h('h1', {}, `${u.icon || '🪐'} ${u.title}`),
      pathSteps(c, u).length < 2 ? h('p', { class: 'muted' }, u.subtitle || '') : null,
      gameSections(c, u),
      extraCards(c, u),
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
      unitPlayed(c, u).length ? h('div', { class: 'row', style: 'margin:4px 0 12px' }, h('button', { class: 'chip', onclick: () => resetUnit(c, u) }, '↺ Start the unit again')) : null,
    );
  }

  // games of a unit in two groups: vocabulary and grammar (+ the unit test)
  const VOCAB_GAMES = ['flash', 'listen', 'match', 'memory', 'spell', 'hangman', 'crossword', 'sort', 'whack', 'wrunner', 'blocks', 'odd'];
  const GRAMMAR_GAMES = ['quiz', 'gapfill', 'fixit', 'order', 'dictation', 'jeopardy', 'vflash', 'vmemory', 'vchoose', 'vspell', 'vtype', 'vrunner'];
  function gameSections(c, u) {
    const ids = gameIds(u);
    const tile = (id) => {
      const g = MQ.gt(id, games[id]);
      return h('a', { class: 'tile', href: `${c.href}/${u.id}/${id}`, title: g.desc || '' },
        h('div', { class: 'big' }, g.icon), h('div', { class: 'title' }, g.title),
        h('div', { class: 'stars' }, starStr(store.getStars(c.key(u, id)))));
    };
    const group = (label, list) => list.length ? h('div', { class: 'game-group' }, h('h2', {}, label), h('div', { class: 'grid' }, list.map(tile))) : null;
    const vocab = ids.filter(id => VOCAB_GAMES.includes(id));
    const grammar = ids.filter(id => GRAMMAR_GAMES.includes(id));
    const test = ids.filter(id => id === 'vpr');
    const other = ids.filter(id => !vocab.includes(id) && !grammar.includes(id) && !test.includes(id));
    return h('div', { class: 'game-sections' },
      h('div', { class: 'row', style: 'margin:6px 0 4px' }, h('button', { class: 'chip', onclick: () => {
        location.hash = `${c.href}/${u.id}/${ids[Math.floor(Math.random() * ids.length)]}`;
      } }, '🎲 Random game')),
      group('🔤 Vocabulary', [...vocab, ...other]),
      group('🧩 Grammar', grammar),
      group('📝 Test', test));
  }

  // 🌱 emergent vocabulary: words the teacher adds after a lesson join the vocabulary games of the units we study now
  async function withEmergent(c, u) {
    if (!u || !store.me || c.folder || c === SETS) return u;
    const now = MQ.nowUnits(store.me);
    if (now.length && !now.some(o => o.c === c && o.u.id === u.id)) return u;
    let sets = [];
    try { sets = await store.sets(); } catch (e) { return u; }
    const set = sets.find(s => s.unit_key === 'emergent' && s.student_id === store.me.id);
    if (!set || !(set.items || []).length) return u;
    const have = new Set((u.vocab || []).map(v => String(v.en).toLowerCase()));
    const extra = set.items.slice(-20).filter(w => w.en && !have.has(w.en.toLowerCase())).map(w => Object.assign({}, w, { group: '🌱 From our lessons' }));
    return extra.length ? Object.assign({}, u, { vocab: [...(u.vocab || []), ...extra] }) : u;
  }

  // ---------- unit path: a few steps in a good order, one main button ----------
  const PATH = ['flash', 'vflash', 'listen', 'match', 'spell', 'vspell', 'quiz', 'vchoose', 'order', 'vtype', 'gapfill'];
  function pathSteps(c, u) {
    const steps = PATH.filter(id => games[id] && games[id].available(u)).slice(0, 5);
    if (u.vpr && c.id !== 'vpr') steps.push('vpr');
    return steps;
  }
  // ---------- "My mistakes" deck ----------
  const MISTAKES = { id: 'mistakes', title: 'My mistakes', icon: '🔁', href: '#', noUnit: true, key: () => MQ.mistakes.KEY_DECK };
  function mistakesScreen() {
    if (!store.me) { location.replace('#/who'); return; }
    if (!MQ.mistakes.cards().length) {
      app.append(h('a', { href: '#/', class: 'back' }, '← Home'), h('div', { class: 'panel narrow' },
        h('div', { class: 'emoji' }, '🌟'), h('h2', {}, 'No mistakes yet!'), h('p', { class: 'muted' }, 'Words you get wrong in any game will come here.')));
      return;
    }
    play(MISTAKES, { id: '', title: 'Home' }, 'mdeck');
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
        if (stars >= 2) setTimeout(() => MQ.sfx.win(), 250);
        // tests keep a history of results (date, points) for the teacher
        let data;
        if (gameId === 'vpr') {
          const prev = store.deck(c.key(u, gameId));
          data = Object.assign({}, prev, { history: [...(prev.history || []), { t: Date.now(), c: correct, n: total }].slice(-30) });
        }
        if (!itemsOverride || label !== 'mistakes only') store.record(c.key(u, gameId), { stars, correct, total, mistakes, data });
        if (gameId !== 'mdeck' && gameId !== 'vpr' && mistakes.length) MQ.mistakes.add(mistakes).catch(e => console.warn('mistakes', e));
        root.innerHTML = '';
        root.append(h('div', { class: 'panel' },
          h('div', { class: 'emoji' }, stars === 3 ? '🏆' : stars === 2 ? MQ.themed('good') : '🌱'),
          h('h2', {}, stars === 3 ? 'Excellent!' : stars === 2 ? 'Good work!' : 'Keep practising!'),
          h('div', { class: 'stars', style: 'font-size:2em' }, starStr(stars)),
          h('p', {}, `Correct: ${correct} / ${total}`),
          mistakes.length ? h('p', { class: 'muted' }, 'Practise these again: ' + mistakes.map(m => m.en || m.q || m.base || '').join(', ')) : null,
          h('div', { class: 'row' },
            mistakes.length ? h('button', { class: 'primary', onclick: () => play(c, u, gameId, MQ.shuffle(mistakes), 'mistakes only') }, `🔁 Practise mistakes (${mistakes.length})`) : null,
            h('button', { onclick: () => play(c, u, gameId, itemsOverride, label) }, '▶ Play again'),
            h('a', { class: 'btn', href: `${c.href}/${u.id}` }, MQ.themed('back'))),
          store.me && store.getStars(c.key(u, gameId)) ? h('div', { class: 'row', style: 'margin-top:10px' }, h('button', { class: 'chip', onclick: async (e) => {
            if (!confirm('Clear your stars for this game?')) return;
            try { await store.resetProgress([c.key(u, gameId)]); e.target.textContent = '✓ Cleared'; e.target.disabled = true; } catch (err) { MQ.toast('⚠️ ' + err.message); }
          } }, '↺ Clear my stars')) : null));
      },
    };
    const tg = MQ.gt(gameId, g);
    // words tapped in texts go to this unit (ВПР variants: to the unit the student studies now)
    MQ.pageUnitKey = c === SETS ? (u.unitKey || null) : (c.id === 'vpr' || c.noUnit) ? null : `${c.id}/${u.id}`;
    app.append(
      // compact header so the game fits on one screen
      h('div', { class: 'game-head' },
        h('a', { href: `${c.href}/${u.id}`, class: 'back' }, '← ' + String(u.title).split('·')[0].trim()),
        h('h1', { title: tg.desc || '' }, `${tg.icon} ${tg.title}`,
          h('button', { class: 'chip restart', title: 'Start again: clear all answers', onclick: () => { MQ.stopSpeech(); play(c, u, gameId, itemsOverride, label); } }, '🔄')),
        itemsOverride ? h('p', { class: 'muted' }, label) : null),
      root,
    );
    document.body.classList.add('in-game');
    g.run(ctx, itemsOverride || g.items(u));
  }

  async function setRoute(id, gid) {
    const set = await store.getSet(id);
    if (!set) { app.append(h('p', {}, 'This task was deleted.'), h('a', { class: 'btn', href: '#/' }, 'Home')); return; }
    const u = MQ.sets.setToUnit(set);
    if (gid && games[gid]) play(SETS, u, gid); else unit(SETS, u);
  }

  async function lessonRoute(id) {
    if (!store.me && !store.isTeacher()) { location.replace('#/who'); return; }
    const set = await store.getSet(id);
    if (!set || set.kind !== 'lesson') { app.append(h('p', {}, 'This lesson was deleted.'), h('a', { class: 'btn', href: '#/' }, 'Home')); return; }
    MQ.lessons.lessonScreen(app, set);
  }

  // Personal link from the teacher: #/login/<student id>/<code>
  async function loginLink(id, pin) {
    try {
      const s = await store.loginByPin(pin);
      if (s && s.id === id) { await store.setMe({ id: s.id, name: s.name, course: s.course, current_unit: s.current_unit, pin }); location.replace('#/'); return; }
    } catch (e) { MQ.toast('⚠️ ' + e.message); }
    location.replace('#/who');
  }

  // ---------- router ----------
  let seq = 0;
  async function route() {
    const my = ++seq;
    MQ.stopSpeech();
    app.innerHTML = '';
    document.body.classList.remove('in-game');
    document.body.classList.toggle('teacher-page', (location.hash || '').startsWith('#/teacher'));
    MQ.applyTheme(store.me && store.me.id);
    renderWho();
    const parts = (location.hash || '#/').split('/');
    try {
      const [, top, a, b, c3] = parts;
      if (top === 'who') { await store.setMe(null); renderWho(); await whoScreen(); }
      else if (top === 'login' && a) await loginLink(a, decodeURIComponent(b || ''));
      else if (top === 'add') await addScreen(a, b);
      else if (top === 'mistakes') mistakesScreen();
      else if (top === 'lesson' && a) await lessonRoute(a);
      else if (top === 'teacher') await MQ.teacher.route(app, parts);
      else if (top === 's' && a) await setRoute(a, b);
      else if (top === 'c' && courses[a]) {
        const c = courses[a];
        const u = await withEmergent(c, c.units.find(x => x.id === b));
        if (u && c3 && games[c3]) play(c, u, c3);
        else if (u) unit(c, u);
        else course(c);
      } else await home();
    } catch (e) {
      console.error(e);
      if (my === seq) {
        app.innerHTML = '';
        const offline = /connection|fetch|network/i.test(e.message);
        app.append(h('div', { class: 'panel narrow' },
          h('div', { class: 'emoji' }, offline ? '📡' : '⚠️'),
          h('h2', {}, offline ? 'No connection' : 'Something went wrong'),
          h('p', { class: 'muted' }, offline ? 'Нет связи с сервером. Проверьте интернет и нажмите «Повторить».' : e.message),
          h('div', { class: 'row' }, h('button', { class: 'primary', onclick: () => route() }, '🔄 Повторить'), h('a', { class: 'btn', href: '#/' }, 'Home'))));
      }
    }
    if (my === seq) window.scrollTo(0, 0);
  }
  MQ.route = route;
  MQ.withEmergent = withEmergent;

  // A link to the page we are already on (e.g. "← Unit" after "Practise") must still re-render.
  document.addEventListener('click', (e) => {
    const a = e.target.closest('a[href^="#"]');
    if (a && a.getAttribute('href') === (location.hash || '#/')) { e.preventDefault(); route(); }
  });
  window.addEventListener('hashchange', route);
  // the settings menu closes on a click outside it or with Esc
  document.addEventListener('click', (e) => { const d = document.querySelector('details.settings[open]'); if (d && !d.contains(e.target)) d.open = false; });
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape') { const d = document.querySelector('details.settings[open]'); if (d) d.open = false; } });

  (async () => {
    try { await store.init(); } catch (e) { console.error(e); MQ.toast('⚠️ ' + e.message); }
    // students who logged in before codes were kept on the device enter their code once more
    if (store.me && store.mode === 'cloud' && !store.me.pin) await store.setMe(null);
    if (store.me) await store.setMe(store.me);
    route();
  })();
})();
