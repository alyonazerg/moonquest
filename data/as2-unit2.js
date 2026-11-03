// Academy Stars 2 — Unit 2 (DEMO content; will be replaced with the textbook's words and grammar)
// Fields: vocab {en, ru, pic(emoji), example?}; grammar [{title, rule, items:[{q:'... ___ ...', options, a, hint}]}]; sentences [{en, pic?, hint?}]
MQ.addUnit('as2', {
  id: 'u2', order: 2, icon: '🪐', demo: true,
  title: 'Unit 2', subtitle: 'My things (demo)',
  vocab: [
    { en: 'bag', ru: 'сумка, рюкзак', pic: '🎒' },
    { en: 'pencil', ru: 'карандаш', pic: '✏️' },
    { en: 'book', ru: 'книга', pic: '📘' },
    { en: 'ball', ru: 'мяч', pic: '⚽' },
    { en: 'kite', ru: 'воздушный змей', pic: '🪁' },
    { en: 'teddy bear', ru: 'плюшевый мишка', pic: '🧸' },
    { en: 'computer', ru: 'компьютер', pic: '💻' },
    { en: 'bike', ru: 'велосипед', pic: '🚲' },
  ],
  grammar: [
    {
      title: 'have got / has got',
      rule: 'I / you / we / they have got. He / she / it has got.',
      items: [
        { q: 'I ___ got a red bike.', options: ['have', 'has'], a: 'have', hint: 'I → have got' },
        { q: 'She ___ got a teddy bear.', options: ['have', 'has'], a: 'has', hint: 'she → has got' },
        { q: 'We ___ got two balls.', options: ['have', 'has'], a: 'have', hint: 'we → have got' },
        { q: 'My brother ___ got a computer.', options: ['have', 'has'], a: 'has', hint: 'my brother = he → has got' },
        { q: '___ you got a kite?', options: ['Have', 'Has'], a: 'Have', hint: 'Questions: Have you got …?' },
        { q: 'He ___ got a pencil. (✗)', options: ["hasn't", "haven't"], a: "hasn't", hint: "he → hasn't got" },
      ],
    },
  ],
  sentences: [
    { en: 'I have got a new bag.', pic: '🎒' },
    { en: 'She has got a blue kite.', pic: '🪁' },
    { en: 'Have you got a bike?', pic: '🚲', hint: 'It is a question.' },
    { en: "He hasn't got a computer.", pic: '💻' },
  ],
});
