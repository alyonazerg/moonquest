// ВПР 4 класс, английский язык — тренажёр в формате ВПР-2027 (ФИОКО):
// 1) аудирование A–E (3 варианта), 2) чтение A–E, 3) грамматика в тексте A–E, 4) анкета (8 полей).
// Баллы: 5 + 5 + 5 + 10 (К1 до 8, К2 до 2) = 25. Отметка: 0–9 «2», 10–14 «3», 15–21 «4», 22–25 «5».
// Вариант «Демоверсия» — официальный образец ФИОКО 2027 (© Рособрнадзор), остальные варианты — авторские.

MQ.addUnit('vpr', {
  id: 'demo', order: 0, icon: '🏛️', title: 'Демоверсия 2027',
  subtitle: 'Официальный образец ФИОКО',
  vpr: {
    minutes: 45, source: 'Образец проверочной работы ВПР-2027, ФИОКО (© Рособрнадзор)',
    tasks: [
      {
        type: 'listen',
        instruction: 'Ты услышишь диалог. Для каждого предложения А–Е выбери один правильный вариант ответа из трёх предложенных (1, 2 или 3). Ты услышишь текст дважды.',
        dialog: [
          ['Mum', 'Dan, are you going to have any tests at school tomorrow?'],
          ['Dan', 'Yes, I am going to have a Maths test. I think I will get a good mark. I always do my homework.'],
          ['Mum', 'What will you do at the English lesson?'],
          ['Dan', 'I think we will learn some new words. It’s great. I like English. By the way, we have a new Music teacher.'],
          ['Mum', 'What’s her name?'],
          ['Dan', 'Her name is Anna Yurievna. I hope we will listen to some wonderful music at the lesson and learn a new song.'],
          ['Mum', 'What are you going to do after the lessons tomorrow?'],
          ['Dan', 'I want to go to the café to eat pizza with my classmate Tim. I will come home at 3 p.m.'],
          ['Mum', 'When will you do your homework?'],
          ['Dan', 'I’ll do my homework after having lunch.'],
          ['Mum', 'OK. I hope you’ll have a great day.'],
        ],
        questions: [
          { q: 'What do you know about Dan?', options: ['He is a pupil.', 'He is a new teacher.', 'He is the pupil’s friend.'], a: 1 },
          { q: 'What subject is the boy going to have a test in?', options: ['English.', 'Music.', 'Maths.'], a: 3 },
          { q: 'What is the boy’s favourite subject?', options: ['English.', 'Music.', 'Maths.'], a: 1 },
          { q: 'What does the boy hope to do at the English lesson? He hopes to …', options: ['learn new words.', 'sing a new song.', 'meet a new teacher.'], a: 1 },
          { q: 'What does the boy want to do after the lessons? He wants to …', options: ['listen to music.', 'do his homework.', 'eat pizza in the café.'], a: 3 },
        ],
      },
      {
        type: 'read',
        instruction: 'Прочитай текст. Для каждого предложения А–Е выбери один правильный вариант ответа из трёх предложенных (1, 2 или 3).',
        heading: 'Peter',
        text: 'Peter did not have any brothers or sisters. He was an only child. Peter lived in a big city near a river but he liked to go to the park in the afternoon after school when the weather was nice. He walked in the park and looked at other boys who played football there.\nWhen it rained, his mum took him to the library where Peter chose a book to read. He liked reading very much. He enjoyed books about pirates and space explorers but he did not like fairy tales.\nWhen Peter was ten years old his father said that he did not have a job any more. Peter’s parents decided to sell their house in the city and move to a small village. Peter was both happy and sad. He enjoyed living in a big city but he was happy because he hoped to have a lot of adventures in the countryside.',
        questions: [
          { q: 'How many children were there in Peter’s family?', options: ['one', 'two', 'three'], a: 1 },
          { q: 'What did Peter do in the park?', options: ['He played football.', 'He read books.', 'He walked.'], a: 3 },
          { q: 'What books did Peter like reading? He liked …', options: ['books about football players.', 'books about adventures.', 'fairy tales.'], a: 2 },
          { q: 'What happened when Peter was ten years old?', options: ['His dad found a new job.', 'His father lost his job.', 'His father bought a new house in a big city.'], a: 2 },
          { q: 'Choose the true sentence.', options: ['Peter did not like his big city.', 'Peter hoped to have new adventures.', 'Peter didn’t want to move to the village.'], a: 2 },
        ],
      },
      {
        type: 'grammar',
        instruction: 'Прочитай рассказ. Вставь вместо каждого пропуска, обозначенного буквами А–Е, нужную грамматическую форму, выбрав её из трёх предложенных вариантов (1, 2 или 3).',
        heading: 'Lake Baikal',
        text: 'Last year I visited Siberia. I {A} Lake Baikal. It is a very beautiful deep lake. It is also the {B} freshwater lake in the world. It is 25 million years old. There are about 100 volcanoes but there are {C} active ones. 336 rivers flow into Lake Baikal. Only one flows out, which is the Upper Angara.\nThere are more than thirty rocky islands in this lake. One of them is Olkhon. A lot of people {D} it every year. Lake Baikal is home to thousands of different plants and animals. People like taking photos of {E}.',
        gaps: [
          { options: ['see', 'saw', 'seeing'], a: 2 },
          { options: ['oldest', 'older', 'old'], a: 1 },
          { options: ['some', 'any', 'no'], a: 3 },
          { options: ['visit', 'to visit', 'visiting'], a: 1 },
          { options: ['they', 'them', 'their'], a: 2 },
        ],
      },
      {
        type: 'form',
        instruction: 'Помоги своему другу заполнить анкету для сайта «Друзья онлайн». Прочитай текст и запиши информацию в таблицу. Под каждым номером запиши только одно слово (без артиклей). Числа необходимо записать словами.',
        heading: 'Tim Ivanov',
        text: 'Tim is from Russia. He is 9 years old. Tim lives in Saratov, in Russia. He has got a younger sister and an older brother. The children have got a cat. Tim likes playing football. He wants to be a professional football player in the future. He is a good pupil. His favourite subject is Maths. He likes juice but he doesn’t like milk.',
        fields: [
          { label: 'Name', a: ['Tim'] },
          { label: 'Age', a: ['nine'], number: true },
          { label: 'Country', a: ['Russia'] },
          { label: 'Number of children in the family', a: ['three'], number: true },
          { label: 'Pet', a: ['cat'] },
          { label: 'Favourite subject', a: ['Maths', 'Math'] },
          { label: 'Favourite drink', a: ['juice'] },
          { label: 'Favourite sport', a: ['football'] },
        ],
      },
    ],
  },
});

