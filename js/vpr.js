// ВПР trainer: a variant with several tasks (listening, reading, grammar in a text).
// Two modes: the full test with a timer (listening twice only) and practice of one task.
(function () {
  const { h, speak, games } = MQ;

  // points of a task = number of questions / gaps
  const taskMax = (t) => (t.questions || t.gaps || []).length;

  games.vpr = {
    title: 'ВПР: тренажёр', icon: '📝', desc: 'Задания в формате ВПР. Полный вариант с таймером или одно задание.',
    available: u => !!(u.vpr && u.vpr.tasks && u.vpr.tasks.length),
    items: u => u.vpr.tasks,
    run(ctx, items) {
      // "practise mistakes" passes a list of mistakes: then simply open the whole variant again
      const tasks = items && items[0] && items[0].type ? items : ctx.unit.vpr.tasks;
      const wrap = h('div', { class: 'vpr' });
      ctx.root.append(wrap);
      const minutes = (ctx.unit.vpr && ctx.unit.vpr.minutes) || 45;

      // ---------- start screen ----------
      function startScreen() {
        wrap.innerHTML = '';
        wrap.append(h('div', { class: 'panel' },
          h('h2', {}, '📝 ' + ctx.unit.title),
          h('p', { class: 'muted' }, `Заданий: ${tasks.length} · баллов: ${tasks.reduce((s, t) => s + taskMax(t), 0)}`),
          h('div', { class: 'row' }, h('button', { class: 'primary', onclick: () => exam(tasks, true) }, `⏱ Весь вариант (${minutes} мин)`)),
          h('p', { class: 'hint' }, 'Или потренируй одно задание (без таймера, аудио можно слушать сколько угодно):'),
          h('div', { class: 'row' }, tasks.map(t => h('button', { onclick: () => exam([t], false) }, t.title)))));
      }

      // ---------- the test ----------
      function exam(list, strict) {
        const answers = list.map(t => (t.questions || t.gaps).map(() => null));
        const plays = list.map(() => 0);
        let cur = 0, timeLeft = minutes * 60, timer = null, checked = false;
        const clock = h('span', { class: 'vpr-clock' });
        const body = h('div');
        const nav = h('div', { class: 'vpr-nav row' });
        wrap.innerHTML = '';
        wrap.append(h('div', { class: 'vpr-top row space' }, h('span', { class: 'muted' }, strict ? 'Режим экзамена' : 'Тренировка'), strict ? clock : h('span')), nav, body);
        if (strict) {
          const tick = () => {
            if (!wrap.isConnected) return clearInterval(timer);
            clock.textContent = `⏱ ${Math.floor(timeLeft / 60)}:${String(timeLeft % 60).padStart(2, '0')}`;
            clock.classList.toggle('low', timeLeft < 300);
            if (timeLeft-- <= 0) { clearInterval(timer); finish(); }
          };
          tick(); timer = setInterval(tick, 1000);
        }
        function renderNav() {
          nav.innerHTML = '';
          if (list.length > 1) list.forEach((t, k) => {
            const done = answers[k].every(a => a !== null);
            nav.append(h('button', { class: 'chip' + (k === cur ? ' on' : ''), onclick: () => { cur = k; render(); } }, `${k + 1}${done ? ' ✓' : ''}`));
          });
        }
        function choice(k, i, options, rightAnswer) {
          const row = h('div', { class: 'vpr-opts' });
          options.forEach((o, j) => {
            const picked = answers[k][i] === o;
            let cls = 'vpr-opt' + (picked ? ' picked' : '');
            if (checked) cls += o === rightAnswer ? ' right' : picked ? ' wrong' : '';
            row.append(h('button', { class: cls, disabled: checked, onclick: () => { answers[k][i] = o; MQ.sfx.pop(); render(); } },
              h('b', {}, 'ABC'[j] + ') '), o));
          });
          return row;
        }
        function render() {
          renderNav();
          const t = list[cur];
          body.innerHTML = '';
          const panel = h('div', { class: 'panel vpr-task' }, h('h2', {}, t.title), h('p', { class: 'vpr-instr' }, t.instruction));
          if (t.type === 'listen') {
            const left = strict ? 2 - plays[cur] : Infinity;
            panel.append(h('div', { class: 'row' },
              h('button', { class: 'primary', disabled: left <= 0 || checked, onclick: () => { plays[cur]++; speak(t.audio); render(); } },
                `▶ Слушать${strict ? ` (осталось ${Math.max(0, left)})` : ''}`),
              h('button', { class: 'ghost', onclick: () => MQ.stopSpeech() }, '⏹ Стоп')),
              checked ? h('details', { class: 'vpr-script' }, h('summary', {}, 'Текст записи'), h('p', {}, t.audio)) : null);
          }
          if (t.type === 'read') panel.append(h('div', { class: 'vpr-text' }, t.text.split('\n').filter(Boolean).map((p, i) => i === 0 && p.length < 40 ? h('h3', {}, p) : h('p', {}, p))));
          if (t.type === 'listen' || t.type === 'read') {
            panel.append(h('ol', { class: 'vpr-qs' }, t.questions.map((q, i) => h('li', {}, h('div', { class: 'vpr-q' }, q.q), choice(cur, i, q.options, q.a)))));
          }
          if (t.type === 'grammar') {
            const parts = t.text.split(/\{(\d+)\}/);
            const p = h('p', { class: 'vpr-text gram' });
            parts.forEach((part, i) => {
              if (i % 2 === 0) { p.append(part); return; }
              const gi = Number(part) - 1, gap = t.gaps[gi];
              const sel = h('select', { class: 'vpr-sel', disabled: checked, onchange: (e) => { answers[cur][gi] = e.target.value || null; renderNav(); } },
                h('option', { value: '' }, `(${gi + 1}) …`), gap.options.map(o => h('option', { value: o }, o)));
              sel.value = answers[cur][gi] || '';
              if (checked) sel.classList.add(answers[cur][gi] === gap.a ? 'right' : 'wrong');
              p.append(sel, checked && answers[cur][gi] !== gap.a ? h('span', { class: 'gf-fix' }, ` [${gap.a}]`) : '');
            });
            panel.append(p);
          }
          body.append(panel);
          const last = cur === list.length - 1;
          body.append(h('div', { class: 'row' },
            cur > 0 ? h('button', { onclick: () => { cur--; render(); } }, '← Назад') : null,
            !last ? h('button', { class: 'primary', onclick: () => { cur++; render(); window.scrollTo(0, 0); } }, 'Дальше →') : null,
            !checked && (last || list.length === 1) ? h('button', { class: 'primary', onclick: () => {
              const empty = answers.flat().filter(a => a === null).length;
              if (empty && !confirm(`Не отвечено: ${empty}. Закончить?`)) return;
              finish();
            } }, '✔ Завершить и проверить') : null,
            checked ? h('button', { class: 'primary', onclick: () => report() }, '📊 Результат') : null));
        }
        function finish() {
          if (checked) return;
          checked = true; clearInterval(timer); MQ.stopSpeech();
          report();
        }
        function report() {
          const rows = list.map((t, k) => {
            const keys = (t.questions || t.gaps).map(x => x.a);
            const got = keys.filter((a, i) => answers[k][i] === a).length;
            return { t, got, max: keys.length };
          });
          const got = rows.reduce((s, r) => s + r.got, 0), max = rows.reduce((s, r) => s + r.max, 0);
          MQ.sfx[got / max >= 0.7 ? 'win' : 'pop']();
          const mistakes = [];
          list.forEach((t, k) => (t.questions || t.gaps).forEach((x, i) => {
            if (answers[k][i] !== x.a) mistakes.push({ en: `${t.title}: ${x.q || '(' + (i + 1) + ')'} → ${x.a}` });
          }));
          body.innerHTML = '';
          nav.innerHTML = '';
          body.append(h('div', { class: 'panel' },
            h('h2', {}, `Результат: ${got} из ${max}`),
            h('table', { class: 'table' }, rows.map(r => h('tr', {}, h('td', {}, r.t.title), h('td', {}, `${r.got} / ${r.max}`)))),
            h('div', { class: 'row', style: 'margin-top:12px' },
              h('button', { onclick: () => { cur = 0; render(); } }, '🔍 Посмотреть ошибки'),
              h('button', { class: 'primary', onclick: () => ctx.finish(got, max, mistakes) }, 'Готово 🏁'))));
        }
        render();
      }
      startScreen();
    },
  };
})();
