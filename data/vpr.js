// ВПР 4 класс (английский): practice variants in the exam format — tasks 1–3
// (listening, reading, grammar in a text). Texts are original, A1 level, 4th-grade topics.
// Task 4 and the exact scoring will be added from the official demo version.
MQ.addUnit('vpr', {
  id: 'v1', order: 1, icon: '📝', title: 'Вариант 1',
  subtitle: 'Lucy’s family · Tom’s busy week · Anna',
  vpr: {
    minutes: 45,
    tasks: [
      {
        type: 'listen', title: 'Задание 1 · Аудирование',
        instruction: 'Вы услышите рассказ девочки. Прослушайте его два раза и выберите правильный ответ на каждый вопрос.',
        audio: 'Hi! My name is Lucy. I am nine years old. I live in a small house with my mum, my dad and my little brother Tom. We have got a black cat. Its name is Smudge. On Saturday I go to the park with my friend Kate. We ride our bikes and play tennis. I don’t like football. My favourite food is pizza. On Sunday we visit Grandma. She makes a big chocolate cake!',
        questions: [
          { q: 'How old is Lucy?', options: ['eight', 'nine', 'ten'], a: 'nine' },
          { q: 'What pet has Lucy got?', options: ['a dog', 'a cat', 'a rabbit'], a: 'a cat' },
          { q: 'When does Lucy go to the park?', options: ['on Friday', 'on Saturday', 'on Sunday'], a: 'on Saturday' },
          { q: 'What doesn’t Lucy like?', options: ['tennis', 'football', 'bikes'], a: 'football' },
          { q: 'Who makes a chocolate cake?', options: ['Mum', 'Kate', 'Grandma'], a: 'Grandma' },
        ],
      },
      {
        type: 'read', title: 'Задание 2 · Чтение',
        instruction: 'Прочитайте текст. Определите, какие утверждения соответствуют тексту (True), а какие не соответствуют (False).',
        text: 'Tom’s busy week\n\nTom is ten. He goes to school from Monday to Friday. On Monday and Wednesday he has a swimming lesson after school. On Tuesday he plays basketball with his friends in the school hall. On Thursday he has a music lesson. He plays the guitar. On Friday evening Tom watches cartoons with his sister. At the weekend Tom doesn’t go to school. He helps his dad in the garden and reads books.',
        questions: [
          { q: 'Tom goes to school on Saturday.', options: ['True', 'False'], a: 'False' },
          { q: 'Tom swims on Wednesday.', options: ['True', 'False'], a: 'True' },
          { q: 'Tom plays the piano.', options: ['True', 'False'], a: 'False' },
          { q: 'Tom watches cartoons on Friday evening.', options: ['True', 'False'], a: 'True' },
          { q: 'At the weekend Tom helps his dad.', options: ['True', 'False'], a: 'True' },
        ],
      },
      {
        type: 'grammar', title: 'Задание 3 · Грамматика',
        instruction: 'Прочитайте текст. Выберите в каждом пропуске правильную форму слова.',
        text: 'My friend Anna {1} in London. She {2} two brothers. They {3} seven and twelve. Anna {4} like rainy days. Look! It {5} now. So Anna and her brothers {6} a film at home.',
        gaps: [
          { options: ['live', 'lives', 'living'], a: 'lives' },
          { options: ['has got', 'have got', 'is'], a: 'has got' },
          { options: ['is', 'are', 'am'], a: 'are' },
          { options: ['don’t', 'doesn’t', 'isn’t'], a: 'doesn’t' },
          { options: ['rains', 'is raining', 'rain'], a: 'is raining' },
          { options: ['is watching', 'are watching', 'watches'], a: 'are watching' },
        ],
      },
    ],
  },
});

MQ.addUnit('vpr', {
  id: 'v2', order: 2, icon: '📝', title: 'Вариант 2',
  subtitle: 'At the zoo · Mia’s pet · Our school',
  vpr: {
    minutes: 45,
    tasks: [
      {
        type: 'listen', title: 'Задание 1 · Аудирование',
        instruction: 'Вы услышите рассказ мальчика о походе в зоопарк. Прослушайте его два раза и выберите правильный ответ на каждый вопрос.',
        audio: 'Hello, I’m Ben. Yesterday was Sunday and it was sunny and warm. I went to the zoo with my dad. First we saw the lions. They were big and sleepy. Then we watched the monkeys. They were very funny! My favourite animals were the penguins. They can swim very fast. We had lunch at the zoo café. I had a cheese sandwich and an orange juice. We went home at five o’clock.',
        questions: [
          { q: 'What was the weather like?', options: ['rainy and cold', 'sunny and warm', 'snowy'], a: 'sunny and warm' },
          { q: 'Who did Ben go to the zoo with?', options: ['his mum', 'his dad', 'his sister'], a: 'his dad' },
          { q: 'What were the lions like?', options: ['big and sleepy', 'small and funny', 'fast'], a: 'big and sleepy' },
          { q: 'What were Ben’s favourite animals?', options: ['monkeys', 'lions', 'penguins'], a: 'penguins' },
          { q: 'When did they go home?', options: ['at three o’clock', 'at five o’clock', 'at seven o’clock'], a: 'at five o’clock' },
        ],
      },
      {
        type: 'read', title: 'Задание 2 · Чтение',
        instruction: 'Прочитайте текст. Определите, какие утверждения соответствуют тексту (True), а какие не соответствуют (False).',
        text: 'Mia’s pet\n\nMia is eleven and she has got a little dog. His name is Biscuit. He is brown and white and he has got long ears. Biscuit likes running in the park and playing with a ball. He doesn’t like baths! Every morning Mia gives Biscuit his breakfast. In the evening Mia and her mum take Biscuit for a walk. Biscuit sleeps in a small bed in the kitchen.',
        questions: [
          { q: 'Mia has got a cat.', options: ['True', 'False'], a: 'False' },
          { q: 'Biscuit has got long ears.', options: ['True', 'False'], a: 'True' },
          { q: 'Biscuit likes baths.', options: ['True', 'False'], a: 'False' },
          { q: 'Mia gives Biscuit his breakfast every morning.', options: ['True', 'False'], a: 'True' },
          { q: 'Biscuit sleeps in Mia’s bedroom.', options: ['True', 'False'], a: 'False' },
        ],
      },
      {
        type: 'grammar', title: 'Задание 3 · Грамматика',
        instruction: 'Прочитайте текст. Выберите в каждом пропуске правильную форму слова.',
        text: 'Our school {1} big and beautiful. There {2} twenty classrooms in it. My classroom is on the second floor. We {3} English on Monday and Thursday. Our teacher {4} Mrs Green. She {5} very kind. Last year we {6} a school concert and our parents came to see it.',
        gaps: [
          { options: ['is', 'are', 'am'], a: 'is' },
          { options: ['is', 'are', 'be'], a: 'are' },
          { options: ['have', 'has', 'having'], a: 'have' },
          { options: ['is', 'are', 'be'], a: 'is' },
          { options: ['is', 'are', 'am'], a: 'is' },
          { options: ['have', 'had', 'has'], a: 'had' },
        ],
      },
    ],
  },
});
