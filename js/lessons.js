// Lessons from the textbook (in the spirit of interactive workbooks):
//  - the teacher chooses textbook pages (PDF or photos), AI writes a lesson with several exercises,
//    the teacher edits it, attaches the textbook audio and gives it to a student;
//  - the student does the exercises on one page; speaking answers are recorded with the microphone.
// The PDF never leaves the teacher's computer: only the chosen pages (as pictures) go to the AI.
(function () {
  const { h, toast } = MQ;
  const store = new Proxy({}, { get: (_, k) => MQ.store[k] }); // store.js loads after this file

  const TYPES = {
    match: { ru: 'Соедини пары', icon: '🔗' },
    gap: { ru: 'Вставь слово', icon: '✏️' },
    choice: { ru: 'Выбери ответ', icon: '☑️' },
    order: { ru: 'Расставь слова по порядку', icon: '🧩' },
    read: { ru: 'Чтение + вопросы', icon: '📖' },
    listen: { ru: 'Аудирование', icon: '🎧' },
    speak: { ru: 'Устный ответ (запись голоса)', icon: '🎙️' },
    write: { ru: 'Письменный ответ', icon: '📝' },
  };
  const AUTO = ['match', 'gap', 'choice', 'order', 'read', 'listen']; // checked by the site; speak / write are checked by the teacher

  // ---------- the shape of exercises ----------
  const str = (x) => String(x == null ? '' : x).trim();
  function normQs(items) {
    return (Array.isArray(items) ? items : []).map(q => {
      const options = (q.options || []).map(str).filter(Boolean).slice(0, 4);
      const a = Math.max(0, Math.min(options.length - 1, Number(q.a) || 0));
      return { q: str(q.q), options, a };
    }).filter(q => q.q && q.options.length >= 2);
  }
  function normalize(ex) {
    if (!ex || !TYPES[ex.type]) return null;
    const b = { type: ex.type, title: str(ex.title) || TYPES[ex.type].ru, instruction: str(ex.instruction) };
    if (ex.type === 'match') { b.pairs = (ex.pairs || []).map(p => [str(p[0]), str(p[1])]).filter(p => p[0] && p[1]).slice(0, 10); if (b.pairs.length < 2) return null; }
    if (ex.type === 'gap') {
      b.text = str(ex.text); b.bank = (ex.bank || []).map(str).filter(Boolean);
      if (!/\{[^}]+\}/.test(b.text)) return null;
    }
    if (ex.type === 'choice' || ex.type === 'read' || ex.type === 'listen') { b.items = normQs(ex.items); if (!b.items.length) return null; }
    if (ex.type === 'read') { b.text = str(ex.text); if (!b.text) return null; }
    if (ex.type === 'listen') { b.script = str(ex.script); b.audio = str(ex.audio); if (!b.script && !b.audio) return null; }
    if (ex.type === 'order') { b.items = (ex.items || []).map(str).filter(s => s.split(/\s+/).length >= 3).slice(0, 8); if (!b.items.length) return null; }
    if (ex.type === 'speak' || ex.type === 'write') { b.prompt = str(ex.prompt); if (!b.prompt) return null; if (ex.type === 'write') b.min = Number(ex.min) || 0; }
    return b;
  }

  // ---------- AI: textbook pages -> lesson ----------
  const LESSON_PROMPT = `You are an experienced English teacher of Russian-speaking children (10–12 years old, level A1–A2).
Look at the textbook pages (pictures) and the teacher's notes. Create an interactive homework lesson that practises THE SAME vocabulary and grammar as these pages, but write your OWN sentences and texts: do not copy the book's exercises word for word.
Use only these exercise types: {TYPES}. Make about {COUNT} exercises in a good order (words → grammar → reading/listening → speaking/writing).
JSON shape of each type:
- "match": {"type":"match","title":"…","instruction":"…","pairs":[["English","русский перевод"]]} — 6–8 pairs (word–translation or question–answer).
- "gap": {"type":"gap","title":"…","instruction":"…","bank":["…"],"text":"I {always} get up at seven.\\nShe {never} eats fish."} — 5–8 sentences, one per line, the answer of each gap in {braces}; "bank" = all answers plus 1–2 extra words (or [] if the child should type the words).
- "choice": {"type":"choice","title":"…","instruction":"…","items":[{"q":"…","options":["…","…","…"],"a":0}]} — 5–8 questions, "a" = index of the right option.
- "order": {"type":"order","title":"…","instruction":"Put the words in the right order.","items":["A full correct sentence."]} — 4–6 sentences of 4–9 words.
- "read": {"type":"read","title":"…","instruction":"…","text":"80–150 words","items":[questions as in "choice"]} — 4–5 questions.
- "listen": {"type":"listen","title":"…","instruction":"…","script":"what the child hears: 60–120 words; for a dialogue write lines like 'Ben: …'","items":[questions as in "choice"]} — 4–5 questions. If the pages have a listening exercise, make a similar one on the same topic.
- "speak": {"type":"speak","title":"…","prompt":"what to talk about in 4–6 sentences, with 3–4 helping questions"}
- "write": {"type":"write","title":"…","prompt":"what to write about","min":25}
Titles and instructions in simple English for a child. Return ONLY JSON: {"title":"Unit … · Lesson …","exercises":[…]}`;

  let pdfReady = null;
  function loadPdfJs() {
    if (window.pdfjsLib) return Promise.resolve(window.pdfjsLib);
    if (!pdfReady) pdfReady = new Promise((ok, fail) => {
      const s = document.createElement('script');
      s.src = 'vendor/pdfjs-3.11.174/pdf.min.js';
      s.onload = () => { window.pdfjsLib.GlobalWorkerOptions.workerSrc = 'vendor/pdfjs-3.11.174/pdf.worker.min.js'; ok(window.pdfjsLib); };
      s.onerror = () => fail(new Error('Не удалось загрузить модуль для PDF.'));
      document.head.appendChild(s);
    });
    return pdfReady;
  }
  // "22-25, 27" -> [22, 23, 24, 25, 27]
  function parsePages(text, max) {
    const out = [];
    String(text || '').split(/[,;\s]+/).filter(Boolean).forEach(part => {
      const m = part.match(/^(\d+)(?:[-–—](\d+))?$/);
      if (!m) return;
      const a = +m[1], b = m[2] ? +m[2] : a;
      for (let p = Math.min(a, b); p <= Math.max(a, b); p++) if (p >= 1 && p <= max && !out.includes(p)) out.push(p);
    });
    return out;
  }
  const canvasToJpeg = (c) => c.toDataURL('image/jpeg', 0.82);
  async function pdfPages(file, pagesText, onStatus) {
    const lib = await loadPdfJs();
    const doc = await lib.getDocument({ data: await file.arrayBuffer() }).promise;
    const pages = parsePages(pagesText, doc.numPages);
    if (!pages.length) throw new Error(`Укажите страницы PDF (в файле ${doc.numPages} стр.), например 22–25.`);
    if (pages.length > 6) throw new Error('Не больше 6 страниц за раз — так ИИ работает точнее и дешевле.');
    const out = [];
    for (const n of pages) {
      onStatus && onStatus(`📄 Готовлю страницу ${n}…`);
      const page = await doc.getPage(n);
      const vp1 = page.getViewport({ scale: 1 });
      const vp = page.getViewport({ scale: Math.min(2.5, 1400 / vp1.width) });
      const c = document.createElement('canvas');
      c.width = Math.round(vp.width); c.height = Math.round(vp.height);
      await page.render({ canvasContext: c.getContext('2d'), viewport: vp }).promise;
      out.push(canvasToJpeg(c));
    }
    return { images: out, pages, total: doc.numPages };
  }
  // photos: make them not bigger than 1400 px
  async function photoToJpeg(file) {
    const url = URL.createObjectURL(file);
    try {
      const img = await new Promise((ok, fail) => { const i = new Image(); i.onload = () => ok(i); i.onerror = fail; i.src = url; });
      const k = Math.min(1, 1400 / Math.max(img.width, img.height));
      const c = document.createElement('canvas');
      c.width = Math.round(img.width * k); c.height = Math.round(img.height * k);
      c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
      return canvasToJpeg(c);
    } finally { URL.revokeObjectURL(url); }
  }
  async function generate({ files, pagesText, unitKey, types, count, notes, onStatus }) {
    const images = [];
    let pageInfo = '';
    for (const f of files) {
      if (/pdf$/i.test(f.type) || /\.pdf$/i.test(f.name)) {
        const r = await pdfPages(f, pagesText, onStatus);
        images.push(...r.images); pageInfo = `Textbook pages ${r.pages.join(', ')}.`;
      } else images.push(await photoToJpeg(f));
    }
    if (!images.length && !str(notes)) throw new Error('Добавьте PDF учебника, фото страниц или хотя бы напишите тему.');
    if (images.length > 6) throw new Error('Не больше 6 страниц или фото за раз.');
    const prompt = LESSON_PROMPT.replace('{TYPES}', types.map(t => `"${t}"`).join(', ')).replace('{COUNT}', String(count));
    const material = [pageInfo, MQ.ai.unitMaterial(unitKey), notes ? 'Teacher\'s notes: ' + notes : ''].filter(Boolean).join('\n');
    onStatus && onStatus('✨ ИИ составляет упражнения… (обычно 20–60 секунд)');
    const json = await MQ.ai.askJson(prompt + '\n\n' + (material || '(see the pictures)'), images, 'lesson');
    const exercises = (json.exercises || []).map(normalize).filter(Boolean).filter(b => types.includes(b.type));
    if (!exercises.length) throw new Error('ИИ не прислал упражнений. Попробуйте ещё раз или выберите другие страницы.');
    return { title: str(json.title) || 'Lesson', exercises };
  }

  // ---------- student: one page with all the exercises ----------
  const norm = (s) => MQ.norm(s).replace(/[.!?,]/g, '').trim();
  function mark(el, ok) { el.classList.remove('ok', 'no'); el.classList.add(ok ? 'ok' : 'no'); }

  function questionsUI(items) {
    const picked = items.map(() => null);
    const rows = items.map((q, i) => {
      const order = MQ.shuffle(q.options.map((o, k) => k));
      const btns = order.map(k => h('button', { class: 'ls-opt', onclick: () => { picked[i] = k; btns.forEach(b => b.classList.remove('on', 'ok', 'no')); btns[order.indexOf(k)].classList.add('on'); } }, q.options[k]));
      return { q, btns, order, el: h('div', { class: 'ls-q' }, h('div', { class: 'ls-qtext' }, `${i + 1}. ${q.q}`), h('div', { class: 'ls-opts' }, btns)) };
    });
    return {
      el: h('div', {}, rows.map(r => r.el)),
      check() {
        let c = 0; const wrong = [];
        rows.forEach((r, i) => {
          const ok = picked[i] === r.q.a;
          if (ok) c++; else wrong.push({ q: r.q.q, a: r.q.options[r.q.a] });
          r.btns.forEach(b => b.classList.remove('ok', 'no'));
          if (picked[i] != null) mark(r.btns[r.order.indexOf(picked[i])], ok);
          if (!ok) r.btns[r.order.indexOf(r.q.a)].classList.add('ok');
        });
        return { c, t: rows.length, wrong };
      },
    };
  }

  const BUILD = {
    match(b) {
      const rights = MQ.shuffle(b.pairs.map(p => p[1]));
      const sels = b.pairs.map(() => h('select', { class: 'field ls-sel' }, h('option', { value: '' }, '…'), rights.map(r => h('option', { value: r }, r))));
      return {
        el: h('div', { class: 'ls-match' }, b.pairs.map((p, i) => h('div', { class: 'ls-pair' }, h('span', { class: 'ls-left' }, p[0]), h('span', { class: 'muted' }, '→'), sels[i]))),
        check() {
          let c = 0; const wrong = [];
          b.pairs.forEach((p, i) => { const ok = sels[i].value === p[1]; mark(sels[i], ok); if (ok) c++; else wrong.push({ en: p[0], ru: p[1] }); });
          return { c, t: b.pairs.length, wrong };
        },
      };
    },
    gap(b) {
      const inputs = [];
      const lines = b.text.split('\n').filter(l => l.trim()).map(line => {
        const parts = line.split(/(\{[^}]+\})/);
        return h('p', { class: 'ls-line' }, parts.map(part => {
          const m = part.match(/^\{([^}]+)\}$/);
          if (!m) return part;
          const answer = m[1].split('/').map(s => s.trim());
          const inp = b.bank.length
            ? h('select', { class: 'field ls-gap' }, h('option', { value: '' }, '…'), MQ.shuffle([...new Set(b.bank)]).map(w => h('option', { value: w }, w)))
            : h('input', { class: 'field ls-gap', autocomplete: 'off', size: Math.max(4, answer[0].length + 1) });
          inputs.push({ inp, answer, line: line.replace(/\{([^}]+)\}/g, '___') });
          return inp;
        }));
      });
      return {
        el: h('div', {}, b.bank.length ? h('div', { class: 'ls-bank' }, b.bank.map(w => h('span', { class: 'chip-static' }, w))) : null, lines),
        check() {
          let c = 0; const wrong = [];
          inputs.forEach(x => { const ok = x.answer.some(a => norm(a) === norm(x.inp.value)); mark(x.inp, ok); if (ok) c++; else wrong.push({ q: x.line, a: x.answer[0] }); });
          return { c, t: inputs.length, wrong };
        },
      };
    },
    choice(b) { return questionsUI(b.items); },
    read(b) { const q = questionsUI(b.items); return { el: h('div', {}, h('div', { class: 'ls-text' }, b.text), q.el), check: q.check }; },
    listen(b) {
      const q = questionsUI(b.items);
      let audio = null;
      const play = () => {
        if (b.audio) { if (audio) audio.pause(); audio = new Audio(b.audio); audio.play().catch(e => toast('⚠️ ' + e.message)); }
        else MQ.speak(b.script);
      };
      return {
        el: h('div', {}, h('div', { class: 'ls-player' }, h('button', { class: 'primary', onclick: play }, '▶ Listen'),
          h('button', { onclick: () => { if (audio) audio.pause(); MQ.stopSpeech(); } }, '⏸ Stop'),
          h('span', { class: 'muted' }, b.audio ? 'Textbook audio · you can listen again' : 'You can listen again')), q.el),
        check: q.check,
      };
    },
    order(b) {
      const rows = b.items.map(sentence => {
        const words = sentence.replace(/\s+/g, ' ').trim().split(' ');
        const bank = MQ.shuffle(words.map((w, k) => k));
        const chosen = [];
        const line = h('div', { class: 'ls-build' });
        const pool = h('div', { class: 'ls-pool' });
        const draw = () => {
          line.innerHTML = ''; pool.innerHTML = '';
          chosen.forEach((k, i) => line.append(h('button', { class: 'ls-word on', onclick: () => { chosen.splice(i, 1); draw(); } }, words[k])));
          bank.filter(k => !chosen.includes(k)).forEach(k => pool.append(h('button', { class: 'ls-word', onclick: () => { chosen.push(k); draw(); } }, words[k])));
        };
        draw();
        return { sentence, words, chosen, line, el: h('div', { class: 'ls-q' }, line, pool) };
      });
      return {
        el: h('div', {}, rows.map(r => r.el)),
        check() {
          let c = 0; const wrong = [];
          rows.forEach(r => { const ok = norm(r.chosen.map(k => r.words[k]).join(' ')) === norm(r.sentence); mark(r.line, ok); if (ok) c++; else wrong.push({ en: r.sentence }); });
          return { c, t: rows.length, wrong };
        },
      };
    },
  };

  // 🎙️ voice answer: record, listen, send to the teacher
  function speakUI(b, saved, onSend) {
    const box = h('div', { class: 'ls-rec' });
    let rec = null, chunks = [], blob = null, sent = saved && saved.rec;
    const draw = (state) => {
      box.innerHTML = '';
      if (state === 'on') {
        box.append(h('button', { class: 'ls-recbtn on', onclick: () => rec && rec.stop() }, '⏹ Stop'), h('span', { class: 'muted' }, 'Recording… speak now'));
        return;
      }
      box.append(h('button', { class: 'ls-recbtn', onclick: start }, sent || blob ? '🎙 Record again' : '🎙 Record my answer'));
      const url = blob ? URL.createObjectURL(blob) : sent;
      if (url) box.append(h('audio', { controls: true, src: url }));
      if (blob) box.append(h('button', { class: 'primary', onclick: send }, '📤 Send to my teacher'));
      else if (sent) box.append(h('span', { class: 'feedback good' }, '✓ Sent to your teacher'));
    };
    async function start() {
      if (!navigator.mediaDevices || !window.MediaRecorder) { toast('This browser cannot record sound. Try Chrome.'); return; }
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        chunks = []; blob = null;
        rec = new MediaRecorder(stream);
        rec.ondataavailable = (e) => e.data.size && chunks.push(e.data);
        rec.onstop = () => { stream.getTracks().forEach(t => t.stop()); blob = new Blob(chunks, { type: rec.mimeType || 'audio/webm' }); draw(); };
        rec.start();
        draw('on');
        setTimeout(() => { if (rec && rec.state === 'recording') rec.stop(); }, 180000); // 3 minutes at most
      } catch (e) { toast('🎙 Please allow the microphone. ' + e.message); }
    }
    async function send() {
      try {
        toast('📤 Sending…');
        const url = await store.saveFile(blob, 'rec', blob.type.includes('ogg') ? 'ogg' : blob.type.includes('mp4') ? 'm4a' : 'webm');
        sent = url; blob = null;
        await onSend({ rec: url, at: Date.now() });
        draw(); toast('✓ Sent!');
      } catch (e) { toast('⚠️ ' + e.message); }
    }
    draw();
    return box;
  }
  function writeUI(b, saved, onSend) {
    const ta = h('textarea', { class: 'field', rows: 5, placeholder: 'Write here…' });
    ta.value = (saved && saved.text) || '';
    const msg = h('div', { class: 'feedback good' }, saved && saved.text ? '✓ Sent to your teacher' : '');
    return h('div', {}, ta, b.min ? h('div', { class: 'hint' }, `At least ${b.min} words.`) : null,
      h('div', { class: 'row', style: 'justify-content:flex-start' }, h('button', { class: 'primary', onclick: async () => {
        const words = ta.value.trim().split(/\s+/).filter(Boolean).length;
        if (b.min && words < b.min) { msg.className = 'feedback bad'; msg.textContent = `You have ${words} words. Write at least ${b.min}.`; return; }
        await onSend({ text: ta.value.trim(), at: Date.now() });
        msg.className = 'feedback good'; msg.textContent = '✓ Sent to your teacher';
      } }, '📤 Send')), msg);
  }

  function lessonScreen(app, set) {
    const key = `set:${set.id}/lesson`;
    const data = Object.assign({ blocks: {} }, store.deck(key));
    const blocks = (set.items || []).map(normalize).filter(Boolean);
    const save = async () => {
      // score = auto-checked exercises; voice and writing are for the teacher
      let c = 0, t = 0;
      Object.values(data.blocks).forEach(r => { if (r && r.t) { c += r.c; t += r.t; } });
      const stars = t ? MQ.starsFor(c, t) : 0;
      await store.record(key, { stars, correct: c, total: t, mistakes: [], data });
      drawNav();
    };
    const nav = h('nav', { class: 'ls-nav' });
    const drawNav = () => {
      nav.innerHTML = '';
      nav.append(h('a', { href: '#/', class: 'back' }, '← Home'), h('div', { class: 'ls-navtitle' }, set.title),
        h('div', { class: 'muted', style: 'font-size:.65em' }, `${blocks.length} exercises`),
        blocks.map((b, k) => {
          const r = data.blocks[k];
          const done = r && (r.t ? true : r.rec || r.text);
          return h('a', { href: `#ex-${k}`, class: 'ls-navitem' + (done ? ' done' : ''), onclick: (e) => { e.preventDefault(); document.getElementById('ex-' + k).scrollIntoView({ behavior: 'smooth', block: 'start' }); } },
            h('span', { class: 'ls-dot' }, done ? '✓' : String(k + 1)), `${TYPES[b.type].icon} ${b.title}`);
        }));
    };
    drawNav();
    const cards = blocks.map((b, k) => {
      const head = h('div', { class: 'ls-head' }, h('h2', {}, `${k + 1}. ${b.title}`), h('span', { class: 'muted' }, TYPES[b.type].icon));
      const res = h('div', { class: 'feedback' });
      const prev = data.blocks[k];
      if (prev && prev.t) { res.className = 'feedback soft'; res.textContent = `Last time: ${prev.c} / ${prev.t}`; }
      let body;
      if (b.type === 'speak') body = h('div', {}, h('div', { class: 'ls-text' }, b.prompt), speakUI(b, prev, async (r) => { data.blocks[k] = r; await save(); }));
      else if (b.type === 'write') body = h('div', {}, h('div', { class: 'ls-text' }, b.prompt), writeUI(b, prev, async (r) => { data.blocks[k] = r; await save(); }));
      else {
        const ui = BUILD[b.type](b);
        body = h('div', {}, ui.el, h('div', { class: 'row', style: 'justify-content:flex-start;margin-top:10px' }, h('button', { class: 'primary', onclick: async () => {
          const r = ui.check();
          res.className = 'feedback ' + (r.c === r.t ? 'good' : 'bad');
          res.textContent = r.c === r.t ? `Excellent! ${r.c} / ${r.t} ✓` : `${r.c} / ${r.t}`;
          if (r.c === r.t) MQ.sfx.win(); else MQ.sfx.bad();
          data.blocks[k] = { c: r.c, t: r.t, at: Date.now() };
          if (r.wrong.length) MQ.mistakes.add(r.wrong).catch(() => {});
          await save();
        } }, 'Check')), res);
      }
      return h('section', { class: 'panel ls-card', id: 'ex-' + k }, head, b.instruction ? h('p', { class: 'muted ls-instr' }, b.instruction) : null, body);
    });
    app.append(h('div', { class: 'ls-wrap' }, nav, h('div', { class: 'ls-main' }, cards)));
  }

  // ---------- teacher: a lesson as simple text that is easy to edit ----------
  const qsToText = (items) => items.map(q => [q.q, q.options[q.a], ...q.options.filter((o, i) => i !== q.a)].join(' | ')).join('\n');
  const textToQs = (t) => t.split('\n').map(l => l.split('|').map(s => s.trim())).filter(p => p[0] && p.length >= 3).map(p => ({ q: p[0], options: p.slice(1).filter(Boolean), a: 0 }));
  function blockEditor(b, onChange, actions) {
    const f = {};
    const area = (k, value, rows, hint) => { f[k] = h('textarea', { class: 'field mono', rows }); f[k].value = value; return h('label', { class: 'lbl' }, hint, f[k]); };
    const title = h('input', { class: 'field', value: b.title });
    const instr = h('input', { class: 'field', value: b.instruction || '', placeholder: 'Инструкция для ученицы (по-английски)' });
    const parts = [];
    if (b.type === 'match') parts.push(area('pairs', b.pairs.map(p => p.join(' = ')).join('\n'), 6, 'Пары — по одной в строке: слово = перевод'));
    if (b.type === 'gap') {
      f.bank = h('input', { class: 'field', value: b.bank.join(', ') });
      parts.push(h('label', { class: 'lbl' }, 'Слова для выбора через запятую (пусто — ученица печатает сама)', f.bank));
      parts.push(area('text', b.text, 6, 'Предложения — по одному в строке, ответ в {фигурных скобках}; несколько верных: {is/\'s}'));
    }
    if (b.type === 'read') parts.push(area('text', b.text, 6, 'Текст'));
    if (b.type === 'listen') {
      parts.push(area('script', b.script || '', 4, 'Что звучит (если нет аудио, сайт прочитает этот текст голосом)'));
      f.audio = b.audio || '';
      const audioBox = h('div', { class: 'row', style: 'justify-content:flex-start' });
      const drawAudio = () => {
        audioBox.innerHTML = '';
        if (f.audio) audioBox.append(h('audio', { controls: true, src: f.audio }), h('button', { class: 'chip', onclick: () => { f.audio = ''; drawAudio(); onChange(); } }, '✕ Убрать аудио'));
        const file = h('input', { type: 'file', accept: 'audio/*', class: 'field', onchange: async (e) => {
          const fl = e.target.files[0]; if (!fl) return;
          try { toast('⏫ Загружаю аудио…'); f.audio = await store.saveFile(fl, 'lesson', (fl.name.split('.').pop() || 'mp3').toLowerCase()); drawAudio(); onChange(); toast('✓ Аудио прикреплено'); }
          catch (err) { toast('⚠️ ' + err.message); }
        } });
        audioBox.append(h('label', { class: 'lbl' }, '🎧 Аудио из учебника (mp3):', file));
      };
      drawAudio();
      parts.push(audioBox);
    }
    if (b.type === 'choice' || b.type === 'read' || b.type === 'listen') parts.push(area('items', qsToText(b.items), 6, 'Вопросы — по одному в строке: вопрос | верный ответ | неверный | неверный'));
    if (b.type === 'order') parts.push(area('items', b.items.join('\n'), 5, 'Правильные предложения — по одному в строке (слова перемешаются сами)'));
    if (b.type === 'speak' || b.type === 'write') parts.push(area('prompt', b.prompt, 4, b.type === 'speak' ? 'Задание для устного ответа' : 'Задание для письменного ответа'));
    const read = () => {
      const x = { type: b.type, title: title.value, instruction: instr.value };
      if (f.pairs) x.pairs = f.pairs.value.split('\n').map(l => l.split('=').map(s => s.trim())).filter(p => p[0] && p[1]);
      if (f.bank) x.bank = f.bank.value.split(',').map(s => s.trim()).filter(Boolean);
      if (f.text) x.text = f.text.value;
      if (f.script) x.script = f.script.value;
      if (b.type === 'listen') x.audio = f.audio;
      if (f.items) x.items = b.type === 'order' ? f.items.value.split('\n') : textToQs(f.items.value);
      if (f.prompt) x.prompt = f.prompt.value;
      if (b.type === 'write') x.min = b.min || 0;
      return x;
    };
    const el = h('div', { class: 'panel left ls-edit' },
      h('div', { class: 'row space', style: 'justify-content:space-between' },
        h('b', {}, `${TYPES[b.type].icon} ${TYPES[b.type].ru}`), h('div', { class: 'row' }, actions)),
      h('label', { class: 'lbl' }, 'Название', title), instr, parts);
    el.read = read;
    return el;
  }

  async function teacherList(app) {
    MQ.teacher.header(app, 'lessons');
    const [sets, students, assigns] = await Promise.all([store.sets(), store.students(), store.assignments()]);
    const names = Object.fromEntries(students.map(s => [s.id, s.name]));
    const list = sets.filter(s => s.kind === 'lesson');
    app.append(
      h('div', { class: 'row' }, h('a', { class: 'btn primary', href: '#/teacher/lesson/new' }, '＋ Новый урок из учебника')),
      h('p', { class: 'hint' }, 'Загрузите PDF учебника или фото страниц — ИИ сделает урок с упражнениями по этим страницам. Перед тем как дать ученице, всё можно поправить, прикрепить аудио и добавить задания.'),
      list.length ? h('div', { class: 'grid', style: 'margin-top:12px' }, list.map(set => {
        const who = assigns.filter(a => a.set_id === set.id).map(a => names[a.student_id]).filter(Boolean);
        return h('div', { class: 'tile' },
          h('div', { class: 'big' }, '📚'), h('div', { class: 'title' }, set.title),
          h('div', { class: 'muted' }, `${set.items.length} упражнений · ${who.length ? who.join(', ') : 'не назначен'}`),
          h('div', { class: 'row', style: 'margin-top:10px' },
            h('a', { class: 'btn chip', href: `#/teacher/lesson/${set.id}` }, '✏️ Изменить'),
            h('a', { class: 'btn chip', href: `#/lesson/${set.id}` }, '👀 Как у ученицы'),
            h('button', { class: 'chip', onclick: async () => { if (confirm(`Удалить урок «${set.title}»?`)) { await store.deleteSet(set.id); MQ.route(); } } }, '🗑')));
      })) : h('p', { class: 'muted' }, 'Уроков пока нет.'));
  }

  let draft = null; // a lesson made by AI, before it is saved
  function teacherNew(app) {
    MQ.teacher.header(app, 'lessons');
    const file = h('input', { type: 'file', class: 'field', accept: 'application/pdf,image/*', multiple: true });
    const pages = h('input', { class: 'field', placeholder: 'например 22–25', style: 'max-width:12em' });
    const unit = h('select', { class: 'field' }, h('option', { value: '' }, '— юнит (по желанию) —'), MQ.unitOptions().map(o => h('option', { value: o.key }, o.label)));
    const count = h('select', { class: 'field', style: 'max-width:8em' }, [4, 5, 6, 7, 8].map(n => h('option', { value: n }, String(n))));
    count.value = '6';
    const notes = h('textarea', { class: 'field', rows: 2, placeholder: 'Пожелания (по желанию): например «больше грамматики Present Simple», «без перевода»' });
    const boxes = Object.keys(TYPES).map(t => { const cb = h('input', { type: 'checkbox' }); cb.checked = t !== 'write'; return [t, cb]; });
    const status = h('div', { class: 'hint' });
    const go = h('button', { class: 'primary', onclick: async () => {
      const types = boxes.filter(([, cb]) => cb.checked).map(([t]) => t);
      if (!types.length) { status.textContent = 'Отметьте хотя бы один тип упражнений.'; return; }
      go.disabled = true;
      try {
        const r = await generate({ files: [...file.files], pagesText: pages.value, unitKey: unit.value, types, count: +count.value, notes: notes.value, onStatus: (t) => { status.textContent = t; } });
        draft = { title: r.title, kind: 'lesson', items: r.exercises, unit_key: unit.value || null };
        location.hash = '#/teacher/lesson/draft';
      } catch (e) { status.textContent = '⚠️ ' + e.message; }
      go.disabled = false;
    } }, '✨ Сделать урок с ИИ');
    app.append(h('div', { class: 'panel left narrow', style: 'max-width:720px' },
      h('h2', {}, '📚 Новый урок из учебника'),
      h('label', { class: 'lbl' }, '1. PDF учебника или фото страниц (до 6)', file),
      h('label', { class: 'lbl' }, 'Страницы PDF', pages),
      h('label', { class: 'lbl' }, '2. Юнит — ИИ добавит его слова и грамматику', unit),
      h('div', { class: 'lbl' }, '3. Какие упражнения сделать'),
      h('div', { class: 'unit-checks' }, boxes.map(([t, cb]) => h('label', { class: 'check' }, cb, ` ${TYPES[t].icon} ${TYPES[t].ru}`))),
      h('label', { class: 'lbl' }, 'Сколько упражнений', count),
      notes,
      h('div', { class: 'row', style: 'justify-content:flex-start;margin-top:10px' }, go), status,
      h('p', { class: 'hint' }, 'Сам PDF не загружается на сайт: ИИ получает только выбранные страницы. Аудио из учебника можно прикрепить на следующем шаге. Пустую заготовку без ИИ тоже можно сделать: ', h('a', { href: '#/teacher/lesson/blank' }, 'начать с пустого урока'), '.')));
  }

  async function teacherEdit(app, id) {
    MQ.teacher.header(app, 'lessons');
    let set;
    if (id === 'draft') set = draft;
    else if (id === 'blank') set = { title: 'New lesson', kind: 'lesson', items: [], unit_key: null };
    else set = await store.getSet(id);
    if (!set) { app.append(h('p', {}, 'Урок не найден.'), h('a', { class: 'btn', href: '#/teacher/lessons' }, '← Все уроки')); return; }
    const [students, assigns] = await Promise.all([store.students(), store.assignments()]);
    const title = h('input', { class: 'field', value: set.title, style: 'min-width:min(420px,100%)' });
    const unit = h('select', { class: 'field' }, h('option', { value: '' }, '— без юнита —'), MQ.unitOptions().map(o => h('option', { value: o.key }, o.label)));
    unit.value = set.unit_key || '';
    let blocks = (set.items || []).map(normalize).filter(Boolean);
    const list = h('div');
    let editors = [];
    const sync = () => { blocks = editors.map(e => e.read()); };
    const draw = () => {
      list.innerHTML = '';
      editors = blocks.map((b, k) => blockEditor(b, () => {}, [
        h('button', { class: 'chip', title: 'Выше', disabled: k === 0, onclick: () => { sync(); [blocks[k - 1], blocks[k]] = [blocks[k], blocks[k - 1]]; draw(); } }, '↑'),
        h('button', { class: 'chip', title: 'Ниже', disabled: k === blocks.length - 1, onclick: () => { sync(); [blocks[k + 1], blocks[k]] = [blocks[k], blocks[k + 1]]; draw(); } }, '↓'),
        h('button', { class: 'chip', title: 'Удалить', onclick: () => { sync(); blocks.splice(k, 1); draw(); } }, '🗑'),
      ]));
      editors.forEach((e, k) => list.append(h('div', { class: 'muted', style: 'text-align:left;margin-top:14px' }, `Упражнение ${k + 1}`), e));
    };
    draw();
    const EMPTY = {
      match: { pairs: [['', '']] }, gap: { bank: [], text: 'I {am} a student.' }, choice: { items: [] }, order: { items: ['I get up at seven o\'clock.'] },
      read: { text: '', items: [] }, listen: { script: '', items: [] }, speak: { prompt: 'Tell me about…' }, write: { prompt: 'Write about…', min: 20 },
    };
    const addType = h('select', { class: 'field', style: 'max-width:16em' }, Object.keys(TYPES).map(t => h('option', { value: t }, `${TYPES[t].icon} ${TYPES[t].ru}`)));
    const mine = new Set(assigns.filter(a => a.set_id === set.id).map(a => a.student_id));
    const who = students.map(s => { const cb = h('input', { type: 'checkbox' }); cb.checked = mine.has(s.id); return [s, cb]; });
    const msg = h('div', { class: 'feedback' });
    const saveBtn = h('button', { class: 'primary', onclick: async () => {
      sync();
      const items = blocks.map(normalize);
      const bad = items.findIndex(x => !x);
      if (bad >= 0) { msg.className = 'feedback bad'; msg.textContent = `Упражнение ${bad + 1} заполнено не до конца (нужны вопросы, пары или текст).`; return; }
      if (!items.length) { msg.className = 'feedback bad'; msg.textContent = 'Добавьте хотя бы одно упражнение.'; return; }
      saveBtn.disabled = true;
      try {
        const saved = await store.saveSet({ id: set.id, title: title.value.trim() || 'Lesson', kind: 'lesson', items, unit_key: unit.value || null });
        for (const [s, cb] of who) if (cb.checked !== mine.has(s.id)) await store.assign(s.id, saved.id, cb.checked);
        if (id === 'draft') draft = null;
        toast('✓ Урок сохранён');
        location.hash = '#/teacher/lessons';
      } catch (e) { msg.className = 'feedback bad'; msg.textContent = '⚠️ ' + e.message; }
      saveBtn.disabled = false;
    } }, '💾 Сохранить урок');
    app.append(
      h('a', { href: '#/teacher/lessons', class: 'back' }, '← Все уроки'),
      h('div', { class: 'panel left' },
        h('h2', {}, id === 'draft' ? '✨ Урок от ИИ — проверьте и сохраните' : '✏️ Урок'),
        h('label', { class: 'lbl' }, 'Название', title), h('label', { class: 'lbl' }, 'Юнит', unit)),
      list,
      h('div', { class: 'panel left' },
        h('div', { class: 'row', style: 'justify-content:flex-start' }, addType, h('button', { onclick: () => { sync(); blocks.push(Object.assign({ type: addType.value, title: TYPES[addType.value].ru, instruction: '' }, JSON.parse(JSON.stringify(EMPTY[addType.value])))); draw(); } }, '＋ Добавить упражнение')),
        students.length ? h('div', { class: 'lbl' }, 'Дать ученицам:') : null,
        h('div', { class: 'row', style: 'justify-content:flex-start' }, who.map(([s, cb]) => h('label', { class: 'check' }, cb, ' ' + s.name))),
        h('div', { class: 'row', style: 'justify-content:flex-start;margin-top:12px' }, saveBtn), msg));
  }

  // what the student answered (for the teacher's student page)
  function answersView(row, set) {
    const blocks = ((set && set.items) || []).map(normalize);
    const res = (row.data && row.data.blocks) || {};
    return h('div', { class: 'ls-answers' }, Object.keys(res).sort((a, b) => a - b).map(k => {
      const r = res[k], b = blocks[k];
      const name = b ? `${k * 1 + 1}. ${TYPES[b.type].icon} ${b.title}` : `Упражнение ${k * 1 + 1}`;
      if (r.rec) return h('div', { class: 'ls-ans' }, h('b', {}, name), h('audio', { controls: true, src: r.rec, preload: 'none' }));
      if (r.text) return h('div', { class: 'ls-ans' }, h('b', {}, name), h('div', { class: 'ls-text' }, r.text));
      return h('div', { class: 'ls-ans' }, h('b', {}, name), h('span', { class: r.c === r.t ? 'okk' : r.c / r.t < 0.7 ? 'weak' : '' }, ` ${r.c} / ${r.t}`));
    }));
  }

  MQ.lessons = { TYPES, normalize, generate, lessonScreen, teacherList, teacherNew, teacherEdit, answersView, parsePages, LESSON_PROMPT };
})();
