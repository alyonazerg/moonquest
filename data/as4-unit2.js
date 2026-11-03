// Academy Stars 4 — Unit 2 (DEMO content; will be replaced with the textbook's words and grammar)
MQ.addUnit('as4', {
  id: 'u2', order: 2, icon: '🌍', demo: true,
  title: 'Unit 2', subtitle: 'Last weekend (demo)',
  vocab: [
    { en: 'museum', ru: 'музей', pic: '🏛️' },
    { en: 'castle', ru: 'замок', pic: '🏰' },
    { en: 'beach', ru: 'пляж', pic: '🏖️' },
    { en: 'camping', ru: 'поход с палатками', pic: '🏕️' },
    { en: 'ticket', ru: 'билет', pic: '🎟️' },
    { en: 'suitcase', ru: 'чемодан', pic: '🧳' },
    { en: 'map', ru: 'карта', pic: '🗺️' },
    { en: 'souvenir', ru: 'сувенир', pic: '🎁' },
  ],
  grammar: [
    {
      title: 'Past Simple',
      rule: 'Regular verbs: + ed (play → played). Irregular verbs: go → went, see → saw. Negative: didn’t + verb.',
      items: [
        { q: 'Last summer we ___ to the beach.', options: ['went', 'goed', 'go'], a: 'went', hint: 'go → went (irregular)' },
        { q: 'I ___ a big castle yesterday.', options: ['saw', 'seed', 'see'], a: 'saw', hint: 'see → saw (irregular)' },
        { q: 'They ___ football on Saturday.', options: ['played', 'plaied', 'play'], a: 'played', hint: 'play → played' },
        { q: 'She didn’t ___ a souvenir.', options: ['buy', 'bought', 'buys'], a: 'buy', hint: 'didn’t + verb (no -ed)' },
        { q: '___ you visit the museum?', options: ['Did', 'Do', 'Was'], a: 'Did', hint: 'Questions: Did you …?' },
        { q: 'We ___ at a hotel. It was great!', options: ['stayed', 'stay', 'staied'], a: 'stayed', hint: 'stay → stayed (y after a vowel: just + ed)' },
      ],
    },
  ],
  sentences: [
    { en: 'We went camping last weekend.', pic: '🏕️' },
    { en: 'Did you buy a ticket?', pic: '🎟️', hint: 'It is a question.' },
    { en: "I didn't visit the castle.", pic: '🏰' },
    { en: 'They saw a dolphin at the beach.', pic: '🐬' },
  ],
});
