// Academy Stars 2 (2nd ed.) — Unit 2 "My busy week"
// Fields: vocab {en, ru, pic?}; grammar [{title, rule, items:[{q:'... ___ ...', options, a, hint, pic?}]}]; sentences [{en, pic?, hint?}]
MQ.addUnit('as2', {
  id: 'u2', order: 2, icon: '📅',
  title: 'Unit 2 · My busy week',
  subtitle: 'Days, activities, Do you…?, o’clock, cr / dr / gr',
  vocab: [
    // days of the week
    { en: 'Monday', ru: 'понедельник', group: 'Days of the week' },
    { en: 'Tuesday', ru: 'вторник', group: 'Days of the week' },
    { en: 'Wednesday', ru: 'среда', group: 'Days of the week' },
    { en: 'Thursday', ru: 'четверг', group: 'Days of the week' },
    { en: 'Friday', ru: 'пятница', group: 'Days of the week' },
    { en: 'Saturday', ru: 'суббота', group: 'Days of the week' },
    { en: 'Sunday', ru: 'воскресенье', group: 'Days of the week' },
    // activities
    { en: 'have a music lesson', ru: 'урок музыки', pic: '🎵', group: 'Activities' },
    { en: 'play basketball', ru: 'играть в баскетбол', pic: '🏀', group: 'Activities' },
    { en: 'do gymnastics', ru: 'заниматься гимнастикой', pic: '🤸', group: 'Activities' },
    { en: 'go to school', ru: 'ходить в школу', pic: '🏫', group: 'Activities' },
    { en: 'swim', ru: 'плавать', pic: '🏊', group: 'Activities' },
    { en: 'visit grandma', ru: 'навещать бабушку', pic: '👵', group: 'Activities' },
    { en: 'read books', ru: 'читать книги', pic: '📚', group: 'Activities' },
    { en: 'play tennis', ru: 'играть в теннис', pic: '🎾', group: 'Activities' },
    { en: 'play football', ru: 'играть в футбол', pic: '⚽', group: 'Activities' },
    { en: 'do drama', ru: 'заниматься театром', pic: '🎭', group: 'Activities' },
    { en: 'play the piano', ru: 'играть на пианино', pic: '🎹', group: 'Activities' },
    // time
    { en: "one o'clock", ru: 'час', pic: '🕐', group: 'Time' },
    { en: "three o'clock", ru: 'три часа', pic: '🕒', group: 'Time' },
    { en: "seven o'clock", ru: 'семь часов', pic: '🕖', group: 'Time' },
    // sounds cr / dr / gr
    { en: 'crab', ru: 'краб', pic: '🦀', group: 'Sounds cr / dr / gr' },
    { en: 'crocodile', ru: 'крокодил', pic: '🐊', group: 'Sounds cr / dr / gr' },
    { en: 'crayon', ru: 'восковой мелок', pic: '🖍️', group: 'Sounds cr / dr / gr' },
    { en: 'ice cream', ru: 'мороженое', pic: '🍦', group: 'Sounds cr / dr / gr' },
    { en: 'dress', ru: 'платье', pic: '👗', group: 'Sounds cr / dr / gr' },
    { en: 'drink', ru: 'пить', pic: '🥤', group: 'Sounds cr / dr / gr' },
    { en: 'grandpa', ru: 'дедушка', pic: '👴', group: 'Sounds cr / dr / gr' },
    { en: 'green', ru: 'зелёный', pic: '🟢', group: 'Sounds cr / dr / gr' },
  ],
  grammar: [
    {
      title: 'Present Simple (I / we / they)',
      rule: 'I / we / they play. Negative: I / we / they don’t play.',
      items: [
        { q: 'I ___ basketball on Wednesday.', options: ['play', 'plays'], a: 'play', hint: 'I → play' },
        { q: 'We ___ go to school on Saturday.', options: ["don't", "doesn't"], a: "don't", hint: "we → don't" },
        { q: 'I ___ a music lesson on Thursday.', options: ['have', 'has'], a: 'have', hint: 'I → have' },
        { q: 'They ___ play tennis on Monday.', options: ["don't", 'not'], a: "don't", hint: "They don't play …" },
        { q: 'We play football ___ Sunday.', options: ['on', 'in', 'at'], a: 'on', hint: 'Days: on Monday, on Sunday' },
        { q: 'I visit my grandma ___ the weekend.', options: ['at', 'on', 'in'], a: 'at', hint: 'at the weekend' },
      ],
    },
    {
      title: 'play or do?',
      rule: 'play + a game with a ball (play football). do + an activity (do gymnastics, do drama).',
      items: [
        { q: 'They ___ gymnastics on Thursday.', options: ['do', 'play'], a: 'do', pic: '🤸', hint: 'do gymnastics' },
        { q: 'I ___ tennis with my dad.', options: ['play', 'do'], a: 'play', pic: '🎾', hint: 'play + a ball game' },
        { q: 'We ___ drama after school.', options: ['do', 'play'], a: 'do', pic: '🎭', hint: 'do drama' },
        { q: 'They ___ basketball in the school hall.', options: ['play', 'do'], a: 'play', pic: '🏀', hint: 'play + a ball game' },
      ],
    },
    {
      title: 'Do you …? Yes, I do. / No, I don’t.',
      rule: 'Question: Do you play tennis? Answer: Yes, I do. / No, I don’t.',
      items: [
        { q: '___ you visit your grandma at the weekend?', options: ['Do', 'Are'], a: 'Do', hint: 'Do you …?' },
        { q: 'Do you read books? Yes, I ___.', options: ['do', 'am', 'read'], a: 'do', hint: 'Yes, I do.' },
        { q: "Do you play tennis? No, I ___.", options: ["don't", 'not', "am not"], a: "don't", hint: "No, I don't." },
        { q: 'Do you ___ football at the weekend?', options: ['play', 'plays', 'playing'], a: 'play', hint: 'Do you play …?' },
      ],
    },
    {
      title: 'What time is it?',
      rule: "What time is it? It's three o'clock.",
      items: [
        { q: "It's three ___.", options: ["o'clock", 'clock', 'hours'], a: "o'clock", pic: '🕒', hint: "It's three o'clock." },
        { q: "What ___ is it? It's one o'clock.", options: ['time', 'clock', 'hour'], a: 'time', pic: '🕐', hint: 'What time is it?' },
        { q: "It's ___ o'clock.", options: ['seven', 'six', 'eight'], a: 'seven', pic: '🕖', hint: 'Look at the clock: 7' },
      ],
    },
    {
      title: 'Sounds: cr, dr, gr',
      rule: 'cr: crab, crocodile. dr: dress, drink. gr: green, grandpa.',
      items: [
        { q: '___ab', options: ['cr', 'dr', 'gr'], a: 'cr', pic: '🦀', hint: 'crab' },
        { q: '___ess', options: ['dr', 'cr', 'gr'], a: 'dr', pic: '👗', hint: 'dress' },
        { q: '___andpa', options: ['gr', 'cr', 'dr'], a: 'gr', pic: '👴', hint: 'grandpa' },
        { q: '___ayon', options: ['cr', 'dr', 'gr'], a: 'cr', pic: '🖍️', hint: 'crayon' },
        { q: 'ice ___eam', options: ['cr', 'gr', 'dr'], a: 'cr', pic: '🍦', hint: 'ice cream' },
        { q: '___ink', options: ['dr', 'gr', 'cr'], a: 'dr', pic: '🥤', hint: 'drink' },
        { q: '___een', options: ['gr', 'cr', 'dr'], a: 'gr', pic: '🟢', hint: 'green' },
      ],
    },
    {
      title: 'Capital letters',
      rule: 'Names and days start with a capital letter: Sophia, Thursday.',
      items: [
        { q: 'My favourite day is ___.', options: ['Thursday', 'thursday'], a: 'Thursday', hint: 'Days start with a capital letter.' },
        { q: 'My name is ___.', options: ['Sophia', 'sophia'], a: 'Sophia', hint: 'Names start with a capital letter.' },
        { q: 'On ___, I do gymnastics.', options: ['Monday', 'monday'], a: 'Monday', hint: 'Days start with a capital letter.' },
      ],
    },
  ],
  sentences: [
    { en: 'I play basketball on Wednesday.', pic: '🏀' },
    { en: "We don't go to school on Saturday.", pic: '🏫' },
    { en: 'They do gymnastics on Thursday.', pic: '🤸' },
    { en: 'I have a music lesson on Monday.', pic: '🎵' },
    { en: 'Do you visit your grandma at the weekend?', pic: '👵', hint: 'It is a question.' },
    { en: "I don't play tennis at the weekend.", pic: '🎾' },
    { en: 'What time is it?', pic: '🕐', hint: 'It is a question.' },
    { en: "It's three o'clock.", pic: '🕒' },
    { en: 'My favourite day is Saturday.', pic: '😊' },
    { en: 'The big green crocodile sleeps in the rain.', pic: '🐊' },
  ],
});
