// End-of-unit tests in the ВПР-2027 format (4 tasks, 25 points) — only for Academy Stars 2 (the 4th-grade pupil).
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


  // ---------- Academy Stars 2 · Unit 3 · Our things ----------
  if (MQ.courses.as2.units.find(u => u.id === 'u3')) unit('as2', 'u3').vpr = {
    minutes: 45, title: 'Unit 3 test',
    tasks: [
      {
        type: 'listen', instruction: I1,
        dialog: [
          ['Kirsty', 'Henry, look! Whose phone is this?'],
          ['Henry', 'It isn’t my phone. I think it’s Eva’s phone. Her phone is blue.'],
          ['Kirsty', 'And whose glasses are these?'],
          ['Henry', 'They’re Grandpa’s glasses. He can’t read without them!'],
          ['Kirsty', 'Is this our camera?'],
          ['Henry', 'No, it isn’t our camera. Our camera is black. This is Owen and Eva’s camera.'],
          ['Kirsty', 'What can you do with your new watch?'],
          ['Henry', 'I can tell the time and I can listen to music on it.'],
          ['Kirsty', 'Cool! Let’s take a photo of the garden.'],
          ['Henry', 'OK! Smile!'],
        ],
        questions: [
          { q: 'Whose phone is it?', options: ['Henry’s', 'Eva’s', 'Kirsty’s'], a: 2 },
          { q: 'What colour is Eva’s phone?', options: ['blue', 'black', 'red'], a: 1 },
          { q: 'The glasses are …', options: ['Mum’s.', 'Grandma’s.', 'Grandpa’s.'], a: 3 },
          { q: 'Kirsty and Henry’s camera is …', options: ['black.', 'blue.', 'green.'], a: 1 },
          { q: 'Henry can listen to music on his …', options: ['phone.', 'watch.', 'radio.'], a: 2 },
        ],
      },
      {
        type: 'read', instruction: I2, heading: 'Our music room',
        text: 'Hello! I’m Lily and this is my brother Sam. We’ve got a music room in our house. Our guitar is in the music room. It’s brown and old. It was our grandpa’s guitar. Sam plays the guitar on Monday and Friday.\nThere’s a radio in the room, too. It’s Mum’s radio. She listens to music every morning. There’s also a computer. It’s our computer, but Dad uses it, too. We watch cartoons on it at the weekend.\nOur friends Tom and Ann come on Saturday. Their headphones are pink and green. We play games and sing songs together. I really like our music room. It’s my favourite room in the house!',
        questions: [
          { q: 'Where is the guitar?', options: ['in the kitchen', 'in the music room', 'in the garden'], a: 2 },
          { q: 'The guitar was …', options: ['Grandpa’s.', 'Dad’s.', 'Tom’s.'], a: 1 },
          { q: 'Who listens to the radio every morning?', options: ['Sam', 'Lily', 'Mum'], a: 3 },
          { q: 'When do Lily and Sam watch cartoons?', options: ['on Monday', 'at the weekend', 'every morning'], a: 2 },
          { q: 'Choose the true sentence.', options: ['Tom and Ann’s headphones are blue.', 'Sam plays the guitar on Friday.', 'Lily doesn’t like the music room.'], a: 2 },
        ],
      },
      {
        type: 'grammar', instruction: I3, heading: 'Lost property',
        text: 'There is a big box in our classroom. Every Friday our teacher opens it. “{A} watch is this?” she asks. “It’s {B} watch,” says Max. “And these are {C} glasses,” says my friend Ella. Ben and Kate find {D} kite. It is yellow and red. My sister and I see {E} umbrella, too!',
        gaps: [
          { options: ['Who', 'Whose', 'What'], a: 2 },
          { options: ['Max', 'Maxs', 'Max’s'], a: 3 },
          { options: ['Ella’s', 'Ella', 'Ellas'], a: 1 },
          { options: ['our', 'their', 'they'], a: 2 },
          { options: ['our', 'their', 'we'], a: 1 },
        ],
      },
      {
        type: 'form', instruction: I4, heading: 'Daniel Smith',
        text: 'Daniel is from England. He is 9 years old. He lives in York with his mum, dad and little sister. His favourite thing is his new camera. He takes photos of birds in the park. His favourite subject is Art. He plays football on Wednesday and does karate on Friday. He likes apples, but he doesn’t like bananas.',
        fields: [
          { label: 'Name', a: ['Daniel'] },
          { label: 'Age', a: ['nine'], number: true },
          { label: 'City', a: ['York'] },
          { label: 'Number of children in the family', a: ['two'], number: true },
          { label: 'Favourite thing', a: ['camera'] },
          { label: 'Favourite subject', a: ['Art'] },
          { label: 'Favourite sport', a: ['football'] },
          { label: 'Favourite food', a: ['apples', 'apple'] },
        ],
      },
    ],
  };

})();
