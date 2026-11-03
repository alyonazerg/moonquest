// Moonquest core: content registry, helpers, speech.
window.MQ = (function () {
  const courses = {
    as2: { id: 'as2', title: 'Academy Stars 2', icon: '🚀', units: [] },
    as4: { id: 'as4', title: 'Academy Stars 4', icon: '🛸', units: [] },
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

  return { courses, addUnit, load, save, h, shuffle, sample, norm, starsFor, uid, toast, speak, stopSpeech };
})();
