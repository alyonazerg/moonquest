// "My words" dictionary: save words of a student to her own card set (attached to a unit),
// and add any word from a reading text with one tap.
(function () {
  const { h, toast, speak } = MQ;

  // Adds cards to the student's own set for this unit (no duplicates). Returns the saved set.
  async function saveMyWords(unitKey, items) {
    const store = MQ.store;
    if (!store.me) throw new Error('Choose a student first (👤 at the top).');
    const key = unitKey || ((MQ.nowUnits(store.me)[0] || {}).key) || null;
    const target = key && MQ.findUnit(key);
    const all = await store.sets();
    const own = all.find(s => s.student_id === store.me.id && (s.unit_key || null) === key && s.kind === 'words');
    const fresh = items.filter(x => x.en && !(own && own.items.some(o => o.en.toLowerCase() === x.en.toLowerCase())));
    if (own && !fresh.length) return { set: own, added: 0 };
    const set = own
      ? Object.assign(own, { items: own.items.concat(fresh) })
      : { title: `My words · ${target ? target.u.title : 'my dictionary'}`, kind: 'words', items: fresh, unit_key: key, student_id: store.me.id };
    return { set: await store.saveSet(set), added: fresh.length };
  }

  // ---------- tap a word in a text ----------
  const READABLE = '.vpr-text, .vpr-script, .readable';
  const WORD = /[A-Za-z’'-]/;
  let pop = null;
  const close = () => { if (pop) { pop.remove(); pop = null; } };

  function wordAt(x, y) {
    let node, offset;
    if (document.caretRangeFromPoint) { const r = document.caretRangeFromPoint(x, y); if (!r) return null; node = r.startContainer; offset = r.startOffset; }
    else if (document.caretPositionFromPoint) { const r = document.caretPositionFromPoint(x, y); if (!r) return null; node = r.offsetNode; offset = r.offset; }
    if (!node || node.nodeType !== 3) return null;
    const t = node.textContent;
    let a = offset, b = offset;
    while (a > 0 && WORD.test(t[a - 1])) a--;
    while (b < t.length && WORD.test(t[b])) b++;
    const w = t.slice(a, b).replace(/^['’-]+|['’-]+$/g, '');
    return w ? { word: w, context: sentenceAround(t, a) } : null;
  }
  function sentenceAround(t, i) {
    const start = Math.max(t.lastIndexOf('.', i - 1), t.lastIndexOf('!', i - 1), t.lastIndexOf('?', i - 1)) + 1;
    const ends = ['.', '!', '?'].map(c => t.indexOf(c, i)).filter(n => n >= 0);
    return t.slice(start, ends.length ? Math.min(...ends) + 1 : t.length).trim().slice(0, 220);
  }

  async function addWord(word, context, unitKey, btn) {
    btn.disabled = true; btn.textContent = '⏳';
    let item = { en: word, ru: '', pic: '' };
    try {
      if (MQ.ai.canMakeCards()) {
        const r = await MQ.ai.recognize({ text: `Word to learn: "${word}". Translate only this word as it is used here (do not take other words): ${context}` });
        const it = (r.items || []).find(x => (x.en || '').toLowerCase() === word.toLowerCase()) || (r.items || [])[0];
        if (it && it.en) item = { en: it.en, ru: it.ru || '', pic: it.pic || '' };
      }
    } catch (e) { /* save the word without a translation */ }
    try {
      const { added } = await saveMyWords(unitKey, [item]);
      MQ.sfx.good();
      toast(added ? `✅ “${item.en}”${item.ru ? ' — ' + item.ru : ''} is in My words` : `“${item.en}” is already in My words`);
      close();
    } catch (e) { toast('⚠️ ' + e.message); btn.disabled = false; btn.textContent = '＋ Add to my words'; }
  }

  function showPop(word, context, x, y) {
    close();
    const unitKey = MQ.pageUnitKey || null;
    const addBtn = h('button', { class: 'primary chip', onclick: (e) => { e.stopPropagation(); addWord(word, context, unitKey, addBtn); } }, '＋ Add to my words');
    pop = h('div', { class: 'word-pop', onpointerdown: (e) => e.stopPropagation() },
      h('b', {}, word),
      h('button', { class: 'chip', onclick: (e) => { e.stopPropagation(); speak(word); } }, '🔊'),
      addBtn,
      h('button', { class: 'chip ghost', onclick: close }, '✕'));
    document.body.append(pop);
    const r = pop.getBoundingClientRect();
    pop.style.left = Math.max(8, Math.min(window.innerWidth - r.width - 8, x - r.width / 2)) + 'px';
    pop.style.top = Math.max(8, y - r.height - 12 + window.scrollY) + 'px';
  }

  document.addEventListener('pointerup', (e) => {
    const box = e.target.closest && e.target.closest(READABLE);
    if (!box || e.target.closest('select, input, button, textarea')) return;
    const sel = String(window.getSelection() || '').trim();
    // a selected phrase (up to 4 words) or the word under the finger
    if (sel && sel.length <= 40 && /^[A-Za-z’' -]+$/.test(sel) && sel.split(/\s+/).length <= 4) return showPop(sel, sentenceAround(box.textContent, box.textContent.indexOf(sel)), e.clientX, e.clientY);
    const w = wordAt(e.clientX, e.clientY);
    if (w) showPop(w.word, w.context, e.clientX, e.clientY);
  });
  document.addEventListener('pointerdown', (e) => { if (pop && !pop.contains(e.target)) close(); });
  window.addEventListener('hashchange', close);

  MQ.dict = { saveMyWords };
})();
