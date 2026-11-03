// Moonquest core: content registry, storage, helpers, speech.
window.MQ = (function () {
  const courses = {
    as2: { id: 'as2', title: 'Academy Stars 2', who: 'Младшая ученица · 4 класс', icon: '🚀', units: [] },
    as4: { id: 'as4', title: 'Academy Stars 4', who: 'Старшая ученица', icon: '🛸', units: [] },
  };

  // Called from data/*.js files
  function addUnit(courseId, unit) {
    courses[courseId].units.push(unit);
    courses[courseId].units.sort((a, b) => (a.order || 0) - (b.order || 0));
  }

  // ---------- storage (safe) ----------
  function load(key, fallback) {
    try { const v = localStorage.getItem('mq_' + key); return v ? JSON.parse(v) : fallback; }
    catch (e) { return fallback; }
  }
  function save(key, value) {
    try { localStorage.setItem('mq_' + key, JSON.stringify(value)); } catch (e) { /* ignore */ }
  }

  const progress = load('progress', {});
  function getStars(c, u, g) { return ((progress[c] || {})[u] || {})[g] || 0; }
  function setStars(c, u, g, stars) {
    progress[c] = progress[c] || {};
    progress[c][u] = progress[c][u] || {};
    progress[c][u][g] = Math.max(stars, progress[c][u][g] || 0);
    save('progress', progress);
  }

  // ---------- helpers ----------
  function h(tag, attrs, ...children) {
    const el = document.createElement(tag);
    for (const [k, v] of Object.entries(attrs || {})) {
      if (v == null || v === false) continue;
      if (k === 'class') el.className = v;
      else if (k.startsWith('on')) el.addEventListener(k.slice(2), v);
      else el.setAttribute(k, v === true ? '' : v);
    }
    for (const c of children.flat()) {
      if (c == null || c === false) continue;
      el.append(c instanceof Node ? c : document.createTextNode(String(c)));
    }
    return el;
  }
  function shuffle(arr) {
    const a = arr.slice();
    for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; }
    return a;
  }
  function sample(arr, n) { return shuffle(arr).slice(0, n); }
  function norm(s) { return String(s).toLowerCase().replace(/[’']/g, "'").replace(/\s+/g, ' ').replace(/[.?!,]/g, '').trim(); }
  function starsFor(correct, total) {
    const r = total ? correct / total : 0;
    return r >= 0.9 ? 3 : r >= 0.7 ? 2 : 1;
  }

  // ---------- speech ----------
  // 1) pre-generated audio from audio/manifest.js (window.MQ_AUDIO = { "text": "audio/file.mp3" })
  // 2) fallback: browser speech synthesis (British voice if available)
  let voice = null;
  function pickVoice() {
    if (!('speechSynthesis' in window)) return;
    const vs = speechSynthesis.getVoices();
    voice = vs.find(v => v.lang === 'en-GB') || vs.find(v => v.lang && v.lang.startsWith('en')) || null;
  }
  if ('speechSynthesis' in window) { pickVoice(); speechSynthesis.onvoiceschanged = pickVoice; }

  function speak(text) {
    const file = (window.MQ_AUDIO || {})[text];
    if (file) { new Audio(file).play().catch(() => tts(text)); return; }
    tts(text);
  }
  function tts(text) {
    if (!('speechSynthesis' in window)) return;
    speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(text);
    u.lang = 'en-GB'; u.rate = 0.85;
    if (voice) u.voice = voice;
    speechSynthesis.speak(u);
  }

  // ---------- zoom lesson mode ----------
  const settings = load('settings', { zoom: false, players: ['Student', 'Teacher'] });
  function saveSettings() { save('settings', settings); }

  return { courses, addUnit, load, save, getStars, setStars, h, shuffle, sample, norm, starsFor, speak, settings, saveSettings };
})();
