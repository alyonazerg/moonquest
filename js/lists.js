// "My lists": teacher pastes a word list or irregular verbs, the site builds games from it.
(function () {
  const { h, shuffle, sample, norm, speak, games } = MQ;
  const { runRounds, optionButtons, sayBtn } = MQ.gameKit;

  // ---------- parsing ----------
  const CYR = /[а-яё]/i;
  const EMOJI = /\p{Extended_Pictographic}(?:️|‍\p{Extended_Pictographic})*/gu;

  // "sleep - slept - slept", "sleep  slept/slept", "go went gone идти"
  function parseVerbs(text) {
    const items = [], errors = [];
    text.split('\n').forEach((line, n) => {
      const t = line.trim();
      if (!t || t.startsWith('#')) return;
      const tokens = t.split(/[\s/,;–—-]+/).filter(Boolean);
      const lat = tokens.filter(x => !CYR.test(x));
      const cyr = tokens.filter(x => CYR.test(x));
      if (lat.length < 3) errors.push(`Строка ${n + 1}: «${t}» — нужно три формы`);
      else items.push({ base: lat[0], v2: lat[1], v3: lat[2], ru: cyr.join(' ') });
    });
    return { items, errors };
  }

  // "apple - яблоко", "apple = яблоко 🍎", "apple: яблоко", "apple	яблоко", "apple"
  function parseWords(text) {
    const items = [], errors = [];
    text.split('\n').forEach((line) => {
      let t = line.trim();
      if (!t || t.startsWith('#')) return;
      const pics = t.match(EMOJI);
      t = t.replace(EMOJI, '').trim();
      let en = t, ru = '';
      const m = t.match(/^(.*?)\s*(?:\t|\s[-–—]\s|[=:–—])\s*(.*)$/);
      if (m) { en = m[1]; ru = m[2]; }
      else {
        const k = t.search(CYR);
        if (k > 0) { en = t.slice(0, k); ru = t.slice(k); }
      }
      en = en.trim(); ru = ru.trim();
      if (!en) return;
      items.push({ en, ru, pic: pics ? pics[0] : '' });
    });
    return { items, errors };
  }

  function listToUnit(l) {
    const u = { id: l.id, title: l.title, icon: l.kind === 'verbs' ? '🔁' : '📝', custom: true };
    if (l.kind === 'verbs') { u.verbs = parseVerbs(l.text).items; u.subtitle = `${u.verbs.length} irregular verbs`; }
    else { u.vocab = parseWords(l.text).items; u.subtitle = `${u.vocab.length} words`; }
    return u;
  }

  // ---------- storage ----------
  const EXAMPLE = {
    id: 'l1', kind: 'verbs', title: 'Irregular verbs 1',
    text: ['sleep - slept - slept', 'learn - learnt - learnt', 'read - read - read', 'eat - ate - eaten',
      'spend - spent - spent', 'make - made - made', 'go - went - gone', 'do - did - done',
      'buy - bought - bought', 'take - took - taken', 'ride - rode - ridden', 'swim - swam - swum'].join('\n'),
  };
  let lists = MQ.load('lists', null) || [EXAMPLE];
  const saveLists = () => MQ.save('lists', lists);
  const getList = (id) => lists.find(l => l.id === id);

  // ---------- share links (whole list inside the link) ----------
  function encode(obj) {
    const bytes = new TextEncoder().encode(JSON.stringify(obj));
    let s = ''; bytes.forEach(b => { s += String.fromCharCode(b); });
    return btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  }
  function decode(code) {
    const s = atob(code.replace(/-/g, '+').replace(/_/g, '/'));
    return JSON.parse(new TextDecoder().decode(Uint8Array.from(s, c => c.charCodeAt(0))));
  }
  function shareLink(l) {
    return location.href.split('#')[0] + '#/share/' + encode({ t: l.title, k: l.kind, x: l.text });
  }
  async function copy(text, btn) {
    try { await navigator.clipboard.writeText(text); btn.textContent = '✅ Ссылка скопирована'; }
    catch (e) { window.prompt('Скопируйте ссылку:', text); }
  }

  // ---------- verb games ----------
  const forms = (v) => `${v.base} – ${v.v2} – ${v.v3}`;
  const sayForms = (v) => `${v.base}, ${v.v2}, ${v.v3}`;
  const FORM_NAME = { v2: 'Past Simple', v3: 'Past Participle' };
  function fakeRegular(b) {
    if (/e$/.test(b)) return b + 'd';
    if (/[^aeiou]y$/.test(b)) return b.slice(0, -1) + 'ied';
    return b + 'ed';
  }
  const hasVerbs = (u) => (u.verbs || []).length > 0;

  games.vflash = {
    title: 'Verb cards', icon: '🃏', desc: 'Say the three forms. Tap the card to check.',
    available: hasVerbs,
    items: u => shuffle(u.verbs).map(v => ({ en: v.base, ru: `${v.v2} – ${v.v3}` + (v.ru ? ` · ${v.ru}` : ''), say: sayForms(v) })),
    run: (ctx, items) => games.flash.run(ctx, items),
  };

  games.vchoose = {
    title: 'Choose the form', icon: '🎯', desc: 'Choose the Past Simple or Past Participle.',
    available: u => (u.verbs || []).length >= 2,
    items: u => shuffle(u.verbs.flatMap(v => [{ v, f: 'v2' }, { v, f: 'v3' }])).slice(0, 12)
      .map(x => Object.assign({ en: `${x.v.base} (${FORM_NAME[x.f]})` }, x)),
    run(ctx, items) {
      const all = ctx.unit.verbs;
      runRounds(ctx, items, (it, body, answer) => {
        const { v, f } = it;
        const right = v[f];
        const wrong = [...new Set([fakeRegular(v.base), v[f === 'v2' ? 'v3' : 'v2'], v.base, ...shuffle(all).map(o => o[f])])]
          .filter(x => x !== right).slice(0, 3);
        body.append(
          h('div', { class: 'word' }, v.base),
          v.ru ? h('div', { class: 'hint' }, v.ru) : null,
          h('div', { class: 'prompt' }, `${FORM_NAME[f]}?`),
          h('div', { class: 'hint' }, f === 'v2' ? 'Yesterday I … (V2)' : 'I have … (V3)'),
          optionButtons(shuffle([right, ...wrong]).map(o => ({ value: o, label: o })), { value: right }, (ok, msg) => {
            speak(sayForms(v)); answer(ok, msg);
          }, '💡 ' + forms(v)),
        );
        return { answerText: forms(v) };
      });
    },
  };

  games.vtype = {
    title: 'Write the forms', icon: '⌨️', desc: 'Type the Past Simple and Past Participle.',
    available: hasVerbs,
    items: u => shuffle(u.verbs).map(v => Object.assign({ en: v.base }, v)),
    run(ctx, items) {
      runRounds(ctx, items, (v, body, answer) => {
        const field = (ph) => h('input', {
          placeholder: ph, autocomplete: 'off', autocapitalize: 'off', spellcheck: 'false',
          style: 'font:inherit;font-size:1.2em;padding:8px 12px;border-radius:12px;border:0;width:9em;text-align:center',
          onkeydown: (e) => { if (e.key === 'Enter') { e.preventDefault(); check(); } },
        });
        const a = field('V2'), b = field('V3');
        const checkBtn = h('button', { class: 'primary', onclick: () => check() }, 'Check ✔');
        const check = () => {
          if (checkBtn.disabled) return;
          const okA = norm(a.value) === norm(v.v2), okB = norm(b.value) === norm(v.v3);
          a.style.background = okA ? 'var(--good)' : 'var(--bad)';
          b.style.background = okB ? 'var(--good)' : 'var(--bad)';
          a.disabled = b.disabled = checkBtn.disabled = true;
          speak(sayForms(v));
          answer(okA && okB, '💡 ' + forms(v));
        };
        body.append(
          h('div', { class: 'word' }, v.base),
          v.ru ? h('div', { class: 'hint' }, v.ru) : null,
          h('div', { class: 'row', style: 'margin:14px 0' }, a, b),
          h('div', { class: 'row' }, checkBtn),
        );
        setTimeout(() => a.focus(), 50);
        return { answerText: forms(v) };
      });
    },
  };

  games.vspell = {
    title: 'Spell the form', icon: '🔤', desc: 'Put the letters in the right order.',
    available: hasVerbs,
    items: u => sample(u.verbs.flatMap(v => [{ v, f: 'v2' }, { v, f: 'v3' }]), Math.min(10, u.verbs.length * 2))
      .map(({ v, f }) => ({ en: v.base, target: v[f], prompt: `${v.base} → ${FORM_NAME[f]}` })),
    run: (ctx, items) => games.spell.run(ctx, items),
  };

  games.vmemory = {
    title: 'Verb pairs', icon: '🧠', desc: 'Find the verb and its past forms.',
    available: u => (u.verbs || []).length >= 3,
    items: u => sample(u.verbs, 6).map(v => ({ en: v.base, pairA: v.base, pairB: `${v.v2} / ${v.v3}`, say: sayForms(v) })),
    run: (ctx, items) => games.memory.run(ctx, items),
  };

  // ---------- screens ----------
  const LISTS = { id: 'lists', title: 'My lists', icon: '✍️', href: '#/lists' };

  function listsScreen(app) {
    app.append(
      h('a', { href: '#/', class: 'muted' }, '← Home'),
      h('h1', {}, '✍️ My lists'),
      h('p', { class: 'muted' }, 'Свои списки слов и неправильных глаголов. Вставьте список, и сайт сам сделает из него игры.'),
      h('div', { class: 'row', style: 'justify-content:flex-start' },
        h('a', { class: 'btn primary', href: '#/lists/new' }, '＋ Новый список')),
      h('div', { class: 'grid', style: 'margin-top:14px' }, lists.map(l => {
        const u = listToUnit(l);
        const shareBtn = h('button', { class: 'chip', onclick: (e) => { e.preventDefault(); copy(shareLink(l), shareBtn); } }, '🔗 Ссылка для ученицы');
        return h('div', { class: 'tile' },
          h('a', { href: `#/lists/${l.id}`, style: 'text-decoration:none;display:block' },
            h('div', { class: 'big' }, u.icon),
            h('div', { class: 'title' }, l.title),
            h('div', { class: 'muted' }, u.subtitle)),
          h('div', { class: 'row', style: 'justify-content:flex-start;margin-top:10px;gap:6px' },
            h('a', { class: 'btn chip', href: `#/lists/${l.id}` }, '▶ Play'),
            h('a', { class: 'btn chip', href: `#/lists/edit/${l.id}` }, '✏️'),
            shareBtn,
            h('button', { class: 'chip', title: 'Удалить', onclick: () => {
              if (!confirm(`Удалить список «${l.title}»?`)) return;
              lists = lists.filter(x => x !== l); saveLists(); location.hash = '#/lists'; window.dispatchEvent(new HashChangeEvent('hashchange'));
            } }, '🗑')));
      })),
    );
  }

  function editScreen(app, id) {
    const l = getList(id) || { id: 'l' + Date.now().toString(36), kind: 'verbs', title: '', text: '' };
    const title = h('input', { value: l.title, placeholder: 'Например: Irregular verbs 2', style: 'font:inherit;padding:8px 12px;border-radius:10px;border:0;width:100%' });
    const kindSel = h('select', { style: 'font:inherit;padding:8px;border-radius:10px' },
      h('option', { value: 'verbs' }, '🔁 Неправильные глаголы'),
      h('option', { value: 'words' }, '📝 Слова (лексика)'));
    kindSel.value = l.kind;
    const area = h('textarea', { rows: 14, style: 'font:inherit;font-size:.9em;padding:10px;border-radius:10px;border:0;width:100%' });
    area.value = l.text;
    const help = h('div', { class: 'hint' });
    const preview = h('div', { class: 'hint' });
    const update = () => {
      const verbs = kindSel.value === 'verbs';
      help.innerHTML = '';
      help.append(verbs
        ? 'Одна строка — один глагол, три формы через пробел, дефис или /. Можно добавить перевод: «go - went - gone идти».'
        : 'Одна строка — одно слово. Перевод через дефис, = или двоеточие, можно добавить эмодзи-картинку: «apple - яблоко 🍎».');
      area.placeholder = verbs ? 'sleep - slept - slept\neat - ate - eaten\ngo - went - gone' : 'apple - яблоко 🍎\nbanana - банан 🍌\nbread - хлеб';
      const r = (verbs ? parseVerbs : parseWords)(area.value);
      preview.innerHTML = '';
      preview.append(h('div', {}, `Распознано: ${r.items.length}`), ...r.errors.map(e => h('div', { style: 'color:var(--bad)' }, e)));
    };
    area.oninput = update; kindSel.onchange = update;
    update();
    app.append(
      h('a', { href: '#/lists', class: 'muted' }, '← My lists'),
      h('h1', {}, getList(id) ? '✏️ Изменить список' : '＋ Новый список'),
      h('div', { class: 'panel' },
        h('p', {}, 'Название'), title,
        h('p', {}, 'Тип'), kindSel,
        h('p', {}, 'Список'), help, area, preview,
        h('div', { class: 'row', style: 'margin-top:12px' },
          h('button', { class: 'primary', onclick: () => {
            l.title = title.value.trim() || (kindSel.value === 'verbs' ? 'Irregular verbs' : 'Words');
            l.kind = kindSel.value; l.text = area.value;
            if (!getList(l.id)) lists.push(l);
            saveLists();
            location.hash = `#/lists/${l.id}`;
          } }, '💾 Сохранить и играть'),
          h('a', { class: 'btn', href: '#/lists' }, 'Отмена'))),
    );
  }

  function importShared(code) {
    try {
      const d = decode(code);
      let l = lists.find(x => x.text === d.x && x.kind === d.k);
      if (!l) { l = { id: 'l' + Date.now().toString(36), title: d.t, kind: d.k, text: d.x }; lists.push(l); saveLists(); }
      location.replace(`#/lists/${l.id}`);
    } catch (e) {
      location.replace('#/lists');
    }
  }

  // Router hook: returns true if handled.
  MQ.lists = {
    count: () => lists.length,
    route(app, parts, screens) {
      const [, , a, b, c] = parts; // ['#', 'lists'|'share', ...]
      if (parts[1] === 'share') { importShared(a || ''); return true; }
      if (!a) { listsScreen(app); return true; }
      if (a === 'new') { editScreen(app, null); return true; }
      if (a === 'edit') { editScreen(app, b); return true; }
      const l = getList(a);
      if (!l) { listsScreen(app); return true; }
      const u = listToUnit(l);
      if (b && games[b]) screens.play(LISTS, u, b);
      else screens.unit(LISTS, u);
      return true;
    },
  };
})();