MQ.addUnit('vpr', {
  id: 'v1', order: 1, icon: '📝', title: 'Вариант 1',
  subtitle: 'Kate’s birthday · Lily’s kitten · London Zoo · Anna',
  vpr: {
    minutes: 45,
    tasks: [
      {
        type: 'listen',
        instruction: 'Ты услышишь диалог. Для каждого предложения А–Е выбери один правильный вариант ответа из трёх предложенных (1, 2 или 3). Ты услышишь текст дважды.',
        dialog: [
          ['Dad', 'Kate, what are you going to do on Saturday?'],
          ['Kate', 'It’s my birthday! I’m going to have a party at home.'],
          ['Dad', 'How many friends are you going to invite?'],
          ['Kate', 'Six friends from my class. We are going to play games and dance.'],
          ['Dad', 'What would you like for your birthday?'],
          ['Kate', 'I’d like a new bike. My old bike is too small for me.'],
          ['Dad', 'What food do you want at the party?'],
          ['Kate', 'Pizza and a big chocolate cake! But no fish, please. I don’t like fish.'],
          ['Dad', 'OK. Mum will make the cake and I’ll buy the pizza.'],
        ],
        questions: [
          { q: 'What is Kate going to do on Saturday?', options: ['go to school', 'have a party', 'visit her grandma'], a: 2 },
          { q: 'How many friends is Kate going to invite?', options: ['six', 'seven', 'ten'], a: 1 },
          { q: 'What would Kate like for her birthday?', options: ['a doll', 'a computer game', 'a new bike'], a: 3 },
          { q: 'What food doesn’t Kate want at the party?', options: ['pizza', 'fish', 'cake'], a: 2 },
          { q: 'Who will make the cake?', options: ['Dad.', 'Kate.', 'Mum.'], a: 3 },
        ],
      },
      {
        type: 'read',
        instruction: 'Прочитай текст. Для каждого предложения А–Е выбери один правильный вариант ответа из трёх предложенных (1, 2 или 3).',
        heading: 'Lily and the kitten',
        text: 'Lily lives in a small town with her parents and her grandmother. Last Sunday the weather was cold and windy. Lily and her grandmother went to the shop to buy some bread. On the way home Lily heard a quiet sound under a bench. It was a little grey kitten! The kitten was wet and hungry.\nLily wanted to take it home but she was worried because her dad didn’t like cats. Grandma said, “Let’s ask him.” At home Lily gave the kitten some warm milk. When Dad saw the kitten, he smiled and said, “OK, it can stay with us.” Lily called the kitten Smoky because it was grey.',
        questions: [
          { q: 'Who did Lily go to the shop with?', options: ['her mum', 'her dad', 'her grandmother'], a: 3 },
          { q: 'What was the weather like last Sunday?', options: ['cold and windy', 'warm and sunny', 'hot and rainy'], a: 1 },
          { q: 'Where did Lily find the kitten?', options: ['in the shop', 'under a bench', 'in the park'], a: 2 },
          { q: 'Why was Lily worried? Because …', options: ['her dad didn’t like cats.', 'the kitten was very big.', 'she had no milk.'], a: 1 },
          { q: 'Choose the true sentence.', options: ['The kitten was black.', 'Dad said the kitten could stay.', 'Lily called the kitten Snowy.'], a: 2 },
        ],
      },
      {
        type: 'grammar',
        instruction: 'Прочитай рассказ. Вставь вместо каждого пропуска, обозначенного буквами А–Е, нужную грамматическую форму, выбрав её из трёх предложенных вариантов (1, 2 или 3).',
        heading: 'London Zoo',
        text: 'Last summer my family and I {A} London. On Saturday we went to London Zoo. It is one of the {B} zoos in the world. There were a lot of people but there were {C} queues at the entrance, so we went in quickly. We saw lions, giraffes and penguins. My little brother wanted {D} the monkeys first. They were very funny! In the evening we were tired but happy. My parents said, “We {E} come here again next year!”',
        gaps: [
          { options: ['visit', 'visited', 'visiting'], a: 2 },
          { options: ['old', 'older', 'oldest'], a: 3 },
          { options: ['no', 'any', 'some'], a: 1 },
          { options: ['see', 'to see', 'seeing'], a: 2 },
          { options: ['will', 'are', 'did'], a: 1 },
        ],
      },
      {
        type: 'form',
        instruction: 'Помоги своему другу заполнить анкету для сайта «Друзья онлайн». Прочитай текст и запиши информацию в таблицу. Под каждым номером запиши только одно слово (без артиклей). Числа необходимо записать словами.',
        heading: 'Anna Smirnova',
        text: 'Anna is from Russia. She is 10 years old. Anna lives in Kazan with her mum, her dad and her two brothers. The family has got a dog. Anna likes swimming and she goes to the swimming pool on Monday and Friday. Her favourite subject is English. She likes milk but she doesn’t like tea.',
        fields: [
          { label: 'Name', a: ['Anna'] },
          { label: 'Age', a: ['ten'], number: true },
          { label: 'City', a: ['Kazan'] },
          { label: 'Number of children in the family', a: ['three'], number: true },
          { label: 'Pet', a: ['dog'] },
          { label: 'Favourite sport', a: ['swimming'] },
          { label: 'Favourite subject', a: ['English'] },
          { label: 'Favourite drink', a: ['milk'] },
        ],
      },
    ],
  },
});

