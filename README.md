# 🌙 Moonquest

Интерактивные игры по английскому для учениц (Academy Stars 2 и 4, подготовка к ВПР).
Сайт: https://alyonazerg.github.io/moonquest/

## Для ученицы
Открыть сайт → выбрать своё имя → **My tasks** (наборы от учителя) и **My planets** (юниты учебника).
Прогресс сохраняется по имени.

## Для учителя (👩‍🏫 вверху справа)
- **Ученицы**: добавить, выбрать учебник, назначить наборы, смотреть прогресс (звёзды, дата, ошибки).
- **Наборы карточек**: фото/текст → ✨ Распознать с ИИ (Mistral) → таблица англ / рус / картинка → назначить ученице.
- **Настройки**: ключ Mistral (хранится только в вашем браузере), проверка голоса, озвучка юнитов.

Без базы данных всё работает в одном браузере. Чтобы ученицы занимались со своих устройств — подключите Supabase по инструкции [SETUP.md](SETUP.md).

## Игры
Карточки в стиле Anki (Flashcards / Verb flashcards): карточка переворачивается, ученица оценивает себя
Again / Hard / Good / Easy, и каждая карточка возвращается тогда, когда её пора повторить.
Слова: Listen and choose, Find pairs, Spell the word, 🚀 Word Runner.
Грамматика: Choose the right word (по всем темам или по одной — ▶ Practise), Make a sentence.
Неправильные глаголы: Choose the form, Write the forms, Spell the form, Verb pairs, 🚀 Verb Runner (аркада: ракета влетает в правильную форму).

## 🔁 Irregular verbs galaxy
Готовые группы неправильных глаголов по созвучию и паттерну: cut–cut–cut, buy–bought, sing–sang–sung,
know–knew–known, sleep–slept, send–sent, make–made–made, write–wrote–written, speak–spoke–spoken,
eat–ate–eaten и особые (be, go, do, come). Файл `data/irregular-verbs.js`.

## Как добавить юнит учебника
Скопировать `data/as2-unit2.js`, заменить содержимое и подключить в `index.html`.

## Обновления
После изменения файлов увеличьте номер `?v=…` в `index.html`, чтобы браузеры сразу подхватили новую версию.
