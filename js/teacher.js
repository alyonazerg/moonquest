// Teacher room: students, card sets (with AI recognition), assignments, progress, settings, audio.
(function () {
  const { h, store, courses, games, toast } = MQ;
  const COURSE_NAMES = { '': '—', as2: 'Academy Stars 2', as4: 'Academy Stars 4' };
  const input = (attrs) => h('input', Object.assign({ class: 'field' }, attrs));

  // ---------- progress labels ----------
  function whereLabel(where, setsById) {
    if (where.startsWith('set:')) {
      const s = setsById[where.slice(4)];
      return `📝 ${s ? s.title : 'удалённый набор'}`;
    }
    const [cid, unitId] = where.split('/');
    const c = courses[cid];
    const u = c && c.units.find(x => x.id === unitId);
    return `${c ? c.icon + ' ' + c.title : cid} · ${u ? u.title : unitId}`;
  }
  const gameTitle = (game) => game === 'lesson' ? 'Урок' : games[game] ? games[game].title : game;
  const splitKey = (key) => [key.slice(0, key.lastIndexOf('/')), key.slice(key.lastIndexOf('/') + 1)];
  function keyLabel(key, setsById) {
    const [where, game] = splitKey(key);
    return `${whereLabel(where, setsById)} · ${gameTitle(game)}`;
  }
  const pct = (c, t) => t ? Math.round(c / t * 100) : null;
  const VPR_MARKS = [[22, 5], [15, 4], [10, 3], [0, 2]];
  const vprMark = (c, n) => n === 25 ? VPR_MARKS.find(([min]) => c >= min)[1] : null;

  // summary per unit / set: how many answers were right, average stars
  function unitSummary(rows, setsById) {
    const by = {};
    rows.forEach(p => {
      const [where] = splitKey(p.key);
      const g = by[where] || (by[where] = { where, c: 0, t: 0, stars: 0, games: 0, last: '' });
      g.c += +p.correct || 0; g.t += +p.total || 0; g.stars += +p.stars || 0; g.games++;
      if (String(p.updated_at) > g.last) g.last = String(p.updated_at);
    });
    const list = Object.values(by).sort((a, b) => b.last.localeCompare(a.last));
    if (!list.length) return null;
    return h('div', { class: 'table-wrap' }, h('table', { class: 'table' },
      h('tr', {}, h('th', {}, 'Юнит / набор'), h('th', {}, 'Верно'), h('th', {}, 'Игр'), h('th', {}, 'Ср. звёзды'), h('th', {}, 'Последний раз')),
      list.map(g => {
        const k = pct(g.c, g.t);
        return h('tr', {},
          h('td', {}, whereLabel(g.where, setsById)),
          h('td', { class: k == null ? 'muted' : k < 70 ? 'weak' : 'okk' }, k == null ? '—' : `${k}% (${g.c}/${g.t})`),
          h('td', {}, String(g.games)),
          h('td', {}, (g.stars / g.games).toFixed(1) + ' ★'),
          h('td', { class: 'muted' }, fmtDate(g.last)));
      })));
  }

  // the latest cards in the mistakes deck, grouped by kind
  function weakSpots(items) {
    const KIND = { word: '🔤 Слова', verb: '🔁 Глаголы', qa: '✏️ Грамматика и вопросы', sent: '📜 Предложения' };
    const list = Object.values(items || {}).sort((a, b) => (b.added || 0) - (a.added || 0));
    if (!list.length) return h('p', { class: 'muted' }, 'Колода ошибок пустая — отлично!');
    const text = (x) => {
      const it = x.item || {};
      if (x.kind === 'verb') return `${it.base} – ${it.v2} – ${it.v3}`;
      if (x.kind === 'qa') return `${it.q} → ${it.a}`;
      return it.ru ? `${it.en} (${it.ru})` : it.en;
    };
    return h('div', {}, Object.entries(KIND).map(([kind, label]) => {
      const of = list.filter(x => x.kind === kind);
      if (!of.length) return null;
      return h('div', { style: 'margin:6px 0' }, h('b', {}, `${label} (${of.length}): `),
        h('span', {}, of.slice(0, 12).map(text).join(' · ') + (of.length > 12 ? ' …' : '')));
    }));
  }

  // VPR / unit test results over time: bars with points and marks
  function vprHistory(rows, setsById) {
    const tests = rows.filter(p => p.key.endsWith('/vpr') && p.data && Array.isArray(p.data.history) && p.data.history.length);
    if (!tests.length) return null;
    return h('div', {}, h('h3', {}, '📝 История ВПР и тестов'), tests.map(p => {
      const hist = p.data.history.slice(-12);
      const max = Math.max(...hist.map(x => x.n || 1));
      return h('div', { style: 'margin-bottom:12px' },
        h('div', { class: 'muted' }, whereLabel(splitKey(p.key)[0], setsById)),
        h('div', { class: 'hist', style: 'margin-top:22px' }, hist.map(x => {
          const m = vprMark(x.c, x.n);
          const bar = h('div', { class: 'bar', title: `${x.c}/${x.n} · ${fmtDate(x.t)}`, style: `height:${Math.max(4, Math.round((x.c / max) * 100))}%` },
            h('span', {}, m ? `${x.c}·«${m}»` : `${x.c}/${x.n}`));
          return bar;
        })),
        h('div', { class: 'muted', style: 'font-size:.8em' }, `${fmtDate(hist[0].t)} → ${fmtDate(hist[hist.length - 1].t)}`));
    }));
  }

  // CSV for Excel / Google Sheets: semicolon separator and BOM so Cyrillic opens correctly
  function downloadCsv(name, rows, setsById) {
    const q = (v) => '"' + String(v ?? '').replace(/"/g, '""') + '"';
    const head = ['Юнит / набор', 'Игра', 'Звёзды', 'Верно', 'Всего', '%', 'Последний раз', 'Сыграно раз', 'Ошибки'];
    const lines = rows.map(p => {
      const [where, game] = splitKey(p.key);
      const mist = (p.mistakes || []).map(m => typeof m === 'string' ? m : (m && (m.en || m.q || m.base)) || '').filter(Boolean);
      return [whereLabel(where, setsById), gameTitle(game), p.stars || 0, p.correct ?? '', p.total ?? '', pct(p.correct, p.total) ?? '',
        p.updated_at ? new Date(p.updated_at).toLocaleString('ru-RU') : '', p.plays || '', mist.join(', ')].map(q).join(';');
    });
    const blob = new Blob(['\ufeff' + [head.map(q).join(';'), ...lines].join('\r\n')], { type: 'text/csv;charset=utf-8' });
    const a = h('a', { href: URL.createObjectURL(blob), download: `progress-${name}-${new Date().toISOString().slice(0, 10)}.csv` });
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(a.href), 2000);
  }
  const fmtDate = (d) => d ? new Date(d).toLocaleString('ru-RU', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }) : '';
  const stars = (n) => '★'.repeat(n) + '☆'.repeat(3 - n);

  // ---------- texts that the games read aloud ----------
  function spokenTexts(unit) {
    const t = new Set();
    (unit.vocab || []).forEach(v => { t.add(v.en); });
    (unit.sentences || []).forEach(s => t.add(s.en));
    // dialogue lines: boys / men get the second voice, saved under "♂ text"
    // dialogue lines are recorded with the voice of the speaker's role, saved as "[boy] text" etc.
    ((unit.vpr && unit.vpr.tasks) || []).forEach(x => (x.dialog || []).forEach(([who, line]) => {
      const r = MQ.roleOf(who);
      if (r === 'woman') t.add(line); else t.add(`[${r}] ${line}`); // every role gets a Mistral voice (fallback in voiceFor)
    }));
    (unit.grammar || []).forEach(g => g.items.forEach(it => { if (it.q.includes(' ')) t.add(it.q.replace('___', it.a)); }));
    (unit.verbs || []).forEach(v => { t.add(MQ.verbSay(v)); t.add(v.base); t.add(MQ.formSay(v, 'v2')); t.add(MQ.formSay(v, 'v3')); });
    return [...t].filter(Boolean);
  }
  async function recordAudio(units, statusEl) {
    const texts = [...new Set(units.flatMap(spokenTexts))].filter(x => !store.audioUrl(x));
    if (!texts.length) { statusEl.textContent = '✅ Всё уже озвучено.'; return; }
    let done = 0, failed = 0, lastErr = '';
    for (const text of texts) {
      statusEl.textContent = `🔊 Озвучиваю ${done + 1} / ${texts.length}: «${text}»`;
      const m = text.match(/^\[(man|girl|boy)\] ([\s\S]*)$/);
      try { await store.saveAudio(text, await MQ.ai.tts(m ? m[2] : text, m ? MQ.ai.voiceFor(m[1]) : undefined)); }
      catch (e) { failed++; lastErr = e.message; if (failed >= 3 && done === 0) break; }
      done++;
    }
    statusEl.textContent = failed ? `⚠️ Готово с ошибками: ${failed} из ${done}. ${lastErr}` : `✅ Озвучено: ${done}.`;
  }

  // several units with checkboxes, grouped by course (folders collapsed)
  function unitChecklist(value) {
    const on = new Set(String(value || '').split(',').map(x => x.trim()).filter(Boolean));
    const boxes = [];
    const box = h('div', { class: 'unit-checks' }, Object.values(courses).filter(c => c.units.length).map(c => {
      const rows = c.units.map(u => {
        const key = `${c.id}/${u.id}`;
        const cb = h('input', { type: 'checkbox' });
        cb.checked = on.has(key);
        boxes.push([key, cb]);
        return h('label', { class: 'check' }, cb, ` ${u.icon || '🪐'} ${u.title}`);
      });
      const count = c.units.filter(u => on.has(`${c.id}/${u.id}`)).length;
      return c.folder
        ? h('details', { open: count > 0 }, h('summary', {}, `${c.icon} ${c.title}${count ? ` (${count})` : ''}`), rows)
        : h('div', {}, h('div', { class: 'muted' }, `${c.icon} ${c.title}`), rows);
    }));
    box.getValue = () => boxes.filter(([, cb]) => cb.checked).map(([k]) => k).join(',');
    return box;
  }

  function unitSelect(value, emptyLabel) {
    const sel = h('select', { class: 'field' }, h('option', { value: '' }, '— ' + emptyLabel + ' —'),
      MQ.unitOptions().map(o => h('option', { value: o.key }, o.label)));
    sel.value = value || '';
    return sel;
  }

  // ---------- screens ----------
  function tabs(active) {
    const t = (href, label, id) => h('a', { class: 'btn chip' + (active === id ? ' on' : ''), href }, label);
    return h('div', { class: 'row', style: 'margin:10px 0 18px' },
      t('#/teacher', '👧 Ученицы', 'students'), t('#/teacher/sets', '🗂 Наборы карточек', 'sets'), t('#/teacher/lessons', '📚 Уроки по учебнику', 'lessons'), t('#/teacher/settings', '⚙️ Настройки', 'settings'));
  }
  function header(app, active) {
    app.append(h('h1', {}, '👩‍🏫 Кабинет учителя'),
      store.mode === 'local' ? h('p', { class: 'hint' }, 'Локальный режим: данные хранятся только в этом браузере. Чтобы ученицы занимались со своих устройств, подключите базу (см. SETUP.md).') : null,
      tabs(active));
  }

  function loginScreen(app) {
    const email = input({ type: 'email', placeholder: 'Email' });
    const pass = input({ type: 'password', placeholder: 'Пароль' });
    const msg = h('div', { class: 'feedback bad' });
    app.append(h('h1', {}, '👩‍🏫 Вход для учителя'), h('div', { class: 'panel narrow' },
      email, pass, msg,
      h('button', { class: 'primary', onclick: async () => {
        try { await store.signIn(email.value.trim(), pass.value); MQ.route(); }
        catch (e) { msg.textContent = e.message; }
      } }, 'Войти')));
  }

  async function studentsScreen(app) {
    header(app, 'students');
    const [students, assigns] = await Promise.all([store.students(), store.assignments()]);
    // every student gets a personal code
    // every student gets her own code, and no two students share one
    const seen = new Set();
    for (const st of students) {
      if (!st.pin || seen.has(st.pin)) { st.pin = store.newPin(students); await store.saveStudent({ id: st.id, name: st.name, course: st.course, pin: st.pin }); }
      seen.add(st.pin);
    }
    const name = input({ placeholder: 'Имя ученицы' });
    const course = h('select', { class: 'field' }, Object.entries(COURSE_NAMES).map(([v, l]) => h('option', { value: v }, l)));
    app.append(
      h('div', { class: 'panel' },
        h('h2', {}, 'Добавить ученицу'),
        h('div', { class: 'row' }, name, course,
          h('button', { class: 'primary', onclick: async () => {
            if (!name.value.trim()) return;
            await store.saveStudent({ name: name.value.trim(), course: course.value, pin: store.newPin(students) });
            MQ.route();
          } }, '＋ Добавить'))),
      students.length ? h('div', { class: 'grid' }, students.map(s => h('a', { class: 'tile', href: `#/teacher/st/${s.id}` },
        h('div', { class: 'big' }, '👧'),
        h('div', { class: 'title' }, s.name),
        h('div', { class: 'muted' }, COURSE_NAMES[s.course || '']),
        h('div', { class: 'muted' }, '🔑 Код: ' + (s.pin || '—')),
        h('div', { class: 'muted' }, `Наборов назначено: ${assigns.filter(a => a.student_id === s.id).length}`)))) : h('p', { class: 'muted' }, 'Пока нет учениц.'),
    );
  }

  async function studentScreen(app, id) {
    header(app, 'students');
    const [students, sets, assigns, progress] = await Promise.all([store.students(), store.sets(), store.assignments(), store.progress(id)]);
    const s = students.find(x => x.id === id);
    if (!s) { app.append(h('p', {}, 'Ученица не найдена.')); return; }
    const setsById = Object.fromEntries(sets.map(x => [x.id, x]));
    const mine = new Set(assigns.filter(a => a.student_id === id).map(a => a.set_id));
    const nameF = input({ value: s.name });
    const pinF = input({ value: s.pin || '', placeholder: 'Код', inputmode: 'numeric', maxlength: 8, style: 'width:7em;min-width:0' });
    const link = `${location.href.split('#')[0]}#/login/${s.id}/${encodeURIComponent(s.pin || '')}`;
    const linkBtn = h('button', { onclick: async () => {
      try { await navigator.clipboard.writeText(link); linkBtn.textContent = '✅ Ссылка скопирована'; }
      catch (e) { window.prompt('Скопируйте ссылку:', link); }
    } }, '🔗 Скопировать личную ссылку');
    const course = h('select', { class: 'field' }, Object.entries(COURSE_NAMES).map(([v, l]) => h('option', { value: v }, l)));
    course.value = s.course || '';
    const nowUnit = unitChecklist(s.current_unit || '');
    const deckRow = progress.find(p => p.key === 'mistakes:items');
    const deckSize = deckRow && deckRow.data ? Object.keys(deckRow.data).length : 0;
    const rows = progress.filter(p => !p.key.startsWith('mistakes:')).sort((a, b) => String(b.updated_at).localeCompare(String(a.updated_at)));
    app.append(
      h('a', { href: '#/teacher', class: 'muted' }, '← Все ученицы'),
      h('div', { class: 'panel' },
        h('h2', {}, '👧 ' + s.name),
        h('div', { class: 'row' }, nameF, course, h('span', {}, '🔑'), pinF,
          h('button', { class: 'primary', onclick: async () => {
            const pin = pinF.value.trim() || s.pin;
            const twin = students.find(x => x.id !== id && x.pin === pin);
            if (twin) { toast(`Код ${pin} уже у ученицы ${twin.name}. Придумайте другой.`); return; }
            if (!/^\d{4,8}$/.test(pin)) { toast('Код — от 4 до 8 цифр.'); return; }
            await store.saveStudent({ id, name: nameF.value.trim() || s.name, course: course.value, pin, current_unit: nowUnit.getValue() }); toast('Сохранено'); MQ.route(); } }, '💾 Сохранить'),
          h('button', { class: 'ghost', onclick: async () => { if (confirm(`Удалить ${s.name} и весь её прогресс?`)) { await store.deleteStudent(id); location.hash = '#/teacher'; } } }, '🗑 Удалить')),
        h('label', { class: 'lbl' }, '📍 Сейчас проходим — можно отметить несколько (сюда прикрепляются новые карточки ученицы)'), nowUnit,
        h('p', { class: 'hint' }, `Чтобы войти, ${s.name} вводит только свой код ${s.pin || ''} — имён на сайте не видно. Или отправьте ей личную ссылку — она откроет сайт сразу под её именем.`),
        h('div', { class: 'row' }, linkBtn)),
      emergentPanel(s, sets),
      h('div', { class: 'panel' },
        h('h2', {}, '🗂 Назначенные наборы'),
        sets.length ? sets.map(set => {
          const cb = h('input', { type: 'checkbox', onchange: async (e) => { await store.assign(id, set.id, e.target.checked); toast(e.target.checked ? 'Назначено' : 'Снято'); } });
          cb.checked = mine.has(set.id);
          return h('label', { class: 'check' }, cb, ` ${({ verbs: '🔁', jeopardy: '🏆', vpr: '📝' }[set.kind] || '📝')} ${set.title} `, h('span', { class: 'muted' }, `(${set.items.length})`));
        }) : h('p', { class: 'muted' }, 'Наборов пока нет. Создайте их во вкладке «Наборы карточек».')),
      h('div', { class: 'panel' },
        h('div', { class: 'row', style: 'justify-content:space-between;align-items:center' }, h('h2', {}, '📈 Прогресс'),
          rows.length ? h('button', { onclick: () => downloadCsv(s.name, rows, setsById) }, '⬇️ Скачать CSV') : null),
        rows.length ? h('h3', {}, '📊 Сводка по юнитам') : null,
        unitSummary(rows, setsById),
        rows.length ? h('p', { class: 'hint' }, 'Красным — меньше 70% верных ответов: эту тему стоит повторить.') : null,
        vprHistory(rows, setsById),
        h('h3', {}, `🔁 Слабые места — колода ошибок (${deckSize})`),
        weakSpots(deckRow && deckRow.data),
        rows.length ? h('h3', {}, '🎮 Все игры') : null,
        rows.length ? h('div', { class: 'table-wrap' }, h('table', { class: 'table' },
          h('tr', {}, h('th', {}, 'Игра'), h('th', {}, 'Звёзды'), h('th', {}, 'Последний раз'), h('th', {}, 'Ошибки'), h('th', {})),
          rows.map(p => h('tr', {},
            h('td', {}, keyLabel(p.key, setsById)),
            h('td', { class: 'stars' }, stars(p.stars || 0)),
            h('td', {}, `${p.correct ?? ''}/${p.total ?? ''} · ${fmtDate(p.updated_at)}${p.plays ? ` · ×${p.plays}` : ''}`),
            h('td', { class: 'muted' }, (p.mistakes || []).join(', ')),
            h('td', {}, h('button', { class: 'chip', title: 'Сбросить прохождение этой игры', onclick: async () => {
              if (!confirm(`Сбросить «${keyLabel(p.key, setsById)}» у ${s.name}? Звёзды и результаты этой игры удалятся.`)) return;
              try { await store.deleteProgress(id, [p.key]); toast('↺ Сброшено'); MQ.route(); } catch (e) { toast('⚠️ ' + e.message); }
            } }, '↺')))))) : h('p', { class: 'muted' }, 'Ещё не играла.'),
        rows.length ? h('div', { class: 'row', style: 'justify-content:flex-start;margin-top:10px' }, h('button', { class: 'chip', onclick: async () => {
          if (!confirm(`Сбросить ВСЁ прохождение у ${s.name}? Звёзды, результаты и уроки удалятся (колода ошибок останется).`)) return;
          try { await store.deleteProgress(id, rows.map(p => p.key)); toast('↺ Сброшено'); MQ.route(); } catch (e) { toast('⚠️ ' + e.message); }
        } }, '↺ Сбросить всё прохождение')) : null),
      rows.some(p => p.key.endsWith('/lesson')) ? h('div', { class: 'panel left' },
        h('h2', {}, '📚 Уроки: ответы, записи голоса и письменные работы'),
        rows.filter(p => p.key.endsWith('/lesson')).map(p => {
          const set = setsById[splitKey(p.key)[0].slice(4)];
          return h('details', { open: true }, h('summary', {}, `${set ? set.title : 'удалённый урок'} · ${fmtDate(p.updated_at)}`), MQ.lessons.answersView(p, set));
        })) : null,
    );
  }

  // 🌱 emergent vocab: new words from each lesson for one student
  function emergentPanel(st, sets) {
    const set = sets.find(x => x.unit_key === 'emergent' && x.student_id === st.id);
    const items = set ? set.items : [];
    const save = (list) => store.saveSet({ id: set && set.id, title: '🌱 Words from our lessons', kind: 'words', items: list, unit_key: 'emergent', student_id: st.id });
    const ta = h('textarea', { class: 'field', rows: 4, placeholder: 'Новые слова с урока — по одному в строке:\nsuddenly = вдруг\nhomework – домашнее задание\nbrave' });
    const msg = h('div', { class: 'hint' });
    const add = h('button', { class: 'primary', onclick: async () => {
      const parsed = MQ.sets.parse('words', ta.value).items;
      if (!parsed.length) { msg.textContent = 'Напишите хотя бы одно слово.'; return; }
      add.disabled = true;
      try {
        const missing = parsed.filter(w => !w.ru);
        if (missing.length && MQ.ai.canMakeCards()) {
          msg.textContent = '✨ ИИ добавляет перевод и картинку…';
          const r = await MQ.ai.recognize({ text: missing.map(w => w.en).join('\n') });
          missing.forEach(w => { const f = (r.items || []).find(x => x.en && x.en.toLowerCase() === w.en.toLowerCase()); if (f) { w.ru = f.ru; w.pic = w.pic || f.pic; } });
        }
        const date = new Date().toISOString().slice(0, 10);
        const have = new Set(items.map(w => w.en.toLowerCase()));
        const fresh = parsed.filter(w => !have.has(w.en.toLowerCase())).map(w => ({ en: w.en, ru: w.ru || '', pic: w.pic || '', added: date }));
        await save([...items, ...fresh]);
        toast(`Добавлено слов: ${fresh.length}`); MQ.route();
      } catch (e) { msg.textContent = '⚠️ ' + e.message; }
      add.disabled = false;
    } }, '＋ Добавить слова');
    const byDate = {};
    items.forEach((w, i) => { (byDate[w.added || ''] = byDate[w.added || ''] || []).push([w, i]); });
    return h('div', { class: 'panel left' },
      h('h2', {}, '🌱 Emergent vocab — новые слова с уроков'),
      h('p', { class: 'hint' }, `Последние 20 слов сами попадают в словарные игры текущего юнита у ${st.name}, а все слова — в набор «🌱 Words from our lessons» у неё на главной. Перевод можно не писать: его допишет ИИ.`),
      ta, h('div', { class: 'row', style: 'justify-content:flex-start' }, add), msg,
      Object.keys(byDate).sort().reverse().map(d => h('div', { class: 'em-day' },
        h('div', { class: 'muted' }, d ? new Date(d).toLocaleDateString('ru-RU', { day: 'numeric', month: 'long' }) : 'Без даты'),
        h('div', { class: 'row', style: 'justify-content:flex-start' }, byDate[d].map(([w, i]) => h('span', { class: 'em-word' },
          `${w.pic ? w.pic + ' ' : ''}${w.en}${w.ru ? ' — ' + w.ru : ''}`,
          h('button', { class: 'chip', title: 'Удалить слово', onclick: async () => { await save(items.filter((_, k) => k !== i)); MQ.route(); } }, '✕')))))));
  }

  async function setsScreen(app) {
    header(app, 'sets');
    const [sets, students, assigns] = await Promise.all([store.sets(), store.students(), store.assignments()]);
    const names = Object.fromEntries(students.map(s => [s.id, s.name]));
    app.append(
      h('div', { class: 'row' }, h('a', { class: 'btn primary', href: '#/teacher/set/new' }, '＋ Новый набор'), h('a', { class: 'btn primary', href: '#/teacher/set/new-vpr' }, '📝 ＋ Новый вариант ВПР')),
      sets.length ? h('div', { class: 'grid', style: 'margin-top:16px' }, sets.map(set => {
        const who = assigns.filter(a => a.set_id === set.id).map(a => names[a.student_id]).filter(Boolean);
        return h('div', { class: 'tile' },
          h('div', { class: 'big' }, ({ verbs: '🔁', jeopardy: '🏆' }[set.kind] || '📝')),
          h('div', { class: 'title' }, set.title),
          h('div', { class: 'muted' }, `${set.items.length} ${({ verbs: 'глаголов', jeopardy: 'вопросов', vpr: 'задания' }[set.kind] || 'слов')}`),
          set.unit_key ? h('div', { class: 'muted' }, '📍 ' + ((MQ.findUnit(set.unit_key) || {}).label || set.unit_key)) : null,
          set.student_id ? h('div', { class: 'muted' }, '✍️ создала ' + (names[set.student_id] || 'ученица')) : h('div', { class: 'muted' }, who.length ? '👧 ' + who.join(', ') : 'не назначен'),
          h('div', { class: 'row', style: 'margin-top:8px' },
            h('a', { class: 'btn chip', href: `#/teacher/set/${set.id}` }, '✏️ Изменить'),
            h('a', { class: 'btn chip', href: `#/s/${set.id}` }, '▶ Играть')));
      })) : h('p', { class: 'muted' }, 'Наборов пока нет.'),
    );
  }

  async function setEditor(app, id, startKind) {
    header(app, 'sets');
    const [existing, students, assigns] = await Promise.all([id ? store.getSet(id) : null, store.students(), store.assignments()]);
    const set = existing || { title: '', kind: startKind || 'words', items: [] };
    let items = set.items.map(x => Object.assign({}, x));
    const title = input({ value: set.title, placeholder: 'Название, например: Food · Unit 3' });
    const kind = h('select', { class: 'field' }, h('option', { value: 'words' }, '📝 Слова'), h('option', { value: 'verbs' }, '🔁 Неправильные глаголы'), h('option', { value: 'jeopardy' }, '🏆 Своя игра (Jeopardy)'), h('option', { value: 'vpr' }, '📝 ВПР: вариант или тест по юниту AS2'));
    kind.value = set.kind;
    // default unit: the one the assigned student is studying now
    const firstAssigned = students.find(st => assigns.some(a => a.set_id === set.id && a.student_id === st.id));
    const unitSel = unitSelect(set.unit_key || (existing ? '' : ((MQ.nowUnits(firstAssigned || students.find(st => st.current_unit)) || [])[0] || {}).key || ''), 'не прикреплять');

    // --- AI recognition ---
    const aiText = h('textarea', { class: 'field', rows: 4, placeholder: 'Вставьте текст, список слов или страницу учебника…' });
    const files = h('input', { type: 'file', accept: 'image/*', multiple: true, class: 'field' });
    const aiMsg = h('div', { class: 'hint' });
    const aiBtn = h('button', { class: 'primary', onclick: async () => {
      if (!MQ.ai.canMakeCards()) { aiMsg.textContent = `Сначала добавьте ключ ${MQ.ai.PROVIDER_NAMES[MQ.ai.settings.provider]} во вкладке «Настройки».`; return; }
      if (kind.value === 'vpr') {
        if (!unitSel.value && !aiText.value.trim() && !files.files.length) {
          // a general ВПР variant: topics and grammar of the 4th grade (from the ВПР description)
          aiText.value = 'A general ВПР variant for the 4th grade. Topics: family, my day, food, birthday, hobbies, pets, sport, holidays, my room and house, school and subjects, friends, my town, animals, weather and seasons, shopping, Russia and English-speaking countries. Grammar: Present Simple, Present Continuous, Past Simple, to be going to, Future Simple (will), must / have to, the negative pronoun no, comparatives and superlatives (good – better – best), time (5 o’clock).';
        }
        aiBtn.disabled = true; aiMsg.textContent = '✨ Составляю тест: 4 задания… (30–60 секунд)';
        try {
          const r = await MQ.ai.generateVpr({ text: aiText.value.trim(), files: [...files.files], unitKey: unitSel.value });
          items = r.tasks;
          if (!title.value.trim()) title.value = r.title || 'Unit test';
          const problems = MQ.vprCheck.validate(items);
          aiMsg.textContent = problems.length ? '⚠️ Тест получился с ошибками, проверьте ниже или сгенерируйте ещё раз.' : '✅ Тест готов. Проверьте его ниже.';
          renderTable();
        } catch (e) { aiMsg.textContent = '⚠️ ' + e.message; }
        aiBtn.disabled = false;
        return;
      }
      if (!aiText.value.trim() && !files.files.length) { aiMsg.textContent = 'Добавьте текст или фото.'; return; }
      aiBtn.disabled = true; aiMsg.textContent = kind.value === 'jeopardy' ? '✨ Придумываю вопросы… (20–40 секунд)' : '✨ Распознаю… (10–30 секунд)';
      try {
        const r = kind.value === 'jeopardy'
          ? Object.assign({ kind: 'jeopardy' }, await MQ.ai.generateJeopardy({ text: aiText.value.trim(), files: [...files.files] }))
          : await MQ.ai.recognize({ text: aiText.value.trim(), files: [...files.files] });
        if (items.length && r.kind !== kind.value) items = [];
        kind.value = r.kind;
        items = items.concat(r.items);
        if (!title.value.trim() && r.title) title.value = r.title;
        aiMsg.textContent = `✅ Найдено: ${r.items.length}. Проверьте и поправьте таблицу ниже.`;
        renderTable();
      } catch (e) { aiMsg.textContent = '⚠️ ' + e.message; }
      aiBtn.disabled = false;
    } }, '✨ Распознать с ИИ');

    // --- paste as text ---
    const paste = h('textarea', { class: 'field', rows: 4 });
    const pasteBtn = h('button', { onclick: () => {
      const r = MQ.sets.parse(kind.value, paste.value);
      items = items.concat(r.items); paste.value = '';
      if (r.errors.length) toast(r.errors.join('; '));
      renderTable();
    } }, '➕ Добавить в таблицу');
    const pasteHelp = () => {
      paste.placeholder = { verbs: 'go - went - gone идти\nsee saw seen', jeopardy: 'Animals | 100 | Как по-английски «кошка»? | cat\nPast Simple | 200 | go → ? | went' }[kind.value] || 'apple - яблоко 🍎\nbread - хлеб';
      aiText.placeholder = kind.value === 'jeopardy' ? 'Тема или материал: например «Past Simple + слова Unit 2: castle, princess, goose…». Можно фото страницы.' : 'Вставьте текст, список слов или страницу учебника…';
      aiBtn.textContent = kind.value === 'vpr' ? '✨ Сгенерировать ВПР с ИИ' : kind.value === 'jeopardy' ? '✨ Сгенерировать игру с ИИ' : '✨ Распознать с ИИ';
      if (kind.value === 'vpr') aiText.placeholder = 'Тест по юниту: выберите юнит (📍) — ИИ возьмёт его слова и грамматику. Новый вариант ВПР: оставьте «не прикреплять» и напишите темы, например: «Темы 4 класса: семья, школа, животные, погода. Грамматика: Present Simple, Past Simple, going to, can, степени сравнения».';
    };

    // --- editable table ---
    const tableBox = h('div', { class: 'table-wrap' });
    const cols = () => kind.value === 'jeopardy' ? [['cat', 'Тема'], ['pts', 'Баллы'], ['q', 'Вопрос'], ['a', 'Ответ']] : kind.value === 'verbs'
      ? [['base', 'V1'], ['v2', 'V2'], ['v3', 'V3'], ['ru', 'Перевод']]
      : [['en', 'English'], ['ru', 'Перевод'], ['pic', 'Картинка']];
    function renderTable() {
      pasteHelp();
      if (kind.value === 'vpr') return renderVpr();
      const c = cols();
      const words = kind.value === 'words';
      tableBox.replaceChildren(h('table', { class: 'table' },
        h('tr', {}, c.map(([, l]) => h('th', {}, l)), h('th', {})),
        items.map((it, k) => h('tr', {},
          c.map(([f]) => h('td', { style: f === 'pic' ? 'white-space:nowrap' : null },
            f === 'pic' && it.img ? h('img', { class: 'cell-img', src: it.img, alt: '' }) : h('input', { class: 'cell' + (f === 'pic' ? ' pic' : ''), value: it[f] || '', oninput: (e) => { it[f] = e.target.value; } }),
            f === 'pic' && it.img ? h('button', { class: 'chip', title: 'Убрать картинку (останется эмодзи)', onclick: () => { delete it.img; renderTable(); } }, '✕') : null,
            f === 'pic' && !it.img ? h('button', { class: 'chip', title: 'Нарисовать картинку (OpenAI)', onclick: (e) => drawOne(it, e.target) }, '🎨') : null)),
          h('td', {}, h('button', { class: 'chip', title: 'Удалить строку', onclick: () => { items.splice(k, 1); renderTable(); } }, '🗑')))),
      ), h('div', { class: 'row', style: 'margin-top:8px' },
        h('button', { class: 'chip', onclick: () => { items.push({}); renderTable(); } }, '＋ строка'),
        words && items.length ? h('button', { class: 'chip', onclick: (e) => drawAll(e.target) }, '🎨 Нарисовать картинки ко всем словам (OpenAI)') : null),
      picMsg);
    }
    // a test is edited as JSON with a readable preview
    function renderVpr() {
      const box = h('textarea', { class: 'field mono', rows: 18, spellcheck: 'false' });
      box.value = items.length ? JSON.stringify(items, null, 1) : '';
      const info = h('div', { class: 'hint' });
      const preview = h('div', { class: 'vpr-preview' });
      const show = () => {
        const problems = items.length ? MQ.vprCheck.validate(items) : ['Сгенерируйте тест кнопкой «✨ Сгенерировать тест по юниту»'];
        info.innerHTML = '';
        info.append(problems.length ? h('div', { style: 'color:var(--bad)' }, problems.slice(0, 8).join(' · ')) : h('div', { style: 'color:var(--good)' }, '✅ Формат ВПР: 4 задания, 25 баллов'));
        preview.innerHTML = '';
        if (!problems.length) items.forEach((t, k) => preview.append(h('details', {},
          h('summary', {}, `Задание ${k + 1}: ${{ listen: 'аудирование', read: 'чтение', grammar: 'грамматика', form: 'анкета' }[t.type]} ${t.heading ? '· ' + t.heading : ''}`),
          t.dialog ? t.dialog.map(([w, s]) => h('div', {}, h('b', {}, w + ': '), s)) : null,
          t.text ? h('p', {}, t.text) : null,
          (t.questions || []).map((q, i) => h('div', {}, `${'ABCDE'[i]}. ${q.q} — `, q.options.map((o, j) => h('span', { style: j + 1 === q.a ? 'color:var(--good);font-weight:800' : '' }, `${j + 1}) ${o}  `)))),
          (t.gaps || []).map((g, i) => h('div', {}, `${'ABCDE'[i]}: `, g.options.map((o, j) => h('span', { style: j + 1 === g.a ? 'color:var(--good);font-weight:800' : '' }, `${j + 1}) ${o}  `)))),
          (t.fields || []).map((f, i) => h('div', {}, `${i + 1}. ${f.label}: ${f.a.join(' / ')}`)))));
      };
      box.oninput = () => {
        try { items = MQ.vprCheck.normalize(JSON.parse(box.value)); box.classList.remove('bad'); show(); }
        catch (e) { box.classList.add('bad'); info.textContent = '⚠️ Ошибка в JSON: ' + e.message; }
      };
      show();
      tableBox.replaceChildren(info, preview, h('details', {}, h('summary', {}, '✏️ Править вручную (JSON)'), box));
    }
    const picMsg = h('div', { class: 'hint' });
    async function drawOne(it, btn) {
      if (!it.en) { toast('Сначала впишите слово'); return; }
      if (btn) { btn.disabled = true; btn.textContent = '⏳'; }
      try { it.img = await store.saveImage(await MQ.ai.drawPicture(it.en, it.ru)); }
      catch (e) { picMsg.textContent = '⚠️ ' + e.message; if (btn) { btn.disabled = false; btn.textContent = '🎨'; } return false; }
      renderTable();
      return true;
    }
    async function drawAll(btn) {
      const todo = items.filter(it => it.en && !it.img);
      if (!todo.length) { picMsg.textContent = 'У всех слов уже есть картинки.'; return; }
      if (!confirm(`Нарисовать ${todo.length} картинок через OpenAI? Это платно (примерно 1 цент за картинку) и займёт около ${Math.ceil(todo.length * 15 / 60)} мин.`)) return;
      btn.disabled = true;
      for (let i = 0; i < todo.length; i++) {
        picMsg.textContent = `🎨 Рисую ${i + 1} / ${todo.length}: ${todo[i].en}…`;
        if (!(await drawOne(todo[i]))) return;
      }
      picMsg.textContent = '✅ Картинки готовы. Не забудьте сохранить набор.';
    }
    let prevKind = kind.value;
    const limitUnits = () => {
      const vpr = kind.value === 'vpr';
      [...unitSel.options].forEach(o => { o.hidden = vpr && o.value && !o.value.startsWith('as2/'); });
      if (vpr && unitSel.value && !unitSel.value.startsWith('as2/')) unitSel.value = '';
    };
    kind.onchange = () => { if (items.length && !confirm('Сменить тип? Таблица будет очищена.')) { kind.value = prevKind; return; } prevKind = kind.value; items = []; limitUnits(); renderTable(); };
    limitUnits();
    renderTable();

    // --- assignments ---
    const mine = new Set(assigns.filter(a => a.set_id === set.id).map(a => a.student_id));
    const checks = students.map(s => { const cb = h('input', { type: 'checkbox' }); cb.checked = mine.has(s.id); return { s, cb }; });

    const status = h('div', { class: 'hint' });
    app.append(
      h('a', { href: '#/teacher/sets', class: 'muted' }, '← Все наборы'),
      h('div', { class: 'panel' }, h('h2', {}, existing ? '✏️ Набор карточек' : '＋ Новый набор'), h('div', { class: 'row' }, title, kind),
        h('label', { class: 'lbl' }, '📍 Прикрепить к юниту (карточки появятся на его странице). Для нового варианта ВПР — «не прикреплять»: он появится в папке «ВПР 4 класс»'), unitSel),
      h('div', { class: 'panel' },
        h('h2', {}, '✨ Распознать с помощью ИИ'),
        h('p', { class: 'hint' }, `Фото страницы учебника, скриншот или текст: ИИ найдёт слова, переведёт и подберёт эмодзи. Сейчас работает через ${MQ.ai.PROVIDER_NAMES[MQ.ai.settings.provider]} (меняется в Настройках).`),
        aiText, files, h('div', { class: 'row' }, aiBtn), aiMsg),
      h('details', { class: 'panel' }, h('summary', {}, '📋 Или вставить списком'), paste, h('div', { class: 'row' }, pasteBtn)),
      h('div', { class: 'panel' }, h('h2', {}, '🃏 Карточки'), tableBox),
      h('div', { class: 'panel' }, h('h2', {}, '👧 Назначить'),
        checks.length ? checks.map(({ s, cb }) => h('label', { class: 'check' }, cb, ' ' + s.name)) : h('p', { class: 'muted' }, 'Сначала добавьте учениц.')),
      h('div', { class: 'row' },
        h('button', { class: 'primary', onclick: async () => {
          if (kind.value === 'vpr') {
            const problems = MQ.vprCheck.validate(items);
            if (problems.length) { toast('⚠️ ' + problems[0]); return; }
            try {
              const saved = await store.saveSet({ id: set.id, title: title.value.trim() || 'Unit test', kind: 'vpr', items, unit_key: unitSel.value, student_id: set.student_id });
              for (const { s, cb } of checks) if (cb.checked !== mine.has(s.id)) await store.assign(s.id, saved.id, cb.checked);
              toast('💾 Тест сохранён');
              if (store.mode === 'cloud' && MQ.ai.hasKey()) await recordAudio([MQ.sets.setToUnit(saved)], status);
              location.hash = '#/teacher/sets';
            } catch (e) { toast('⚠️ ' + e.message); }
            return;
          }
          const clean = items.filter(it => kind.value === 'verbs' ? it.base && it.v2 && it.v3 : kind.value === 'jeopardy' ? it.q && it.a : it.en)
            .map(it => Object.fromEntries(Object.entries(it).filter(([, v]) => v).map(([k, v]) => [k, String(v).trim()])));
          if (!clean.length) { toast('Добавьте хотя бы одну карточку'); return; }
          try {
            const saved = await store.saveSet({ id: set.id, title: title.value.trim() || 'Words', kind: kind.value, items: clean, unit_key: unitSel.value, student_id: set.student_id });
            for (const { s, cb } of checks) if (cb.checked !== mine.has(s.id)) await store.assign(s.id, saved.id, cb.checked);
            toast('💾 Сохранено');
            if (store.mode === 'cloud' && MQ.ai.hasKey()) await recordAudio([MQ.sets.setToUnit(saved)], status);
            location.hash = '#/teacher/sets';
          } catch (e) { toast('⚠️ ' + e.message); }
        } }, '💾 Сохранить'),
        existing ? h('button', { class: 'ghost', onclick: async () => { if (confirm('Удалить набор?')) { await store.deleteSet(set.id); location.hash = '#/teacher/sets'; } } }, '🗑 Удалить') : null),
      status,
    );
  }

  function settingsScreen(app) {
    header(app, 'settings');
    const s = MQ.ai.settings;
    const key = input({ type: 'password', value: s.key, placeholder: 'API-ключ Mistral' });
    const chat = input({ value: s.chatModel });
    const ttsM = input({ value: s.ttsModel });
    const ROLES = [
      ['woman', '👩 Женщина — основной голос (слова, предложения, мамы, учителя)'],
      ['man', '👨 Мужчина (папы, дедушки)'],
      ['girl', '👧 Девочка'],
      ['boy', '👦 Мальчик'],
    ];
    const fields = {};
    const previews = {};
    let playing = null;
    const PHRASE = "Hello! I'm your English voice. Let's play and learn new words together!";
    async function play(voiceSpec, btn) {
      MQ.ai.saveSettings({ key: key.value.trim() });
      if (playing) playing.pause();
      const k = typeof voiceSpec === 'object' ? 'sample:' + voiceSpec.sample.slice(0, 40) : voiceSpec;
      btn.disabled = true; btn.textContent = '⏳';
      try {
        if (!previews[k]) previews[k] = URL.createObjectURL(await MQ.ai.tts(PHRASE, voiceSpec));
        playing = new Audio(previews[k]); await playing.play();
      } catch (e) { msg.textContent = '⚠️ ' + e.message; }
      btn.disabled = false; btn.textContent = '▶';
    }
    const roleRows = ROLES.map(([role, label]) => {
      const [presetF, refF] = MQ.ai.ROLE_FIELDS[role];
      const id = input({ value: s[presetF], placeholder: role === 'woman' ? MQ.ai.DEFAULT_VOICE : 'id голоса или образец 📎' });
      const info = h('span', { class: 'hint' });
      const file = h('input', { type: 'file', accept: 'audio/*', hidden: true });
      const showInfo = () => { info.textContent = MQ.ai.settings[refF] ? '🎙 образец загружен' : ''; clearBtn.hidden = !MQ.ai.settings[refF]; };
      const clearBtn = h('button', { class: 'chip', title: 'Убрать образец', onclick: () => { MQ.ai.saveSettings({ [refF]: '' }); showInfo(); } }, '✕');
      file.onchange = async () => {
        const f = file.files[0];
        if (!f) return;
        if (f.size > 2_000_000) { info.textContent = '⚠️ файл больше 2 МБ'; return; }
        MQ.ai.saveSettings({ [refF]: await MQ.ai.fileToBase64(f) });
        showInfo();
      };
      const playBtn = h('button', { class: 'chip', title: 'Послушать', onclick: () => {
        const spec = MQ.ai.settings[refF] ? { sample: MQ.ai.settings[refF] } : (id.value.trim() || (role === 'woman' ? MQ.ai.DEFAULT_VOICE : ''));
        if (!spec) { msg.textContent = 'Для этой роли ещё нет голоса: выберите его в списке или загрузите образец.'; return; }
        play(spec, playBtn);
      } }, '▶');
      fields[role] = { id, presetF };
      showInfo();
      return h('div', { class: 'role-row' },
        h('div', { class: 'role-label' }, label),
        h('div', { class: 'row', style: 'justify-content:flex-start;flex-wrap:nowrap' }, id, playBtn,
          h('button', { class: 'chip', title: 'Загрузить образец голоса (5–15 секунд, mp3/wav)', onclick: () => file.click() }, '📎'), clearBtn, file),
        info);
    });
    const saveVoices = () => MQ.ai.saveSettings(Object.fromEntries(Object.values(fields).map(f => [f.presetF, f.id.value.trim()])));
    const voicesBox = h('div', { class: 'hint' });
    const listVoices = h('button', { class: 'chip', onclick: async () => {
      MQ.ai.saveSettings({ key: key.value.trim() });
      voicesBox.textContent = 'Загружаю…';
      try {
        const vs = await MQ.ai.voices();
        voicesBox.replaceChildren(
          h('div', { class: 'hint' }, '▶ — послушать голос; 👩 👨 👧 👦 — поставить его для этой роли'),
          ...(vs.length ? vs.map(v => h('span', { class: 'voice-chip' },
            (() => { const b = h('button', { class: 'chip', onclick: () => play(v.id, b) }, '▶'); return b; })(),
            `${v.name}${v.lang ? ' · ' + v.lang : ''} `,
            ...ROLES.map(([role, label]) => h('button', { class: 'chip', title: label, onclick: () => { fields[role].id.value = v.id; saveVoices(); } }, label.split(' ')[0])))) : [document.createTextNode('Список пуст')]));
      } catch (e) { voicesBox.textContent = '⚠️ ' + e.message; }
    } }, '📋 Показать все голоса Mistral');
    const provider = h('select', { class: 'field' }, Object.entries(MQ.ai.PROVIDER_NAMES).map(([v, l]) => h('option', { value: v }, l)));
    provider.value = s.provider;
    const aKey = input({ type: 'password', value: s.anthropicKey, placeholder: 'sk-ant-…' });
    const aModel = input({ value: s.claudeModel });
    const oKey = input({ type: 'password', value: s.openaiKey, placeholder: 'sk-…' });
    const oModel = input({ value: s.openaiModel });
    const iModel = input({ value: s.imageModel });
    const cardsMsg = h('div', { class: 'hint' });
    const msg = h('div', { class: 'hint' });
    const audioMsg = h('div', { class: 'hint' });
    const allUnits = Object.values(courses).flatMap(c => c.units);
    app.append(
      h('div', { class: 'panel' },
        h('h2', {}, '✨ ИИ для карточек'),
        h('p', { class: 'hint' }, 'Ключи хранятся только в этом браузере и отправляются только своему сервису. Ученицам они не нужны.'),
        h('label', { class: 'lbl' }, 'Кто распознаёт слова (слово — перевод — эмодзи)'), provider,
        h('label', { class: 'lbl' }, 'Ключ Claude (console.anthropic.com → API Keys)'), aKey,
        h('label', { class: 'lbl' }, 'Модель Claude'), aModel,
        h('label', { class: 'lbl' }, 'Ключ OpenAI (platform.openai.com → API keys) — также рисует картинки'), oKey,
        h('label', { class: 'lbl' }, 'Модель OpenAI для распознавания'), oModel,
        h('label', { class: 'lbl' }, 'Модель OpenAI для картинок'), iModel,
        h('p', { class: 'hint' }, 'Для Mistral используется ключ из блока ниже.'),
        h('div', { class: 'row', style: 'margin-top:12px' },
          h('button', { class: 'primary', onclick: () => {
            MQ.ai.saveSettings({ provider: provider.value, anthropicKey: aKey.value.trim(), claudeModel: aModel.value.trim(), openaiKey: oKey.value.trim(), openaiModel: oModel.value.trim(), imageModel: iModel.value.trim() });
            cardsMsg.textContent = '💾 Сохранено';
          } }, '💾 Сохранить')),
        cardsMsg),
      h('div', { class: 'panel' },
        h('h2', {}, '🔊 Mistral: озвучка'),
        h('label', { class: 'lbl' }, 'API-ключ'), key,
        h('label', { class: 'lbl' }, 'Модель Mistral для распознавания карточек'), chat,
        h('label', { class: 'lbl' }, 'Модель озвучки'), ttsM,
        h('label', { class: 'lbl' }, 'Голоса (для каждой роли — готовый голос из списка или свой образец 📎 на 5–15 секунд)'),
        roleRows,
        h('p', { class: 'hint' }, 'Детских готовых голосов у Mistral может не быть — тогда загрузите образец детского голоса (📎). Записывайте голос ребёнка только с согласия родителей.'),
        h('div', { class: 'row', style: 'justify-content:flex-start' }, listVoices), voicesBox,
        h('div', { class: 'row', style: 'margin-top:12px' },
          h('button', { class: 'primary', onclick: () => { MQ.ai.saveSettings({ key: key.value.trim(), chatModel: chat.value.trim(), ttsModel: ttsM.value.trim() }); saveVoices(); msg.textContent = '💾 Сохранено'; } }, '💾 Сохранить'),
          h('button', { onclick: async () => {
            MQ.ai.saveSettings({ key: key.value.trim(), chatModel: chat.value.trim(), ttsModel: ttsM.value.trim() }); saveVoices();
            msg.textContent = '🔊 Проверяю…';
            try { const b = await MQ.ai.tts("Hello! Let's learn English."); await new Audio(URL.createObjectURL(b)).play(); msg.textContent = '✅ Голос работает'; }
            catch (e) { msg.textContent = '⚠️ ' + e.message; }
          } }, '🔊 Проверить голос')),
        msg),
      h('div', { class: 'panel' },
        h('h2', {}, '🔊 Озвучка учебных юнитов'),
        h('p', { class: 'hint' }, store.mode === 'cloud'
          ? 'Слова и предложения озвучиваются голосом Mistral один раз и сохраняются в базе. Потом ученицы слышат этот голос без ключа.'
          : 'Работает после подключения базы. Сейчас голос Mistral звучит только на этом устройстве (если ключ сохранён).'),
        store.mode === 'cloud' ? h('button', { onclick: (e) => { e.target.disabled = true; recordAudio(allUnits, audioMsg).then(() => { e.target.disabled = false; }); } }, '🔊 Озвучить все юниты') : null,
        audioMsg),
      h('div', { class: 'panel' },
        h('h2', {}, '🗄 База данных'),
        h('p', {}, store.mode === 'cloud' ? '✅ Подключена (Supabase).' : 'Локальный режим. Инструкция по подключению — в файле SETUP.md в репозитории.'),
        store.mode === 'cloud' ? h('button', { class: 'ghost', onclick: async () => { await store.signOut(); location.hash = '#/'; } }, '🚪 Выйти') : null),
    );
  }

  MQ.teacher = {
    header,
    async route(app, parts) {
      if (!store.isTeacher()) return loginScreen(app);
      const [, , a, b] = parts; // #/teacher/<a>/<b>
      if (!a) return studentsScreen(app);
      if (a === 'st') return studentScreen(app, b);
      if (a === 'sets') return setsScreen(app);
      if (a === 'set') return setEditor(app, b === 'new' || b === 'new-vpr' ? null : b, b === 'new-vpr' ? 'vpr' : null);
      if (a === 'settings') return settingsScreen(app);
      if (a === 'lessons') return MQ.lessons.teacherList(app);
      if (a === 'lesson') return b === 'new' ? MQ.lessons.teacherNew(app) : MQ.lessons.teacherEdit(app, b);
      return studentsScreen(app);
    },
  };
})();
