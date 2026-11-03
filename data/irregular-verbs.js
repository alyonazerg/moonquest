// Irregular verbs grouped by sound and by how the forms change.
// Each group is a "planet" with its own pattern rule; all verb games work on it.
MQ.addUnit('irr', {
  id: 'g1', order: 1, icon: '🟰', title: 'cut – cut – cut',
  subtitle: 'All three forms are the same',
  note: 'Easy group! V1 = V2 = V3. Nothing changes. Watch out: read – read – read is written the same, but V2 and V3 sound like “red”.',
  verbs: [
    { base: 'cut', v2: 'cut', v3: 'cut', ru: 'резать' },
    { base: 'put', v2: 'put', v3: 'put', ru: 'класть' },
    { base: 'let', v2: 'let', v3: 'let', ru: 'позволять' },
    { base: 'hit', v2: 'hit', v3: 'hit', ru: 'ударять' },
    { base: 'shut', v2: 'shut', v3: 'shut', ru: 'закрывать' },
    { base: 'cost', v2: 'cost', v3: 'cost', ru: 'стоить' },
    { base: 'hurt', v2: 'hurt', v3: 'hurt', ru: 'причинять боль' },
    { base: 'read', v2: 'read', v3: 'read', ru: 'читать ([red] в V2 и V3)' },
  ],
});

MQ.addUnit('irr', {
  id: 'g2', order: 2, icon: '🛒', title: 'buy – bought – bought',
  subtitle: 'V2 = V3 and they end in -ought / -aught',
  note: 'V2 and V3 are the same and rhyme: bought, brought, thought, fought — caught, taught. They all sound like [ɔːt].',
  verbs: [
    { base: 'buy', v2: 'bought', v3: 'bought', ru: 'покупать' },
    { base: 'bring', v2: 'brought', v3: 'brought', ru: 'приносить' },
    { base: 'think', v2: 'thought', v3: 'thought', ru: 'думать' },
    { base: 'fight', v2: 'fought', v3: 'fought', ru: 'драться, бороться' },
    { base: 'catch', v2: 'caught', v3: 'caught', ru: 'ловить' },
    { base: 'teach', v2: 'taught', v3: 'taught', ru: 'учить, обучать' },
  ],
});

MQ.addUnit('irr', {
  id: 'g3', order: 3, icon: '🎤', title: 'sing – sang – sung',
  subtitle: 'i → a → u',
  note: 'The vowel goes i → a → u: sIng – sAng – sUng. Run is similar: rUn – rAn – rUn.',
  verbs: [
    { base: 'sing', v2: 'sang', v3: 'sung', ru: 'петь' },
    { base: 'drink', v2: 'drank', v3: 'drunk', ru: 'пить' },
    { base: 'swim', v2: 'swam', v3: 'swum', ru: 'плавать' },
    { base: 'ring', v2: 'rang', v3: 'rung', ru: 'звонить' },
    { base: 'begin', v2: 'began', v3: 'begun', ru: 'начинать' },
    { base: 'sink', v2: 'sank', v3: 'sunk', ru: 'тонуть' },
    { base: 'run', v2: 'ran', v3: 'run', ru: 'бежать' },
  ],
});

MQ.addUnit('irr', {
  id: 'g4', order: 4, icon: '🌱', title: 'know – knew – known',
  subtitle: '-ow / -aw / -y → -ew → -own / -awn',
  note: 'V2 ends in -ew, V3 ends in -n: grow – grew – grown, draw – drew – drawn, fly – flew – flown.',
  verbs: [
    { base: 'know', v2: 'knew', v3: 'known', ru: 'знать' },
    { base: 'grow', v2: 'grew', v3: 'grown', ru: 'расти' },
    { base: 'throw', v2: 'threw', v3: 'thrown', ru: 'бросать' },
    { base: 'blow', v2: 'blew', v3: 'blown', ru: 'дуть' },
    { base: 'fly', v2: 'flew', v3: 'flown', ru: 'летать' },
    { base: 'draw', v2: 'drew', v3: 'drawn', ru: 'рисовать' },
  ],
});

MQ.addUnit('irr', {
  id: 'g5', order: 5, icon: '😴', title: 'sleep – slept – slept',
  subtitle: 'Long ee / ea → short e + t',
  note: 'The long sound becomes short and we add -t: slEEp – slEpt, kEEp – kEpt, fEEl – fElt. Meet → met (just short e).',
  verbs: [
    { base: 'sleep', v2: 'slept', v3: 'slept', ru: 'спать' },
    { base: 'keep', v2: 'kept', v3: 'kept', ru: 'хранить, держать' },
    { base: 'feel', v2: 'felt', v3: 'felt', ru: 'чувствовать' },
    { base: 'meet', v2: 'met', v3: 'met', ru: 'встречать' },
    { base: 'leave', v2: 'left', v3: 'left', ru: 'уходить, оставлять' },
    { base: 'mean', v2: 'meant', v3: 'meant', ru: 'значить' },
    { base: 'dream', v2: 'dreamt', v3: 'dreamt', ru: 'мечтать, видеть сон' },
    { base: 'learn', v2: 'learnt', v3: 'learnt', ru: 'учить, узнавать' },
  ],
});

