// Data layer. Two backends with the same async API:
//  - local: everything in this browser (works without any setup)
//  - cloud: Supabase (students, sets, assignments, progress and recorded audio shared between devices)
(function () {
  const { load, save, uid } = MQ;
  const cfg = window.MQ_CONFIG || {};
  const cloudReady = !!(cfg.supabaseUrl && cfg.supabaseKey && window.supabase);

  // ---------------- local backend ----------------
  const local = {
    mode: 'local',
    async init() {
      // migrate the old "My lists" format once
      const old = load('lists', null);
      if (old && !load('sets', null)) {
        save('sets', old.map(l => ({ id: l.id, title: l.title, kind: l.kind, items: MQ.sets.parse(l.kind, l.text).items, created_at: new Date().toISOString() })));
      }
    },
    isTeacher: () => true,
    async signIn() { return true; },
    async signOut() {},
    async students() { return load('students', []); },
    async checkPin(id, pin) { const s = load('students', []).find(x => x.id === id); return !!s && (!s.pin || s.pin === String(pin).trim()); },
    async loginByPin(pin) {
      const p = String(pin).trim(), all = load('students', []).filter(x => p && x.pin === p);
      if (all.length > 1) throw new Error('Two students have the same code. Ask your teacher.');
      return all[0] || null;
    },
    async meInfo(id) { return load('students', []).find(x => x.id === id) || null; },
    async saveStudent(s) {
      const all = load('students', []);
      if (!s.id) s.id = uid();
      const k = all.findIndex(x => x.id === s.id);
      if (k >= 0) all[k] = Object.assign(all[k], s); else all.push(s);
      save('students', all);
      return s;
    },
    async deleteStudent(id) { save('students', load('students', []).filter(s => s.id !== id)); },
    async sets() { return load('sets', []); },
    async getSet(id) { return load('sets', []).find(s => s.id === id) || null; },
    async saveSet(set) {
      const all = load('sets', []);
      if (!set.id) { set.id = uid(); set.created_at = new Date().toISOString(); }
      const k = all.findIndex(x => x.id === set.id);
      if (k >= 0) all[k] = set; else all.unshift(set);
      save('sets', all);
      return set;
    },
    async deleteSet(id) {
      save('sets', load('sets', []).filter(s => s.id !== id));
      save('assign', load('assign', []).filter(a => a.set_id !== id));
    },
    async assignments() { return load('assign', []); },
    async assign(studentId, setId, on) {
      let all = load('assign', []).filter(a => !(a.student_id === studentId && a.set_id === setId));
      if (on) all.push({ student_id: studentId, set_id: setId });
      save('assign', all);
    },
    async progress(studentId) { return load('progress_' + studentId, []); },
    async saveProgress(studentId, rec) {
      const all = load('progress_' + studentId, []).filter(p => p.key !== rec.key);
      all.push(rec);
      save('progress_' + studentId, all);
    },
    audioUrl: () => null,
    // Pictures are kept inside the set as small data URLs
    saveImage: (blob) => new Promise((ok, fail) => { const r = new FileReader(); r.onload = () => ok(r.result); r.onerror = () => fail(r.error); r.readAsDataURL(blob); }),
    async saveAudio() { throw new Error('Озвучка сохраняется только при подключённой базе (Supabase).'); },
  };

  // ---------------- cloud backend (Supabase) ----------------
  let db = null, session = null;
  const audioMap = {};
  const must = ({ data, error }) => { if (error) throw new Error(error.message); return data; };
  // until supabase/004_security.sql is run the safe functions do not exist yet: then use the old way
  const noFunction = ({ error }) => !!error && /could not find the function|schema cache|does not exist/i.test(error.message || '');
  // Short stable file name for a text (FNV-1a, two seeds)
  function sha(text) {
    const fnv = (seed) => { let x = seed >>> 0; for (const ch of text) { x ^= ch.codePointAt(0); x = Math.imul(x, 16777619) >>> 0; } return x.toString(16).padStart(8, '0'); };
    return fnv(2166136261) + fnv(84696351);
  }
  const cloud = {
    mode: 'cloud',
    async init() {
      // every request gets 12 seconds; after that the page shows "no connection" instead of hanging
      const timedFetch = (url, opts = {}) => {
        const ctrl = new AbortController();
        const t = setTimeout(() => ctrl.abort(), 12000);
        if (opts.signal) opts.signal.addEventListener('abort', () => ctrl.abort());
        return fetch(url, Object.assign({}, opts, { signal: ctrl.signal }))
          .catch(e => { throw new Error('No connection to the server. Check the internet and try again.'); })
          .finally(() => clearTimeout(t));
      };
      db = window.supabase.createClient(cfg.supabaseUrl, cfg.supabaseKey, { global: { fetch: timedFetch } });
      session = (await db.auth.getSession()).data.session;
      db.auth.onAuthStateChange((_e, s) => { session = s; });
      // the list of recorded voice loads in the background (it must not delay the first screen)
      db.from('audio').select('text,path').then(({ data, error }) => {
        if (error) return console.warn('audio list', error.message);
        (data || []).forEach(r => { audioMap[r.text] = db.storage.from('audio').getPublicUrl(r.path).data.publicUrl; });
      }, e => console.warn('audio list', e));
    },
    isTeacher: () => !!session,
    async signIn(email, password) { must(await db.auth.signInWithPassword({ email, password })); return true; },
    async signOut() { await db.auth.signOut(); },
    // Only the teacher sees the list of students. A student logs in with her code only.
    async students() { return session ? must(await db.from('students').select('*').order('name')) : []; },
    async checkPin(id, pin) { return !!must(await db.rpc('student_login', { sid: id, p: String(pin).trim() })); },
    async loginByPin(pin) {
      const r = await db.rpc('login_by_pin', { p: String(pin).trim() });
      if (noFunction(r)) throw new Error('Учителю: выполните supabase/005_pin_login.sql в Supabase (см. SETUP.md).');
      return must(r) || null;
    },
    async meInfo(id) {
      const r = await db.rpc('student_info', { sid: id, p: pinOf(id) });
      return noFunction(r) ? null : must(r);
    },
    async saveStudent(s) {
      const row = { name: s.name, course: s.course || null };
      if (s.pin !== undefined) row.pin = s.pin;
      if (s.current_unit !== undefined) row.current_unit = s.current_unit || null;
      if (s.id) return must(await db.from('students').update(row).eq('id', s.id).select().single());
      return must(await db.from('students').insert(row).select().single());
    },
    async deleteStudent(id) { must(await db.from('students').delete().eq('id', id)); },
    async sets() { return must(await db.from('sets').select('*').order('created_at', { ascending: false })); },
    async getSet(id) { return must(await db.from('sets').select('*').eq('id', id).maybeSingle()); },
    async saveSet(set) {
      const row = { title: set.title, kind: set.kind, items: set.items, unit_key: set.unit_key || null };
      // a student (not signed in) saves her own words through a function that checks her code
      if (!session && set.student_id) {
        const r = await db.rpc('save_student_set', { sid: set.student_id, p: pinOf(set.student_id), s: Object.assign({ id: set.id || null }, row) });
        if (!noFunction(r)) return must(r);
      }
      if (set.student_id) row.student_id = set.student_id;
      if (set.id) return must(await db.from('sets').update(row).eq('id', set.id).select().single());
      return must(await db.from('sets').insert(row).select().single());
    },
    async deleteSet(id) { must(await db.from('sets').delete().eq('id', id)); },
    async assignments() { return must(await db.from('assignments').select('student_id,set_id')); },
    async assign(studentId, setId, on) {
      if (on) must(await db.from('assignments').upsert({ student_id: studentId, set_id: setId }));
      else must(await db.from('assignments').delete().eq('student_id', studentId).eq('set_id', setId));
    },
    async progress(studentId) {
      if (!session) { const r = await db.rpc('get_progress', { sid: studentId, p: pinOf(studentId) }); if (!noFunction(r)) return must(r); }
      return must(await db.from('progress').select('*').eq('student_id', studentId));
    },
    async saveProgress(studentId, rec) {
      if (!session) { const r = await db.rpc('save_progress', { sid: studentId, p: pinOf(studentId), rec }); if (!noFunction(r)) return must(r); }
      must(await db.from('progress').upsert(Object.assign({ student_id: studentId }, rec), { onConflict: 'student_id,key' }));
    },
    audioUrl: (text) => audioMap[text] || null,
    async saveImage(blob) {
      const path = 'img/' + uid() + '.webp';
      must(await db.storage.from('audio').upload(path, blob, { contentType: 'image/webp' }));
      return db.storage.from('audio').getPublicUrl(path).data.publicUrl;
    },
    async saveAudio(text, blob) {
      const ext = blob.type.includes('wav') ? 'wav' : blob.type.includes('ogg') ? 'ogg' : 'mp3';
      const path = sha(text) + '.' + ext;
      must(await db.storage.from('audio').upload(path, blob, { upsert: true, contentType: blob.type || 'audio/mpeg' }));
      must(await db.from('audio').upsert({ text, path }));
      audioMap[text] = db.storage.from('audio').getPublicUrl(path).data.publicUrl;
    },
  };

  const store = cloudReady ? cloud : local;
  // a new code that no other student has
  store.newPin = (taken = []) => {
    const used = new Set(taken.map(s => (s && s.pin) || s).filter(Boolean));
    let p;
    do p = String(Math.floor(1000 + Math.random() * 9000)); while (used.has(p));
    return p;
  };

  // AI cards for students (no key in the browser): Supabase Edge Function "cards-ai" holds the key.
  store.aiCards = async function ({ text, images, mode }) {
    if (store.mode !== 'cloud') throw new Error('AI for students works after the database is connected.');
    // the function lets in the signed-in teacher or a student with her code
    const who = store.me ? { sid: store.me.id, pin: store.me.pin } : {};
    const { data, error } = await db.functions.invoke('cards-ai', { body: Object.assign({ text, images, mode }, who) });
    if (error) {
      let msg = error.message;
      try { msg = (await error.context.json()).error || msg; } catch (e) { /* keep message */ }
      throw new Error(msg);
    }
    if (data && data.error) throw new Error(data.error);
    return data;
  };

  // ---------------- current student + progress cache ----------------
  let progressCache = {};
  // the code of the student who is playing on this device (kept after she logged in)
  function pinOf(studentId) {
    const me = store.me;
    if (!me || me.id !== studentId || !me.pin) throw new Error('Please log in again with your code (👤 at the top).');
    return me.pin;
  }
  store.me = load('me', null);
  store.setMe = async function (student) {
    store.me = student;
    save('me', student);
    progressCache = {};
    if (student) {
      try { (await store.progress(student.id)).forEach(p => { progressCache[p.key] = p; }); }
      catch (e) { console.warn('progress load', e); }
    }
  };
  // all progress rows of the student on this device (for the moon week on the home page)
  store.rows = () => Object.values(progressCache);
  store.getStars = (key) => (progressCache[key] || {}).stars || 0;
  // Save one progress row. "data" holds the Anki schedule of a deck.
  let noDataColumn = false;
  async function put(rec) {
    progressCache[rec.key] = rec;
    if (!store.me) return;
    const row = Object.assign({}, rec);
    if (noDataColumn) delete row.data;
    try { await store.saveProgress(store.me.id, row); }
    catch (e) {
      if (!noDataColumn && /data/.test(e.message)) { noDataColumn = true; console.warn('progress.data column missing — run supabase/002_update.sql'); return put(rec); }
      console.warn('progress save', e);
      if (/wrong student code|log in again|too many/i.test(e.message)) {
        // the code on this device is not valid any more: log in again
        MQ.toast('🔐 Please enter your code again'); store.setMe(null); location.hash = '#/who'; return;
      }
      MQ.toast('⚠️ Progress not saved: ' + e.message);
    }
  }
  store.record = async function (key, { stars, correct, total, mistakes, data }) {
    const prev = progressCache[key] || {};
    await put({
      key, stars: Math.max(stars, prev.stars || 0), correct, total,
      mistakes: (mistakes || []).slice(0, 30).map(m => m.en || m.q || m.base || String(m)),
      plays: (prev.plays || 0) + 1, updated_at: new Date().toISOString(),
      data: data !== undefined ? data : prev.data,
    });
  };
  // Anki schedule for a deck: { cardId: { due, ivl, ease, reps, lapses } }
  store.deck = (key) => Object.assign({}, (progressCache[key] || {}).data || {});
  store.saveDeck = async function (key, data) {
    const prev = progressCache[key] || { key, stars: 0, plays: 0, mistakes: [] };
    await put(Object.assign({}, prev, { key, data, updated_at: new Date().toISOString() }));
  };

  MQ.store = store;
})();
