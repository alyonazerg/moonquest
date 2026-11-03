// Card sets (teacher-made word / irregular verb lists): parsing and verb games.
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

  const parse = (kind, text) => (kind === 'verbs' ? parseVerbs : parseWords)(text);
  // Back to editable text (for the "edit as text" box)
  const toText = (set) => set.items.map(it => set.kind === 'verbs'
    ? `${it.base} - ${it.v2} - ${it.v3}${it.ru ? ' ' + it.ru : ''}`
    : `${it.en}${it.ru ? ' - ' + it.ru : ''}${it.pic ? ' ' + it.pic : ''}`).join('\n');

  function setToUnit(set) {
    const u = { id: set.id, title: set.title, icon: set.kind === 'verbs' ? '🔁' : '📝', custom: true };
    if (set.kind === 'verbs') { u.verbs = set.items; u.subtitle = `${set.items.length} irregular verbs`; }
    else { u.vocab = set.items; u.subtitle = `${set.items.length} words`; }
    return u;
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

  games.vflash = { available: () => false }; // real game in anki.js (keeps it first in the list)

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
          // "was/were": either word (or both) is right
          const same = (typed, form) => [form, ...form.split('/')].some(f => norm(f) === norm(typed));
          const okA = same(a.value, v.v2), okB = same(b.value, v.v3);
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

  MQ.sets = { parse, toText, setToUnit };
})();
