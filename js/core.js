// Moonquest core: content registry, helpers, speech.
window.MQ = (function () {
  const courses = {
    as2: { id: 'as2', title: 'Academy Stars 2', icon: '🚀', units: [] },
    as4: { id: 'as4', title: 'Academy Stars 4', icon: '🛸', units: [] },
    irr: { id: 'irr', title: 'Irregular verbs', icon: '🔁', units: [], folder: true },
    magic: { id: 'magic', title: 'Magic school', icon: '🪄', units: [], folder: true },
  };
  Object.values(courses).forEach(c => { c.href = `#/c/${c.id}`; });

  // Called from data/*.js files
  function addUnit(courseId, unit) {
    courses[courseId].units.push(unit);
    courses[courseId].units.sort((a, b) => (a.order || 0) - (b.order || 0));
  }

  // ---------- local storage (safe) ----------
  function load(key, fallback) {
    try { const v = localStorage.getItem('mq_' + key); return v ? JSON.parse(v) : fallback; }
    catch (e) { return fallback; }
  }
  function save(key, value) {
    try { localStorage.setItem('mq_' + key, JSON.stringify(value)); } catch (e) { /* ignore */ }
  }

  // ---------- DOM helpers ----------
  // Let el.append(...) skip null/false so screens can write `cond ? node : null`.
  const nativeAppend = Element.prototype.append;
  Element.prototype.append = function (...kids) {
    return nativeAppend.apply(this, kids.flat().filter(k => k != null && k !== false));
  };
  function h(tag, attrs, ...children) {
    const el = document.createElement(tag);
    for (const [k, v] of Object.entries(attrs || {})) {
      if (v == null || v === false) continue;
      if (k === 'class') el.className = v;
      else if (k.startsWith('on')) el.addEventListener(k.slice(2), v);
      else if (k === 'value') el.value = v;
      else el.setAttribute(k, v === true ? '' : v);
    }
    el.append(...children);
    return el;
  }
  function shuffle(arr) {
    const a = arr.slice();
    for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; }
    return a;
  }
  const sample = (arr, n) => shuffle(arr).slice(0, n);
  const norm = (s) => String(s).toLowerCase().replace(/[’']/g, "'").replace(/\s+/g, ' ').replace(/[.?!,]/g, '').trim();
  function starsFor(correct, total) {
    const r = total ? correct / total : 0;
    return r >= 0.9 ? 3 : r >= 0.7 ? 2 : 1;
  }
  const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
  const toast = (text) => {
    const t = h('div', { class: 'toast' }, text);
    document.body.append(t);
    setTimeout(() => t.remove(), 3500);
  };

  // ---------- speech ----------
  // 1) recorded audio (Mistral, saved in the database)  2) Mistral on the fly (teacher device with a key)  3) browser voice
  let voice = null;
  function pickVoice() {
    if (!('speechSynthesis' in window)) return;
    const vs = speechSynthesis.getVoices();
    voice = vs.find(v => v.lang === 'en-GB') || vs.find(v => v.lang && v.lang.startsWith('en')) || null;
  }
  if ('speechSynthesis' in window) { pickVoice(); speechSynthesis.onvoiceschanged = pickVoice; }

  let current = null;
  const memAudio = {};
  async function speak(text) {
    if (!text) return;
    stopSpeech();
    try {
      let url = MQ.store && MQ.store.audioUrl(text);
      if (!url && MQ.ai && MQ.ai.hasKey()) {
        if (!memAudio[text]) memAudio[text] = URL.createObjectURL(await MQ.ai.tts(text));
        url = memAudio[text];
      }
      if (url) { current = new Audio(url); await current.play(); return; }
    } catch (e) { console.warn('audio fallback', e); }
    tts(text);
  }
  function tts(text) {
    if (!('speechSynthesis' in window)) return;
    const u = new SpeechSynthesisUtterance(text);
    u.lang = 'en-GB'; u.rate = 0.85;
    if (voice) u.voice = voice;
    speechSynthesis.speak(u);
  }
  function stopSpeech() {
    if (current) { current.pause(); current = null; }
    if ('speechSynthesis' in window) speechSynthesis.cancel();
  }

  // Card picture: generated image if there is one, otherwise the emoji
  function pic(it, cls = 'emoji') {
    if (it.img) return h('img', { class: 'pic-img ' + cls, src: it.img, alt: it.en || '' });
    return it.pic ? h('div', { class: cls }, it.pic) : null;
  }

  // [{ key: 'as2/u2', label: 'Academy Stars 2 · Unit 2 · My busy week', c, u }]
  function unitOptions() {
    return Object.values(courses).flatMap(c => c.units.map(u => ({ key: `${c.id}/${u.id}`, label: `${c.title} · ${u.title}`, c, u })));
  }
  function findUnit(key) { return unitOptions().find(o => o.key === key) || null; }

  // ---------- sound effects (made in the browser, no files) ----------
  let actx = null;
  let sfxOn = load('sfx', true);
  function tone(notes, { type = 'triangle', len = 0.13, gap = 0.08, vol = 0.16 } = {}) {
    if (!sfxOn) return;
    try {
      actx = actx || new (window.AudioContext || window.webkitAudioContext)();
      if (actx.state === 'suspended') actx.resume();
      const t0 = actx.currentTime + 0.01;
      notes.forEach((f, i) => {
        const o = actx.createOscillator(), g = actx.createGain();
        o.type = type; o.frequency.value = f;
        const t = t0 + i * gap;
        g.gain.setValueAtTime(0.0001, t);
        g.gain.exponentialRampToValueAtTime(vol, t + 0.015);
        g.gain.exponentialRampToValueAtTime(0.0001, t + len);
        o.connect(g); g.connect(actx.destination);
        o.start(t); o.stop(t + len + 0.02);
      });
    } catch (e) { /* no audio */ }
  }
  const sfx = {
    good: () => tone([784, 1175], { len: 0.16, gap: 0.08 }),                  // bright "ding-ding"
    bad: () => tone([196, 147], { type: 'sawtooth', len: 0.2, gap: 0.12, vol: 0.07 }), // low "bonk"
    pop: () => tone([988], { len: 0.07, vol: 0.1 }),
    win: () => tone([523, 659, 784, 1047, 1319], { len: 0.22, gap: 0.09, vol: 0.13 }),
    flip: () => tone([440, 660], { type: 'sine', len: 0.09, gap: 0.05, vol: 0.06 }),
    get on() { return sfxOn; },
    toggle() { sfxOn = !sfxOn; save('sfx', sfxOn); if (sfxOn) sfx.good(); return sfxOn; },
  };

  // ---------- pronunciation of verb forms ----------
  // Forms spelled like the base form but pronounced differently (read – read [red] – read [red]).
  const PRON = { read: 'red' };
  function formSay(v, f) {
    const w = String(v[f] || '');
    if (f !== 'base' && w === v.base && PRON[w]) return PRON[w];
    return w.replace(/\//g, ' or ');
  }
  const verbSay = (v) => `${v.base}, ${formSay(v, 'v2')}, ${formSay(v, 'v3')}`;

  // ---------- themes: 'space' (default) or 'magic', remembered per student on this device ----------
  function theme(studentId) { return load('theme_' + (studentId || 'guest'), 'space'); }
  function applyTheme(studentId) {
    const t = theme(studentId);
    document.body.classList.toggle('theme-magic', t === 'magic');
    window.dispatchEvent(new CustomEvent('mq-theme', { detail: t }));
  }
  function setTheme(studentId, t) { save('theme_' + (studentId || 'guest'), t); applyTheme(studentId); }

  return { theme, applyTheme, setTheme, sfx, formSay, verbSay, unitOptions, findUnit, pic, courses, addUnit, load, save, h, shuffle, sample, norm, starsFor, uid, toast, speak, stopSpeech };
})();
