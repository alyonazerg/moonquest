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
  // Short stable file name for a text (FNV-1a, two seeds)
  function sha(text) {
    const fnv = (seed) => { let x = seed >>> 0; for (const ch of text) { x ^= ch.codePointAt(0); x = Math.imul(x, 16777619) >>> 0; } return x.toString(16).padStart(8, '0'); };
    return fnv(2166136261) + fnv(84696351);
  }
  const cloud = {
    mode: 'cloud',
    async init() {
      db = window.supabase.createClient(cfg.supabaseUrl, cfg.supabaseKey);
      session = (await db.auth.getSession()).data.session;
      db.auth.onAuthStateChange((_e, s) => { session = s; });
      try {
        const rows = must(await db.from('audio').select('text,path'));
        rows.forEach(r => { audioMap[r.text] = db.storage.from('audio').getPublicUrl(r.path).data.publicUrl; });
      } catch (e) { console.warn('audio list', e); }
    },
    isTeacher: () => !!session,
    async signIn(email, password) { must(await db.auth.signInWithPassword({ email, password })); return true; },
    async signOut() { await db.auth.signOut(); },
    // Students (not signed in) can see only names; PIN codes are visible to the teacher only.
    async students() { return must(await db.from('students').select(session ? '*' : 'id,name,course').order('name')); },
    async checkPin(id, pin) { return !!must(await db.rpc('student_login', { sid: id, p: String(pin).trim() })); },
    async saveStudent(s) {
      const row = { name: s.name, course: s.course || null };
      if (s.pin !== undefined) row.pin = s.pin;
      if (s.id) return must(await db.from('students').update(row).eq('id', s.id).select().single());
      return must(await db.from('students').insert(row).select().single());
    },
    async deleteStudent(id) { must(await db.from('students').delete().eq('id', id)); },
    async sets() { return must(await db.from('sets').select('*').order('created_at', { ascending: false })); },
    async getSet(id) { return must(await db.from('sets').select('*').eq('id', id).maybeSingle()); },
    async saveSet(set) {
      const row = { title: set.title, kind: set.kind, items: set.items };
      if (set.id) return must(await db.from('sets').update(row).eq('id', set.id).select().single());
      return must(await db.from('sets').insert(row).select().single());
    },
    async deleteSet(id) { must(await db.from('sets').delete().eq('id', id)); },
    async assignments() { return must(await db.from('assignments').select('student_id,set_id')); },
    async assign(studentId, setId, on) {
      if (on) must(await db.from('assignments').upsert({ student_id: studentId, set_id: setId }));
      else must(await db.from('assignments').delete().eq('student_id', studentId).eq('set_id', setId));
    },
    async progress(studentId) { return must(await db.from('progress').select('*').eq('student_id', studentId)); },
    async saveProgress(studentId, rec) {
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
  store.newPin = () => String(Math.floor(1000 + Math.random() * 9000));

  // ---------------- current student + progress cache ----------------
  let progressCache = {};
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
      console.warn('progress save', e); MQ.toast('⚠️ Progress not saved: ' + e.message);
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