MQ.addUnit('irr', {
  id: 'g6', order: 6, icon: '📨', title: 'send – sent – sent',
  subtitle: '-d → -t',
  note: 'Just change the last letter d → t: senD – senT, spenD – spenT, builD – builT.',
  verbs: [
    { base: 'send', v2: 'sent', v3: 'sent', ru: 'отправлять' },
    { base: 'spend', v2: 'spent', v3: 'spent', ru: 'тратить, проводить (время)' },
    { base: 'lend', v2: 'lent', v3: 'lent', ru: 'одалживать' },
    { base: 'build', v2: 'built', v3: 'built', ru: 'строить' },
  ],
});

MQ.addUnit('irr', {
  id: 'g7', order: 7, icon: '🛠️', title: 'make – made – made',
  subtitle: 'V2 = V3 (learn one, get two!)',
  note: 'V2 and V3 are the same word: make – made – made, tell – told – told, find – found – found.',
  verbs: [
    { base: 'make', v2: 'made', v3: 'made', ru: 'делать' },
    { base: 'have', v2: 'had', v3: 'had', ru: 'иметь' },
    { base: 'say', v2: 'said', v3: 'said', ru: 'сказать' },
    { base: 'pay', v2: 'paid', v3: 'paid', ru: 'платить' },
    { base: 'hear', v2: 'heard', v3: 'heard', ru: 'слышать' },
    { base: 'tell', v2: 'told', v3: 'told', ru: 'рассказывать' },
    { base: 'sell', v2: 'sold', v3: 'sold', ru: 'продавать' },
    { base: 'find', v2: 'found', v3: 'found', ru: 'находить' },
    { base: 'stand', v2: 'stood', v3: 'stood', ru: 'стоять' },
    { base: 'sit', v2: 'sat', v3: 'sat', ru: 'сидеть' },
    { base: 'win', v2: 'won', v3: 'won', ru: 'побеждать' },
    { base: 'get', v2: 'got', v3: 'got', ru: 'получать' },
    { base: 'lose', v2: 'lost', v3: 'lost', ru: 'терять' },
  ],
});

MQ.addUnit('irr', {
  id: 'g8', order: 8, icon: '✍️', title: 'write – wrote – written',
  subtitle: 'i → o → i + -en',
  note: 'V2 has o, V3 goes back to i and gets -en: wrIte – wrOte – wrItten, rIde – rOde – rIdden.',
  verbs: [
    { base: 'write', v2: 'wrote', v3: 'written', ru: 'писать' },
    { base: 'ride', v2: 'rode', v3: 'ridden', ru: 'ездить (верхом, на велосипеде)' },
    { base: 'drive', v2: 'drove', v3: 'driven', ru: 'водить машину' },
    { base: 'rise', v2: 'rose', v3: 'risen', ru: 'подниматься' },
  ],
});

MQ.addUnit('irr', {
  id: 'g9', order: 9, icon: '🗣️', title: 'speak – spoke – spoken',
  subtitle: 'o in V2 and V3, V3 ends in -en',
  note: 'V2 and V3 both have o, V3 adds -en: spoke – spokEN, broke – brokEN, chose – chosEN, forgot – forgottEN.',
  verbs: [
    { base: 'speak', v2: 'spoke', v3: 'spoken', ru: 'говорить' },
    { base: 'break', v2: 'broke', v3: 'broken', ru: 'ломать' },
    { base: 'choose', v2: 'chose', v3: 'chosen', ru: 'выбирать' },
    { base: 'wake', v2: 'woke', v3: 'woken', ru: 'просыпаться' },
    { base: 'steal', v2: 'stole', v3: 'stolen', ru: 'красть' },
    { base: 'forget', v2: 'forgot', v3: 'forgotten', ru: 'забывать' },
  ],
});

MQ.addUnit('irr', {
  id: 'g10', order: 10, icon: '🍽️', title: 'eat – ate – eaten',
  subtitle: 'V3 = V1 + -en',
  note: 'V3 is the first form + -en (sometimes -n): eat → eatEN, give → giveN, take → takeN, see → seeN.',
  verbs: [
    { base: 'eat', v2: 'ate', v3: 'eaten', ru: 'есть' },
    { base: 'give', v2: 'gave', v3: 'given', ru: 'давать' },
    { base: 'take', v2: 'took', v3: 'taken', ru: 'брать' },
    { base: 'shake', v2: 'shook', v3: 'shaken', ru: 'трясти' },
    { base: 'fall', v2: 'fell', v3: 'fallen', ru: 'падать' },
    { base: 'see', v2: 'saw', v3: 'seen', ru: 'видеть' },
  ],
});

MQ.addUnit('irr', {
  id: 'g11', order: 11, icon: '⭐', title: 'be – was – been',
  subtitle: 'Special ones: learn them by heart',
  note: 'These verbs have no pattern, but you use them every day! be – was/were – been, go – went – gone, do – did – done, come – came – come.',
  verbs: [
    { base: 'be', v2: 'was/were', v3: 'been', ru: 'быть' },
    { base: 'go', v2: 'went', v3: 'gone', ru: 'идти, ехать' },
    { base: 'do', v2: 'did', v3: 'done', ru: 'делать' },
    { base: 'come', v2: 'came', v3: 'come', ru: 'приходить' },
    { base: 'become', v2: 'became', v3: 'become', ru: 'становиться' },
    { base: 'wear', v2: 'wore', v3: 'worn', ru: 'носить (одежду)' },
  ],
});
