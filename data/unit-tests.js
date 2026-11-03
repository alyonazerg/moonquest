// End-of-unit tests in the ВПР-2027 format (4 tasks, 25 points), written for each textbook unit.
// The test shows up on the unit page; new ones can be generated in the teacher room.
(function () {
  const unit = (c, id) => MQ.courses[c].units.find(u => u.id === id);
  const I1 = 'Ты услышишь диалог. Для каждого предложения А–Е выбери один правильный вариант ответа из трёх предложенных (1, 2 или 3). Ты услышишь текст дважды.';
  const I2 = 'Прочитай текст. Для каждого предложения А–Е выбери один правильный вариант ответа из трёх предложенных (1, 2 или 3).';
  const I3 = 'Прочитай рассказ. Вставь вместо каждого пропуска, обозначенного буквами А–Е, нужную грамматическую форму, выбрав её из трёх предложенных вариантов (1, 2 или 3).';
  const I4 = 'Помоги своему другу заполнить анкету для сайта «Друзья онлайн». Прочитай текст и запиши информацию в таблицу. Под каждым номером запиши только одно слово (без артиклей). Числа необходимо записать словами.';

  // ---------- Academy Stars 2 · Unit 2 · My busy week ----------
  unit('as2', 'u2').vpr = {
    minutes: 45, title: 'Unit 2 test',
    tasks: [
      {
        type: 'listen', instruction: I1,
        dialog: [
          ['Ben', 'Mia, what do you do on Monday after school?'],
          ['Mia', 'On Monday I have a music lesson. I play the piano.'],
          ['Ben', 'Do you play basketball?'],
          ['Mia', 'Yes, I do. I play basketball on Wednesday in the school hall.'],
          ['Ben', 'What about Thursday?'],
          ['Mia', 'On Thursday I do gymnastics. It’s my favourite day!'],
          ['Ben', 'Do you go to school on Saturday?'],
          ['Mia', 'No, I don’t. On Saturday I visit my grandma. We read books and make a cake.'],
          ['Ben', 'What time do you get up on Sunday?'],
          ['Mia', 'At nine o’clock!'],
        ],
        questions: [
          { q: 'What does Mia do on Monday?', options: ['She plays basketball.', 'She has a music lesson.', 'She does gymnastics.'], a: 2 },
          { q: 'When does Mia play basketball?', options: ['on Tuesday', 'on Wednesday', 'on Friday'], a: 2 },
          { q: 'What is Mia’s favourite day?', options: ['Monday', 'Thursday', 'Saturday'], a: 2 },
          { q: 'What does Mia do on Saturday? She …', options: ['goes to school.', 'plays tennis.', 'visits her grandma.'], a: 3 },
          { q: 'What time does Mia get up on Sunday?', options: ['at seven o’clock', 'at eight o’clock', 'at nine o’clock'], a: 3 },
        ],
      },
      {
        type: 'read', instruction: I2, heading: 'Jack’s week',
        text: 'Jack is nine. He lives in a flat with his mum and dad. From Monday to Friday he goes to school. On Tuesday and Thursday he plays football after school. He doesn’t like tennis.\nOn Friday Jack has a drama club. He loves acting! At the weekend Jack and his dad swim in the pool. On Sunday evening they watch films together. Jack’s favourite day is Friday because of the drama club.',
        questions: [
          { q: 'Where does Jack live?', options: ['in a house', 'in a flat', 'with his grandma'], a: 2 },
          { q: 'When does Jack play football?', options: ['on Monday and Wednesday', 'on Tuesday and Thursday', 'at the weekend'], a: 2 },
          { q: 'What doesn’t Jack like?', options: ['tennis', 'football', 'swimming'], a: 1 },
          { q: 'What does Jack do at the weekend?', options: ['He goes to school.', 'He swims with his dad.', 'He has a drama club.'], a: 2 },
          { q: 'Choose the true sentence.', options: ['Jack’s favourite day is Sunday.', 'Jack watches films on Sunday evening.', 'Jack has a drama club on Monday.'], a: 2 },
        ],
      },
      {
        type: 'grammar', instruction: I3, heading: 'My busy week',
        text: 'I {A} to school from Monday to Friday. On Monday we {B} gymnastics. My friends and I {C} basketball on Wednesday. We {D} go to school at the weekend. {E} you visit your grandma on Sunday?',
        gaps: [
          { options: ['go', 'goes', 'going'], a: 1 },
          { options: ['play', 'do', 'does'], a: 2 },
          { options: ['plays', 'play', 'playing'], a: 2 },
          { options: ['don’t', 'doesn’t', 'not'], a: 1 },
          { options: ['Do', 'Does', 'Are'], a: 1 },
        ],
      },
      {
        type: 'form', instruction: I4, heading: 'Sophia Petrova',
        text: 'Sophia is from Russia. She is 10 years old. She lives in Omsk. She has got two sisters. Her favourite day is Saturday. On Saturday she plays tennis with her dad. Her favourite subject is Music. She likes cake but she doesn’t like fish.',
        fields: [
          { label: 'Name', a: ['Sophia'] },
          { label: 'Age', a: ['ten'], number: true },
          { label: 'City', a: ['Omsk'] },
          { label: 'Number of children in the family', a: ['three'], number: true },
          { label: 'Favourite day', a: ['Saturday'] },
          { label: 'Favourite sport', a: ['tennis'] },
          { label: 'Favourite subject', a: ['Music'] },
          { label: 'Favourite food', a: ['cake'] },
        ],
      },
    ],
  };

  // ---------- Academy Stars 4 · Unit 2 · Different lives ----------
  unit('as4', 'u2').vpr = {
    minutes: 45, title: 'Unit 2 test',
    tasks: [
      {
        type: 'listen', instruction: I1,
        dialog: [
          ['Lucy', 'Grandpa, could you swim when you were six?'],
          ['Grandpa', 'No, I couldn’t. I learnt to swim when I was eight.'],
          ['Lucy', 'Did you live in a city?'],
          ['Grandpa', 'No, I lived in a small village near a forest. Every day I walked across the fields to school.'],
          ['Lucy', 'How long did it take?'],
          ['Grandpa', 'About half an hour. In winter we went to school by sledge!'],
          ['Lucy', 'What did you want to be?'],
          ['Grandpa', 'I wanted to be a pilot. But then I decided to become a teacher.'],
        ],
        questions: [
          { q: 'When did Grandpa learn to swim?', options: ['when he was six', 'when he was eight', 'when he was ten'], a: 2 },
          { q: 'Where did Grandpa live?', options: ['in a big city', 'in a village near a forest', 'by the sea'], a: 2 },
          { q: 'How did he get to school? He …', options: ['walked across the fields.', 'went by bus.', 'rode a bike.'], a: 1 },
          { q: 'How did the children go to school in winter?', options: ['by car', 'by sledge', 'on foot'], a: 2 },
          { q: 'What did Grandpa become?', options: ['a pilot', 'a farmer', 'a teacher'], a: 3 },
        ],
      },
      {
        type: 'read', instruction: I2, heading: 'The kind king',
        text: 'Once upon a time there was a king who lived in a big castle on a hill. He was rich but he was not happy because he had no friends. One day he decided to go to the village. He put on old clothes, so nobody knew he was the king.\nIn the village he met a poor girl called Rosa. She was selling flowers. The king bought all her flowers and gave them to the old people in the village. Rosa laughed and said, “You are a very kind man!” The king and Rosa became good friends. Every Sunday he visited the village and helped people.',
        questions: [
          { q: 'Why wasn’t the king happy?', options: ['He was poor.', 'He had no friends.', 'He lived in a village.'], a: 2 },
          { q: 'What did the king put on?', options: ['old clothes', 'a crown', 'a new coat'], a: 1 },
          { q: 'What was Rosa doing? She was …', options: ['selling flowers.', 'making bread.', 'singing songs.'], a: 1 },
          { q: 'What did the king do with the flowers?', options: ['He took them to the castle.', 'He gave them to old people.', 'He gave them back to Rosa.'], a: 2 },
          { q: 'Choose the true sentence.', options: ['Rosa knew he was the king.', 'The king visited the village every Sunday.', 'The king and Rosa never met again.'], a: 2 },
        ],
      },
      {
        type: 'grammar', instruction: I3, heading: 'A walk in the forest',
        text: 'Last Saturday my family and I {A} for a long walk. First we walked {B} the old bridge. Then we went {C} the river for an hour. After that we found a little path and decided {D} a dark forest. My little brother {E} climb the big oak tree, but I could!',
        gaps: [
          { options: ['go', 'went', 'going'], a: 2 },
          { options: ['across', 'into', 'out of'], a: 1 },
          { options: ['along', 'up', 'into'], a: 1 },
          { options: ['explore', 'to explore', 'exploring'], a: 2 },
          { options: ['can’t', 'couldn’t', 'didn’t'], a: 2 },
        ],
      },
      {
        type: 'form', instruction: I4, heading: 'Max Volkov',
        text: 'Max is from Russia. He is 12 years old. He lives in Sochi near the sea. He has got one brother. Max wants to be a pilot in the future. He loves surfing. His favourite subject is Geography. He likes fish but he doesn’t like meat.',
        fields: [
          { label: 'Name', a: ['Max'] },
          { label: 'Age', a: ['twelve'], number: true },
          { label: 'City', a: ['Sochi'] },
          { label: 'Number of children in the family', a: ['two'], number: true },
          { label: 'Future job', a: ['pilot'] },
          { label: 'Favourite sport', a: ['surfing'] },
          { label: 'Favourite subject', a: ['Geography'] },
          { label: 'Favourite food', a: ['fish'] },
        ],
      },
    ],
  };
})();
