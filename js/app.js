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
      h('a', { class: 'btn chip', href: '#/teacher', title: 'Teacher' }, '👩‍🏫'));
  }

  // ---------- screens ----------
  async function whoScreen() {
    const students = await store.students();
    const enter = async (s, pin) => { await store.setMe({ id: s.id, name: s.name, course: s.course, pin: pin || s.pin || '' }); location.hash = '#/'; };
    // Ask for the personal code before entering
    const pick = (s) => {
      if (store.mode === 'local' && !s.pin) return enter(s);
      const code = h('input', { class: 'field big-field', type: 'password', inputmode: 'numeric', autocomplete: 'off', maxlength: 8, placeholder: '• • • •' });
      const msg = h('div', { class: 'feedback bad' });
      const go = async () => {
        msg.textContent = '';
        try { if (await store.checkPin(s.id, code.value)) return enter(s, code.value.trim()); msg.textContent = 'Wrong code. Try again or ask your teacher.'; }
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
    const [sets, assigns, students] = await Promise.all([store.sets(), store.assignments(), store.students()]);
    const fresh = students.find(s => s.id === store.me.id);
    if (fresh) Object.assign(store.me, { name: fresh.name, course: fresh.course, current_unit: fresh.current_unit });
    const mine = new Set(assigns.filter(a => a.student_id === store.me.id).map(a => a.set_id));
    const tasks = sets.filter(s => mine.has(s.id) || s.student_id === store.me.id);
    const now = MQ.nowUnits(store.me);
    // the irregular verbs galaxy is for everyone except the Academy Stars 2 course
    const own = store.me.course && courses[store.me.course] ? [courses[store.me.course]] : [courses.as2, courses.as4];
    const myCourses = own.filter(c => c.id !== 'irr');
    const showVerbs = store.me.course !== 'as2';
    const showVpr = store.me.course === 'as2'; // ВПР is only for the Academy Stars 2 pupil
    app.append(
      h('h1', {}, `Hello, ${store.me.name}! ${MQ.theme(store.me.id) === 'magic' ? '🪄' : '👋'}`),
      h('div', { class: 'row theme-row' },
        h('span', { class: 'muted' }, 'Theme:'),
        ['space', 'magic'].map(t => h('button', { class: 'chip' + (MQ.theme(store.me.id) === t ? ' on' : ''), onclick: () => { MQ.setTheme(store.me.id, t); route(); } },
          t === 'space' ? '🚀 Space' : '🪄 Magic school'))),
      now.length ? h('div', { class: 'panel now' },
        h('div', { class: 'muted' }, '📍 Now we study'),
        now.map(o => h('div', { class: 'now-row' },
          h('div', {}, h('div', { class: 'title' }, `${o.u.icon || '🪐'} ${o.u.title}`), h('div', { class: 'muted' }, o.c.title)),
          h('div', { class: 'row' },
            h('a', { class: 'btn chip', href: `${o.c.href}/${o.u.id}` }, 'Open'),
            h('a', { class: 'btn chip', href: `#/add/${o.c.id}/${o.u.id}` }, '＋ Add my words'))))) :
        h('div', { class: 'row' }, h('a', { class: 'btn primary', href: '#/add' }, '＋ Add my words')),
      h('div', { class: 'row', style: 'margin-top:10px' }, h('button', { onclick: () => {
        // any of my units (textbook, folders) and any game in it
        const pool = [...myCourses, ...(showVerbs ? [courses.irr] : []), courses.magic].flatMap(c => c.units.map(u => ({ c, u })));
        const { c, u } = pool[Math.floor(Math.random() * pool.length)];
        const ids = gameIds(u);
        location.hash = `${c.href}/${u.id}/${ids[Math.floor(Math.random() * ids.length)]}`;
      } }, '🎲 Surprise me: random game')),
      tasks.length ? h('h2', {}, '🗂 My cards & tasks') : null,
      tasks.length ? h('div', { class: 'grid' }, tasks.map(s => {
        const u = MQ.sets.setToUnit(s);
        return h('a', { class: 'tile', href: `#/s/${s.id}` },
          h('div', { class: 'big' }, u.icon), h('div', { class: 'title' }, s.title), h('div', { class: 'muted' }, u.subtitle),
          h('div', { class: 'stars' }, `★ ${unitStars(SETS, u)} / ${gameIds(u).length * 3}`));
      })) : null,
      h('h2', {}, MQ.themed('planets')),
      h('div', { class: 'grid' }, myCourses.flatMap(c => c.units.map(u =>
        h('a', { class: 'tile', href: `${c.href}/${u.id}` },
          h('div', { class: 'big' }, u.icon || '🪐'),
          h('div', { class: 'title' }, u.title),
          h('div', { class: 'muted' }, c.title),
          h('div', { class: 'stars' }, `★ ${unitStars(c, u)} / ${gameIds(u).length * 3}`)))),
        showVerbs ? folderTile(courses.irr) : null,
        showVpr ? folderTile(courses.vpr) : null,
        folderTile(courses.magic)),
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
      h('h1', {}, `${u.icon || '🪐'} ${u.title}`),
      h('p', { class: 'muted' }, u.subtitle || ''),
      u.vpr && c.id !== 'vpr' ? h('div', { class: 'panel unit-test' },
        h('div', {}, h('div', { class: 'title' }, '📝 Unit test'), h('div', { class: 'muted' }, 'Формат ВПР: аудирование, чтение, грамматика, анкета · 25 баллов')),
        h('a', { class: 'btn primary', href: `${c.href}/${u.id}/vpr` }, '▶ Пройти тест')) : null,
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
      h('div', { class: 'row', style: 'margin-bottom:12px' }, h('button', { class: 'primary', onclick: () => {
        const ids = gameIds(u);
        location.hash = `${c.href}/${u.id}/${ids[Math.floor(Math.random() * ids.length)]}`;
      } }, '🎲 Random game')),
      h('div', { class: 'grid' }, gameIds(u).map(id => {
        const g = games[id];
        return h('a', { class: 'tile', href: `${c.href}/${u.id}/${id}` },
          h('div', { class: 'big' }, MQ.gt(id, g).icon),
          h('div', { class: 'title' }, MQ.gt(id, g).title),
          h('div', { class: 'muted' }, MQ.gt(id, g).desc),
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
        if (stars >= 2) setTimeout(() => MQ.sfx.win(), 250);
        if (!itemsOverride || label !== 'mistakes only') store.record(c.key(u, gameId), { stars, correct, total, mistakes });
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
            h('a', { class: 'btn', href: `${c.href}/${u.id}` }, MQ.themed('back')))));
      },
    };
    const tg = MQ.gt(gameId, g);
    // words tapped in texts go to this unit (ВПР variants: to the unit the student studies now)
    MQ.pageUnitKey = c === SETS ? (u.unitKey || null) : c.id === 'vpr' ? null : `${c.id}/${u.id}`;
    app.append(
      // compact header so the game fits on one screen
      h('div', { class: 'game-head' },
        h('a', { href: `${c.href}/${u.id}`, class: 'back' }, '← ' + u.title),
        h('h1', {}, `${tg.icon} ${tg.title}`,
          h('button', { class: 'chip restart', title: 'Start again: clear all answers', onclick: () => { MQ.stopSpeech(); play(c, u, gameId, itemsOverride, label); } }, '🔄')),
        h('p', { class: 'muted' }, tg.desc, itemsOverride ? ` (${label})` : '')),
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

  // Personal link from the teacher: #/login/<student id>/<code>
  async function loginLink(id, pin) {
    const s = (await store.students()).find(x => x.id === id);
    if (s && await store.checkPin(id, pin)) { await store.setMe({ id: s.id, name: s.name, course: s.course, pin }); location.replace('#/'); return; }
    location.replace('#/who');
  }

  // ---------- router ----------
  let seq = 0;
  async function route() {
    const my = ++seq;
    MQ.stopSpeech();
    app.innerHTML = '';
    document.body.classList.remove('in-game');
    MQ.applyTheme(store.me && store.me.id);
    renderWho();
    const parts = (location.hash || '#/').split('/');
    try {
      const [, top, a, b, c3] = parts;
      if (top === 'who') { await store.setMe(null); renderWho(); await whoScreen(); }
      else if (top === 'login' && a) await loginLink(a, decodeURIComponent(b || ''));
      else if (top === 'add') await addScreen(a, b);
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

  // A link to the page we are already on (e.g. "← Unit" after "Practise") must still re-render.
  document.addEventListener('click', (e) => {
    const a = e.target.closest('a[href^="#"]');
    if (a && a.getAttribute('href') === (location.hash || '#/')) { e.preventDefault(); route(); }
  });
  window.addEventListener('hashchange', route);

  (async () => {
    try { await store.init(); } catch (e) { console.error(e); MQ.toast('⚠️ ' + e.message); }
    // students who logged in before codes were kept on the device enter their code once more
    if (store.me && store.mode === 'cloud' && !store.me.pin) await store.setMe(null);
    if (store.me) await store.setMe(store.me);
    route();
  })();
})();
