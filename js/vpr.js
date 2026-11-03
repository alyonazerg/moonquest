// ВПР trainer in the official 2027 format (ФИОКО):
// 1 listening A–E · 2 reading A–E · 3 grammar in a text A–E · 4 form (8 one-word fields, К1 + К2).
// Full test with a 45-minute timer (listening twice) or practice of one task. Score out of 25 and the mark.
(function () {
  const { h, games } = MQ;
  const L = 'ABCDE';
  const TITLES = { listen: 'Аудирование', read: 'Чтение', grammar: 'Грамматика', form: 'Письмо: анкета' };
  const MARKS = [[22, 5], [15, 4], [10, 3], [0, 2]];
  const markFor = (p) => MARKS.find(([min]) => p >= min)[1];

  // ---------- task 4 checking (criteria К1 / К2) ----------
  function lev(a, b) {
    const d = Array.from({ length: a.length + 1 }, (_, i) => [i, ...Array(b.length).fill(0)]);
    for (let j = 1; j <= b.length; j++) d[0][j] = j;
    for (let i = 1; i <= a.length; i++) for (let j = 1; j <= b.length; j++)
      d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
    return d[a.length][b.length];
  }
  // -> { ok: content is right (К1), spelling: a spelling mistake (К2), note }
  function checkField(f, value) {
    const v = String(value || '').trim().toLowerCase().replace(/^(the|a|an)\s+/, '').replace(/[.,!]$/, '');
    if (!v) return { ok: false, spelling: false, note: 'нет ответа' };
    if (f.number && /\d/.test(v)) return { ok: false, spelling: false, note: 'число нужно написать словами' };
    if (v.split(/\s+/).length > 1) return { ok: false, spelling: false, note: 'нужно одно слово' };
    let best = Infinity;
    f.a.forEach(x => { best = Math.min(best, lev(v, x.toLowerCase())); });
    if (best === 0) return { ok: true, spelling: false };
    const long = Math.max(...f.a.map(x => x.length)) >= 5;
    if (best <= (long ? 2 : 1)) return { ok: true, spelling: true, note: 'орфографическая ошибка' };
    return { ok: false, spelling: false, note: 'неверно' };
  }
  function scoreForm(t, vals) {
    const res = t.fields.map((f, i) => checkField(f, vals[i]));
    const k1 = res.filter(r => r.ok).length;
    const errs = res.filter(r => r.spelling).length;
    const k2 = k1 === 0 ? 0 : errs <= 2 ? 2 : errs <= 4 ? 1 : 0;
    return { res, k1, k2, errs, points: k1 + k2, max: t.fields.length + 2 };
  }

  // ---------- dialogue player ----------
  // Every speaker gets their own voice (male / female, adult / child). Recorded Mistral audio is used
  // when there is one (boys and men: the second voice, saved as "♂ text"). One playback at a time, with pause.
  // Natural voices only, best first (British first). Novelty / robotic voices are never used.
  const FEMALE_BEST = ['Serena', 'Kate', 'Martha', 'Stephanie', 'Libby', 'Sonia', 'Google UK English Female', 'Microsoft Hazel', 'Microsoft Libby', 'Samantha', 'Karen', 'Moira', 'Tessa', 'Fiona', 'Allison', 'Ava', 'Susan', 'Microsoft Zira', 'Google US English'];
  const MALE_BEST = ['Daniel', 'Arthur', 'Google UK English Male', 'Microsoft Ryan', 'Microsoft George', 'Oliver', 'Thomas', 'Tom', 'Alex', 'Aaron', 'Rishi', 'Microsoft David', 'Microsoft Mark', 'Microsoft Guy'];
  const NOVELTY = /fred|albert|bruce|ralph|junior|bad news|bahh|bells|boing|bubbles|cellos|deranged|good news|hysterical|organ|trinoids|whisper|zarvox|jester|superstar|wobble|rocko|grandpa|grandma|eddy|reed|sandy|shelley|flo\b|kathy|princess|vicki|victoria|agnes/i;
  const player = { playing: false, paused: false, stop: false, audio: null, onchange: null, session: 0 };
  const changed = () => player.onchange && player.onchange();
  function voicesFor(people) {
    const all = ('speechSynthesis' in window ? speechSynthesis.getVoices() : []).filter(v => /^en/i.test(v.lang) && !NOVELTY.test(v.name));
    const ranked = (list) => list.map(n => all.find(v => v.name.toLowerCase().startsWith(n.toLowerCase()) || v.name.toLowerCase().includes(n.toLowerCase()))).filter(Boolean);
    const female = ranked(FEMALE_BEST), male = ranked(MALE_BEST);
    const used = new Set();
    const map = {};
    people.forEach(name => {
      const pool = MQ.speaker(name).male ? male : female;
      const v = pool.find(x => !used.has(x)) || pool[0] || all.find(x => !used.has(x)) || all[0] || null;
      if (v) used.add(v);
      map[name] = v;
    });
    return map;
  }
  const waitIfPaused = () => new Promise(r => { const t = setInterval(() => { if (!player.paused || player.stop) { clearInterval(t); r(); } }, 120); });
  async function playDialog(lines) {
    if (player.playing) return; // a second click does nothing
    MQ.stopSpeech();
    Object.assign(player, { playing: true, paused: false, stop: false });
    const my = ++player.session; // "Stop" or leaving the page ends this playback for good
    const alive = () => my === player.session && !player.stop && document.querySelector('.vpr');
    changed();
    const people = [...new Set(lines.map(l => l[0]))];
    const voices = voicesFor(people);
    for (const [who, text] of lines) {
      if (!alive()) break;
      if (player.paused) await waitIfPaused();
      if (!alive()) break;
      const sp = MQ.speaker(who);
      const url = MQ.store && (sp.male ? MQ.store.audioUrl('♂ ' + text) : MQ.store.audioUrl(text));
      // any problem with one line must not stop the player (or leave it "playing" for ever)
      await new Promise((ok) => {
        try {
          if (url) { const a = new Audio(url); player.audio = a; a.onended = ok; a.onerror = ok; a.play().catch(ok); return; }
          if (!('speechSynthesis' in window)) return ok();
          const u = new SpeechSynthesisUtterance(text);
          u.lang = 'en-GB'; u.rate = 0.85;
          try { if (voices[who]) u.voice = voices[who]; } catch (e) { /* default voice */ }
          // natural pitch (a lowered pitch sounds hoarse); children only a little higher
          u.pitch = sp.adult ? 1 : 1.12;
          u.onend = ok; u.onerror = ok;
          speechSynthesis.speak(u);
          setTimeout(ok, 1500 + text.length * 160); // safety net if the browser never says "end"
        } catch (e) { ok(); }
      });
      player.audio = null;
      await new Promise(r => setTimeout(r, 350));
    }
    if (my === player.session) { Object.assign(player, { playing: false, paused: false }); changed(); }
  }
  function pauseDialog() {
    if (!player.playing) return;
    player.paused = !player.paused;
    if (player.audio) player.paused ? player.audio.pause() : player.audio.play();
    else if ('speechSynthesis' in window) player.paused ? speechSynthesis.pause() : speechSynthesis.resume();
    changed();
  }
  function stopDialog() {
    player.session++; player.stop = true; player.paused = false;
    if (player.audio) player.audio.pause();
    if ('speechSynthesis' in window) { speechSynthesis.resume(); speechSynthesis.cancel(); }
    MQ.stopSpeech();
    player.playing = false;
    changed();
  }

  const tapHint = () => h('div', { class: 'hint tap-hint' }, '👆 Tap any word in the text to hear it or add it to My words');

  games.vpr = {
    title: 'Test · ВПР format', icon: '📝', desc: 'Тест в формате ВПР-2027: 4 задания, 25 баллов. Весь тест с таймером или одно задание.',
    available: u => !!(u.vpr && u.vpr.tasks && u.vpr.tasks.length),
    items: u => u.vpr.tasks,
    run(ctx, items) {
      // "practise mistakes" passes a list of mistakes: then simply open the whole variant again
      const tasks = items && items[0] && items[0].type ? items : ctx.unit.vpr.tasks;
      const wrap = h('div', { class: 'vpr' });
      ctx.root.append(wrap);
      const minutes = (ctx.unit.vpr && ctx.unit.vpr.minutes) || 45;
      const num = (t) => tasks.indexOf(t) + 1;
      const title = (t) => `Задание ${num(t)} · ${TITLES[t.type]}`;
      const maxOf = (t) => t.type === 'form' ? t.fields.length + 2 : (t.questions || t.gaps).length;

      function startScreen() {
        wrap.innerHTML = '';
        wrap.append(h('div', { class: 'panel' },
          h('h2', {}, '📝 ' + (ctx.unit.vpr.title && ctx.unit.vpr.title !== ctx.unit.title ? `${ctx.unit.vpr.title} · ${ctx.unit.title}` : ctx.unit.title)),
          ctx.unit.vpr.source ? h('p', { class: 'hint' }, 'Источник: ' + ctx.unit.vpr.source) : null,
          h('p', { class: 'muted' }, `4 задания · максимум ${tasks.reduce((s, t) => s + maxOf(t), 0)} баллов · ${minutes} минут`),
          h('div', { class: 'row' }, h('button', { class: 'primary', onclick: () => exam(tasks, true) }, `⏱ Весь вариант, как на ВПР`)),
          h('p', { class: 'hint' }, 'Или потренируй одно задание (без таймера, аудио можно слушать сколько угодно):'),
          h('div', { class: 'row' }, tasks.map(t => h('button', { onclick: () => exam([t], false) }, title(t))))));
      }

      function exam(list, strict) {
        const answers = list.map(t => t.type === 'form' ? t.fields.map(() => '') : (t.questions || t.gaps).map(() => null));
        const plays = list.map(() => 0);
        let cur = 0, timeLeft = minutes * 60, timer = null, checked = false;
        const clock = h('span', { class: 'vpr-clock' });
        const nav = h('div', { class: 'vpr-nav row' });
        const body = h('div');
        wrap.innerHTML = '';
        wrap.append(h('div', { class: 'vpr-top row space' }, h('span', { class: 'muted' }, strict ? 'Режим ВПР' : 'Тренировка'), strict ? clock : h('span')), nav, body);
        if (strict) {
          const tick = () => {
            if (!wrap.isConnected) { clearInterval(timer); stopDialog(); return; }
            clock.textContent = `⏱ ${Math.floor(timeLeft / 60)}:${String(timeLeft % 60).padStart(2, '0')}`;
            clock.classList.toggle('low', timeLeft < 300);
            if (timeLeft-- <= 0) { clearInterval(timer); finish(); }
          };
          tick(); timer = setInterval(tick, 1000);
        }
        const filled = (k) => list[k].type === 'form' ? answers[k].every(v => v.trim()) : answers[k].every(a => a !== null);
        function renderNav() {
          nav.innerHTML = '';
          if (list.length > 1) list.forEach((t, k) => nav.append(h('button', { class: 'chip' + (k === cur ? ' on' : ''), onclick: () => { cur = k; render(); } }, `${num(t)}${filled(k) ? ' ✓' : ''}`)));
        }
        // "Ответ: A B C D E" row like on the paper form
        const answerRow = (k) => h('div', { class: 'vpr-answer' }, h('span', {}, 'Ответ:'),
          answers[k].map((a, i) => h('span', { class: 'vpr-cell' }, h('small', {}, L[i]), a ? String(a) : '·')));
        function questionList(k, t) {
          return h('div', { class: 'vpr-qs' }, t.questions.map((q, i) => h('div', { class: 'vpr-qbox' },
            h('div', { class: 'vpr-q' }, h('b', {}, L[i] + '. '), q.q),
            h('div', { class: 'vpr-opts' }, q.options.map((o, j) => {
              const n = j + 1, picked = answers[k][i] === n;
              let cls = 'vpr-opt' + (picked ? ' picked' : '');
              if (checked) cls += n === q.a ? ' right' : picked ? ' wrong' : '';
              return h('button', { class: cls, disabled: checked, onclick: () => { answers[k][i] = n; MQ.sfx.pop(); render(); } }, h('b', {}, n + ') '), o);
            })))));
        }
        function render() {
          renderNav();
          const t = list[cur];
          body.innerHTML = '';
          const panel = h('div', { class: 'panel vpr-task' }, h('h2', {}, title(t)), h('p', { class: 'vpr-instr' }, t.instruction));
          if (t.type === 'listen') {
            let left = strict ? 2 - plays[cur] : Infinity;
            const controls = h('div', { class: 'row' });
            const drawControls = () => {
              controls.replaceChildren(
                h('button', { class: 'primary', disabled: left <= 0 || checked || player.playing, onclick: () => { if (player.playing) return; plays[cur]++; left--; playDialog(t.dialog); } },
                  player.playing ? '🔊 Звучит…' : `▶ Слушать${strict ? ` (осталось ${Math.max(0, left)})` : ''}`),
                h('button', { disabled: !player.playing, onclick: pauseDialog }, player.paused ? '▶ Продолжить' : '⏸ Пауза'),
                h('button', { class: 'ghost', disabled: !player.playing, onclick: stopDialog }, '⏹ Стоп'));
            };
            player.onchange = () => { if (controls.isConnected) drawControls(); };
            drawControls();
            panel.append(controls,
              checked ? h('details', { class: 'vpr-script' }, h('summary', {}, 'Текст для аудирования'), t.dialog.map(([w, s]) => h('p', {}, h('b', {}, w + ': '), s))) : null,
              questionList(cur, t), answerRow(cur));
          }
          if (t.type === 'read') {
            panel.append(h('div', { class: 'vpr-text' }, h('h3', {}, t.heading), t.text.split('\n').map(p => h('p', {}, p))), tapHint(), questionList(cur, t), answerRow(cur));
          }
          if (t.type === 'grammar') {
            const p = h('div', { class: 'vpr-text gram' }, h('h3', {}, t.heading));
            t.text.split('\n').forEach(par => {
              const el = h('p');
              par.split(/\{([A-E])\}/).forEach((part, i) => {
                if (i % 2 === 0) { el.append(part); return; }
                const gi = L.indexOf(part), gap = t.gaps[gi];
                const sel = h('select', { class: 'vpr-sel', disabled: checked, onchange: (e) => { answers[cur][gi] = e.target.value ? Number(e.target.value) : null; renderNav(); render(); } },
                  h('option', { value: '' }, `${part} …`), gap.options.map((o, j) => h('option', { value: j + 1 }, `${part}: ${j + 1}) ${o}`)));
                sel.value = answers[cur][gi] || '';
                if (checked) sel.classList.add(answers[cur][gi] === gap.a ? 'right' : 'wrong');
                el.append(sel, checked && answers[cur][gi] !== gap.a ? h('span', { class: 'gf-fix' }, ` [${gap.a}) ${gap.options[gap.a - 1]}]`) : '');
              });
              p.append(el);
            });
            panel.append(p,
              h('table', { class: 'table vpr-gaps' }, t.gaps.map((g, i) => h('tr', {}, h('td', {}, h('b', {}, L[i])), g.options.map((o, j) => h('td', {}, `${j + 1}) ${o}`))))),
              answerRow(cur));
          }
          if (t.type === 'form') {
            const sc = checked ? scoreForm(t, answers[cur]) : null;
            panel.append(h('div', { class: 'vpr-text' }, h('h3', {}, t.heading), h('p', {}, t.text)), tapHint(),
              h('table', { class: 'table vpr-form' }, t.fields.map((f, i) => h('tr', {},
                h('td', {}, f.label),
                h('td', {}, h('span', { class: 'muted' }, (i + 1) + '. '),
                  (() => {
                    const inp = h('input', { class: 'cell', value: answers[cur][i], disabled: checked, autocomplete: 'off', spellcheck: 'false',
                      oninput: (e) => { answers[cur][i] = e.target.value; renderNav(); } });
                    if (sc) inp.classList.add(sc.res[i].ok ? (sc.res[i].spelling ? 'soft' : 'right') : 'wrong');
                    return inp;
                  })(),
                  sc && (!sc.res[i].ok || sc.res[i].spelling) ? h('div', { class: 'vpr-fix' }, `${sc.res[i].note} → ${f.a[0]}`) : null)))),
              sc ? h('p', { class: 'hint' }, `К1 (содержание): ${sc.k1} из ${t.fields.length} · К2 (орфография, ошибок: ${sc.errs}): ${sc.k2} из 2`) : null);
          }
          body.append(panel);
          const last = cur === list.length - 1;
          const clearTask = () => {
            if (!confirm('Очистить ответы в этом задании?')) return;
            answers[cur] = t.type === 'form' ? t.fields.map(() => '') : (t.questions || t.gaps).map(() => null);
            render();
          };
          body.append(h('div', { class: 'row' },
            !checked ? h('button', { class: 'ghost', onclick: clearTask }, '🧹 Очистить ответы') : null,
            checked ? h('button', { class: 'ghost', onclick: () => { stopDialog(); exam(list, strict); } }, '🔄 Пройти заново') : null,
            cur > 0 ? h('button', { onclick: () => { cur--; render(); } }, '← Назад') : null,
            !last ? h('button', { class: 'primary', onclick: () => { cur++; render(); window.scrollTo(0, 0); } }, 'Дальше →') : null,
            !checked && last ? h('button', { class: 'primary', onclick: () => {
              const empty = list.reduce((s, t, k) => s + (t.type === 'form' ? answers[k].filter(v => !v.trim()).length : answers[k].filter(a => a === null).length), 0);
              if (empty && !confirm(`Без ответа: ${empty}. Закончить?`)) return;
              finish();
            } }, '✔ Завершить и проверить') : null,
            checked ? h('button', { class: 'primary', onclick: () => report() }, '📊 Результат') : null));
        }
        function finish() {
          if (checked) return;
          checked = true; clearInterval(timer); stopDialog();
          report();
        }
        function report() {
          const mistakes = [];
          const rows = list.map((t, k) => {
            if (t.type === 'form') {
              const sc = scoreForm(t, answers[k]);
              t.fields.forEach((f, i) => { if (!sc.res[i].ok || sc.res[i].spelling) mistakes.push({ en: `Анкета: ${f.label} → ${f.a[0]}` }); });
              return { t, got: sc.points, max: sc.max, detail: `К1 ${sc.k1}/${t.fields.length}, К2 ${sc.k2}/2` };
            }
            const keys = (t.questions || t.gaps).map(x => x.a);
            keys.forEach((a, i) => { if (answers[k][i] !== a) mistakes.push({ en: `Задание ${num(t)}${L[i]} → ${a}` }); });
            return { t, got: keys.filter((a, i) => answers[k][i] === a).length, max: keys.length, detail: 'Ответ: ' + answers[k].map(a => a || '·').join('') + ' · верно: ' + keys.join('') };
          });
          const got = rows.reduce((s, r) => s + r.got, 0), max = rows.reduce((s, r) => s + r.max, 0);
          const full = list.length === tasks.length && max === 25;
          MQ.sfx[got / max >= 0.6 ? 'win' : 'pop']();
          nav.innerHTML = '';
          body.innerHTML = '';
          body.append(h('div', { class: 'panel' },
            h('h2', {}, `Результат: ${got} из ${max}`),
            full ? h('div', { class: 'vpr-mark m' + markFor(got) }, `Отметка «${markFor(got)}»`) : null,
            h('table', { class: 'table' }, rows.map(r => h('tr', {}, h('td', {}, title(r.t)), h('td', {}, h('b', {}, `${r.got} / ${r.max}`)), h('td', { class: 'muted' }, r.detail)))),
            full ? h('p', { class: 'hint' }, 'Шкала ВПР: 0–9 «2» · 10–14 «3» · 15–21 «4» · 22–25 «5»') : null,
            h('div', { class: 'row', style: 'margin-top:12px' },
              h('button', { onclick: () => { cur = 0; render(); } }, '🔍 Посмотреть ошибки'),
              h('button', { onclick: () => exam(list, strict) }, '🔄 Пройти заново'),
              h('button', { class: 'primary', onclick: () => ctx.finish(got, max, mistakes) }, 'Готово 🏁'))));
        }
        render();
      }
      startScreen();
    },
  };
  // Checks a generated / edited test: 4 tasks in the ВПР order and shape. Returns a list of problems.
  function validate(tasks) {
    const err = [];
    if (!Array.isArray(tasks) || tasks.length !== 4) return ['Нужно ровно 4 задания'];
    const need = ['listen', 'read', 'grammar', 'form'];
    tasks.forEach((t, k) => {
      const n = `Задание ${k + 1}: `;
      if (!t || t.type !== need[k]) { err.push(n + `тип должен быть «${need[k]}»`); return; }
      const opts3 = (x, i) => { if (!Array.isArray(x.options) || x.options.length !== 3) err.push(n + `${L[i]} — нужно 3 варианта`); if (![1, 2, 3].includes(x.a)) err.push(n + `${L[i]} — ответ должен быть 1, 2 или 3`); };
      if (t.type === 'listen') {
        if (!Array.isArray(t.dialog) || t.dialog.length < 4 || t.dialog.some(l => !Array.isArray(l) || l.length !== 2)) err.push(n + 'нужен диалог: [["Mum", "…"], ["Dan", "…"]]');
        (t.questions || []).length === 5 ? t.questions.forEach(opts3) : err.push(n + 'нужно 5 вопросов A–E');
      }
      if (t.type === 'read') {
        if (!t.text) err.push(n + 'нет текста');
        (t.questions || []).length === 5 ? t.questions.forEach(opts3) : err.push(n + 'нужно 5 вопросов A–E');
      }
      if (t.type === 'grammar') {
        L.split('').forEach(c => { if (!String(t.text || '').includes(`{${c}}`)) err.push(n + `в тексте нет пропуска {${c}}`); });
        (t.gaps || []).length === 5 ? t.gaps.forEach(opts3) : err.push(n + 'нужно 5 пропусков A–E');
      }
      if (t.type === 'form') {
        if (!t.text) err.push(n + 'нет текста');
        if ((t.fields || []).length !== 8 || t.fields.some(f => !f.label || !Array.isArray(f.a) || !f.a.length)) err.push(n + 'нужно 8 полей { label, a: ["ответ"] }');
      }
    });
    return err;
  }
  // fill in the standard instructions if a generated test has none
  const INSTR = {
    listen: 'Ты услышишь диалог. Для каждого предложения А–Е выбери один правильный вариант ответа из трёх предложенных (1, 2 или 3). Ты услышишь текст дважды.',
    read: 'Прочитай текст. Для каждого предложения А–Е выбери один правильный вариант ответа из трёх предложенных (1, 2 или 3).',
    grammar: 'Прочитай рассказ. Вставь вместо каждого пропуска, обозначенного буквами А–Е, нужную грамматическую форму, выбрав её из трёх предложенных вариантов (1, 2 или 3).',
    form: 'Помоги своему другу заполнить анкету для сайта «Друзья онлайн». Прочитай текст и запиши информацию в таблицу. Под каждым номером запиши только одно слово (без артиклей). Числа необходимо записать словами.',
  };
  function normalize(tasks) {
    (tasks || []).forEach(t => {
      if (!t) return;
      if (!t.instruction) t.instruction = INSTR[t.type] || '';
      (t.questions || t.gaps || []).forEach(x => { x.a = Number(x.a); });
      (t.fields || []).forEach(f => { if (typeof f.a === 'string') f.a = [f.a]; if (/^(age|number)/i.test(f.label)) f.number = true; });
    });
    return tasks;
  }
  MQ.vprCheck = { checkField, scoreForm, validate, normalize, voicesFor };
})();
