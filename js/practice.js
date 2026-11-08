// Two research-based grammar games:
//  - Find the mistake: a sentence with one wrong word; tap it, then choose the right form (error correction + explanation)
//  - Dictation: listen to a sentence from the unit and write it (productive recall, spelling, word order)
(function () {
  const { h, shuffle, sample, norm, speak, games } = MQ;
  const { runRounds, sayBtn } = MQ.gameKit;

  // grammar items that can hold a mistake: a gap "___" and at least one wrong option
  const fixItems = (u) => MQ.grammarItems(u || {}).filter(it => it.q && it.q.includes('___') && (it.options || []).some(o => o !== it.a) && !/^\(/.test(it.a));

  games.fixit = {
    title: 'Find the mistake', icon: '🕵️', desc: 'One word is wrong. Tap it, then choose the right one.',
    available: u => fixItems(u).length >= 4,
    items: u => sample(fixItems(u), Math.min(10, fixItems(u).length)),
    run(ctx, items) {
      runRounds(ctx, items, (it, body, answer) => {
        const wrong = shuffle(it.options.filter(o => o !== it.a))[0];
        const [pre, ...rest] = it.q.split('___');
        const post = rest.join('___');
        const words = (s) => s.split(/\s+/).filter(Boolean);
        // tokens: the wrong word(s) stay one token, so a two-word answer ("to ride") is one tap
        const tokens = [...words(pre).map(t => ({ t })), { t: wrong, bad: true }, ...words(post).map(t => ({ t }))];
        const line = h('div', { class: 'fx-line' });
        const step2 = h('div');
        const msg = h('div', { class: 'hint' });
        let tries = 0, done = false;
        tokens.forEach(tok => {
          const b = h('button', { class: 'fx-word', onclick: () => {
            if (done || step2.childNodes.length) return;
            if (tok.bad) {
              b.classList.add('found');
              msg.textContent = 'Yes! This word is wrong. What is right?';
              const opts = shuffle([it.a, ...it.options.filter(o => o !== it.a && o !== wrong)].slice(0, 3));
              step2.append(h('div', { class: 'options' }, opts.map(o => h('button', { onclick: (e) => {
                if (done) return; done = true;
                const ok = o === it.a;
                e.currentTarget.classList.add(ok ? 'right' : 'wrong');
                b.textContent = it.a; b.classList.add('fixed');
                speak(it.q.replace('___', it.a));
                answer(ok && tries === 0, `💡 ${it.hint || it.rule}  →  ${it.q.replace('___', it.a)}`);
              } }, o))));
            } else {
              tries++;
              b.classList.add('nope'); setTimeout(() => b.classList.remove('nope'), 500);
              msg.textContent = tries === 1 ? 'This word is OK. Look again!' : `Look at the words near “${tokens[tokens.findIndex(x => x.bad) - 1] ? tokens[tokens.findIndex(x => x.bad) - 1].t : tokens[tokens.findIndex(x => x.bad) + 1].t}”.`;
            }
          } }, tok.t);
          line.append(b);
        });
        body.append(h('div', { class: 'hint' }, '📘 ' + it.topic), MQ.pic(it), h('div', { class: 'prompt' }, 'Find the mistake'), line, msg, step2);
        return { answerText: it.q.replace('___', it.a), why: it.hint || it.rule };
      });
    },
  };

  // ---------- dictation ----------
  const clean = (s) => norm(String(s).replace(/[“”"«»]/g, '')).replace(/[^a-z0-9' ]/g, ' ').replace(/\s+/g, ' ').trim();
  games.dictation = {
    title: 'Dictation', icon: '🎧', desc: 'Listen and write the sentence.',
    available: u => (u.sentences || []).length >= 3,
    items: u => sample(u.sentences, Math.min(6, u.sentences.length)),
    run(ctx, items) {
      runRounds(ctx, items, (s, body, answer) => {
        const target = s.en;
        const field = h('textarea', { class: 'field dict-field', rows: 2, placeholder: 'Write what you hear…', autocomplete: 'off', autocapitalize: 'off', spellcheck: 'false' });
        const diff = h('div', { class: 'dict-diff' });
        let plays = 0;
        const play = () => { plays++; speak(target); };
        const check = () => {
          if (!field.value.trim() || field.disabled) return;
          field.disabled = true;
          const want = clean(target).split(' '), got = clean(field.value).split(' ');
          // word by word: green = right, red = wrong or missing
          diff.innerHTML = '';
          let right = 0;
          want.forEach((w, i) => {
            const ok = got[i] === w;
            if (ok) right++;
            diff.append(h('span', { class: ok ? 'ok' : 'no' }, w), ' ');
          });
          const ok = right === want.length && got.length === want.length;
          answer(ok, ok ? '' : `✍️ ${target}  (${right} / ${want.length} words right)`, !ok && right >= want.length - 1);
        };
        field.addEventListener('keydown', (e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); check(); } });
        body.append(
          MQ.pic(s),
          h('div', { class: 'row' }, h('button', { class: 'primary', onclick: play }, '🔊 Listen'), h('span', { class: 'hint' }, 'You can listen again')),
          field, diff,
          h('div', { class: 'row' }, h('button', { onclick: check }, '✔ Check')),
        );
        setTimeout(play, 400);
        return { answerText: target };
      });
    },
  };
})();
