// "My mistakes": one deck for everything a student got wrong in any game (words, verbs, grammar,
// sentences). The cards come back with spaced repetition (the same scheduler as the flashcards).
(function () {
  const KEY_ITEMS = 'mistakes:items'; // { id: { kind, item, added } }
  const KEY_DECK = 'mistakes:deck';   // Anki schedule { id: { due, ivl, … } }

  // a mistake from any game -> a card, or null if it cannot be practised as a card
  function toCard(m) {
    if (!m || typeof m !== 'object') return null;
    const v = m.v && m.v.base ? m.v : (m.base && m.v2 && m.v3 ? m : null);
    if (v) return { id: 'v:' + v.base, kind: 'verb', item: { base: v.base, v2: v.v2, v3: v.v3, ru: v.ru || '' } };
    if (m.q && m.a != null && !/^Задание|^Анкета/.test(String(m.en || ''))) {
      return { id: 'q:' + m.q, kind: 'qa', item: { q: String(m.q), a: String(m.a), topic: m.topic || m.cat || '', pic: m.pic || '' } };
    }
    const en = String(m.en || '').trim();
    if (!en || /→|^Задание|^Анкета|\(V[23]\)/.test(en)) return null;
    if (!m.ru && /\s/.test(en) && /[.?!]$/.test(en)) return { id: 's:' + en, kind: 'sent', item: { en, pic: m.pic || '' } };
    return { id: 'w:' + en.toLowerCase(), kind: 'word', item: { en, ru: m.ru || '', pic: m.pic || '', img: m.img || '', example: m.example || '' } };
  }

  // Adds mistakes to the deck. A card that is wrong again starts from the beginning.
  async function add(list) {
    const store = MQ.store;
    if (!store.me || !list || !list.length) return 0;
    const items = store.deck(KEY_ITEMS), sched = store.deck(KEY_DECK);
    let fresh = 0, reset = false;
    list.forEach(m => {
      const c = toCard(m);
      if (!c) return;
      if (!items[c.id]) fresh++;
      items[c.id] = { kind: c.kind, item: c.item, added: Date.now() };
      if (sched[c.id]) { delete sched[c.id]; reset = true; }
    });
    await store.saveDeck(KEY_ITEMS, items);
    if (reset) await store.saveDeck(KEY_DECK, sched);
    return fresh;
  }
  const cards = () => Object.entries(MQ.store.deck(KEY_ITEMS)).map(([id, x]) => ({ id, kind: x.kind, verb: x.kind === 'verb', item: x.item }));
  function dueCount() {
    const s = MQ.store.deck(KEY_DECK), now = Date.now();
    return cards().filter(c => !s[c.id] || s[c.id].due <= now).length;
  }
  // cards that are learnt well (interval of 3+ weeks) can be taken out
  async function removeLearnt() {
    const items = MQ.store.deck(KEY_ITEMS), s = MQ.store.deck(KEY_DECK);
    let n = 0;
    Object.keys(items).forEach(id => { if (s[id] && s[id].ivl >= 21) { delete items[id]; delete s[id]; n++; } });
    await MQ.store.saveDeck(KEY_ITEMS, items);
    await MQ.store.saveDeck(KEY_DECK, s);
    return n;
  }

  MQ.mistakes = { toCard, add, cards, dueCount, removeLearnt, KEY_DECK, KEY_ITEMS };
})();