MQ.addUnit('vpr', {
  id: 'v2', order: 2, icon: '📝', title: 'Вариант 2',
  subtitle: 'School trip · Sam’s best day · Grandma · Oliver',
  vpr: {
    minutes: 45,
    tasks: [
      {
        type: 'listen',
        instruction: 'Ты услышишь диалог. Для каждого предложения А–Е выбери один правильный вариант ответа из трёх предложенных (1, 2 или 3). Ты услышишь текст дважды.',
        dialog: [
          ['Teacher', 'Max, are you ready for our school trip tomorrow?'],
          ['Max', 'Yes, Miss Brown! Where are we going?'],
          ['Teacher', 'We are going to visit the science museum. We will go there by bus.'],
          ['Max', 'Great! What time must we come to school?'],
          ['Teacher', 'You must be at school at eight o’clock.'],
          ['Max', 'Do we have to bring lunch?'],
          ['Teacher', 'No, you don’t. We will have lunch in the museum café. But you have to bring a notebook and a pen.'],
          ['Max', 'Can I take my camera?'],
          ['Teacher', 'Yes, of course. You can take photos of the robots.'],
        ],
        questions: [
          { q: 'Where is the class going?', options: ['to the zoo', 'to the science museum', 'to the park'], a: 2 },
          { q: 'How will they get there?', options: ['by bus', 'by train', 'on foot'], a: 1 },
          { q: 'What time must Max be at school?', options: ['at seven o’clock', 'at eight o’clock', 'at nine o’clock'], a: 2 },
          { q: 'What does Max have to bring? He has to bring …', options: ['his lunch.', 'his camera.', 'a notebook and a pen.'], a: 3 },
          { q: 'What can Max take photos of?', options: ['the robots', 'the teacher', 'the bus'], a: 1 },
        ],
      },
      {
        type: 'read',
        instruction: 'Прочитай текст. Для каждого предложения А–Е выбери один правильный вариант ответа из трёх предложенных (1, 2 или 3).',
        heading: 'The best day',
        text: 'Sam is nine. He lives in a village near the sea. Last summer his uncle Bob came to visit him. Uncle Bob is a pilot and he has got a small boat. One morning they went fishing. The sea was calm and the sky was blue. Sam caught three fish and Uncle Bob caught only one!\nIn the afternoon they swam and played on the beach. Sam found a beautiful shell. He gave it to his mum. In the evening they cooked the fish and had dinner in the garden. Sam says it was the best day of the summer.',
        questions: [
          { q: 'Where does Sam live?', options: ['in a big city', 'in a village near the sea', 'in the mountains'], a: 2 },
          { q: 'What is Uncle Bob’s job?', options: ['He is a pilot.', 'He is a teacher.', 'He is a fisherman.'], a: 1 },
          { q: 'How many fish did Sam catch?', options: ['one', 'two', 'three'], a: 3 },
          { q: 'What did Sam give to his mum?', options: ['a fish', 'a shell', 'a photo'], a: 2 },
          { q: 'Choose the true sentence.', options: ['The sea was very windy.', 'Uncle Bob caught more fish than Sam.', 'They had dinner in the garden.'], a: 3 },
        ],
      },
      {
        type: 'grammar',
        instruction: 'Прочитай рассказ. Вставь вместо каждого пропуска, обозначенного буквами А–Е, нужную грамматическую форму, выбрав её из трёх предложенных вариантов (1, 2 или 3).',
        heading: 'My grandma',
        text: 'My grandma lives in a little house in the country. She {A} a big garden with apple trees. Every summer I stay with her for two weeks. Grandma makes the {B} apple pie in the world! She often tells me interesting stories about {C} childhood. Look! Now she {D} a warm scarf for me. I {E} visit her again in August.',
        gaps: [
          { options: ['have got', 'has got', 'having'], a: 2 },
          { options: ['good', 'better', 'best'], a: 3 },
          { options: ['her', 'she', 'hers'], a: 1 },
          { options: ['knits', 'is knitting', 'knit'], a: 2 },
          { options: ['am going to', 'going to', 'go to'], a: 1 },
        ],
      },
      {
        type: 'form',
        instruction: 'Помоги своему другу заполнить анкету для сайта «Друзья онлайн». Прочитай текст и запиши информацию в таблицу. Под каждым номером запиши только одно слово (без артиклей). Числа необходимо записать словами.',
        heading: 'Oliver Brown',
        text: 'Oliver is from England. He is 11 years old. He lives in Bristol with his mum and his younger sister Emma. They have got a parrot. Oliver likes playing tennis. He plays it every Saturday with his friends. His favourite subject is Science. He likes tea but he doesn’t like coffee.',
        fields: [
          { label: 'Name', a: ['Oliver'] },
          { label: 'Age', a: ['eleven'], number: true },
          { label: 'Country', a: ['England'] },
          { label: 'City', a: ['Bristol'] },
          { label: 'Number of children in the family', a: ['two'], number: true },
          { label: 'Pet', a: ['parrot'] },
          { label: 'Favourite sport', a: ['tennis'] },
          { label: 'Favourite subject', a: ['Science'] },
        ],
      },
    ],
  },
});
