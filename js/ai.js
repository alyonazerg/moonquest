// Mistral AI: vocabulary recognition (text or photo -> cards) and text-to-speech.
// The API key is kept only in this browser (localStorage) and is sent only to api.mistral.ai.
(function () {
  const API = 'https://api.mistral.ai/v1';
  const defaults = { key: '', chatModel: 'mistral-small-latest', ttsModel: 'voxtral-mini-tts-latest', voice: '' };
  const settings = Object.assign({}, defaults, MQ.load('ai', {}));
  const saveSettings = (s) => { Object.assign(settings, s); MQ.save('ai', settings); };

  async function call(path, body) {
    if (!settings.key) throw new Error('Нет ключа Mistral. Добавьте его в кабинете учителя → Настройки.');
    let res;
    try {
      res = await fetch(API + path, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + settings.key },
        body: JSON.stringify(body),
      });
    } catch (e) {
      throw new Error('Не удалось связаться с Mistral (сеть или браузер заблокировал запрос): ' + e.message);
    }
    if (!res.ok) {
      const t = await res.text();
      throw new Error(`Mistral ${res.status}: ${t.slice(0, 300)}`);
    }
    return res;
  }

  // ---------- vocabulary recognition ----------
  const PROMPT = `You help an English teacher of Russian-speaking children (10-12 years old).
Extract the English vocabulary to learn from the material (a word list, a textbook page or a photo).
Rules:
- Keep words and short phrases exactly as written in English (e.g. "do gymnastics", "tie your shoes").
- Give a short natural Russian translation for a child.
- Give ONE emoji that best shows the meaning (empty string if nothing fits).
- If the material is a list of irregular verbs (3 forms), return kind "verbs".
- Ignore page numbers, instructions and exercise text.
Return ONLY JSON:
{"title": "short title", "kind": "words", "items": [{"en": "...", "ru": "...", "pic": "🙂"}]}
or for verbs:
{"title": "...", "kind": "verbs", "items": [{"base": "go", "v2": "went", "v3": "gone", "ru": "идти"}]}`;

  function fileToDataUrl(file) {
    return new Promise((ok, fail) => {
      const r = new FileReader();
      r.onload = () => ok(r.result);
      r.onerror = () => fail(r.error);
      r.readAsDataURL(file);
    });
  }

  async function recognize({ text, files }) {
    const content = [{ type: 'text', text: PROMPT + (text ? '\n\nMaterial:\n' + text : '') }];
    for (const f of files || []) content.push({ type: 'image_url', image_url: await fileToDataUrl(f) });
    const res = await call('/chat/completions', {
      model: settings.chatModel,
      messages: [{ role: 'user', content }],
      response_format: { type: 'json_object' },
      temperature: 0.2,
    });
    const data = await res.json();
    const raw = data.choices[0].message.content;
    const json = JSON.parse(typeof raw === 'string' ? raw.replace(/^```(json)?|```$/g, '') : raw.map(p => p.text || '').join(''));
    json.kind = json.kind === 'verbs' ? 'verbs' : 'words';
    json.items = (json.items || []).filter(it => json.kind === 'verbs' ? it.base && it.v2 && it.v3 : it.en);
    return json;
  }

  // ---------- text to speech ----------
  // Response may be raw audio or JSON with base64 audio; both are handled.
  function findBase64(obj) {
    if (typeof obj === 'string') return obj.length > 200 ? obj : null;
    if (obj && typeof obj === 'object') for (const v of Object.values(obj)) { const r = findBase64(v); if (r) return r; }
    return null;
  }
  function sniff(bytes) {
    const s = String.fromCharCode(...bytes.slice(0, 4));
    if (s === 'RIFF') return 'audio/wav';
    if (s === 'OggS') return 'audio/ogg';
    if (s === 'fLaC') return 'audio/flac';
    return 'audio/mpeg';
  }
  async function tts(text) {
    const body = { model: settings.ttsModel, input: text, response_format: 'mp3' };
    if (settings.voice) body.voice = settings.voice;
    const res = await call('/audio/speech', body);
    const type = res.headers.get('content-type') || '';
    let bytes;
    if (type.includes('json')) {
      const b64 = findBase64(await res.json());
      if (!b64) throw new Error('Mistral вернул ответ без аудио');
      bytes = Uint8Array.from(atob(b64.replace(/^data:[^,]+,/, '')), c => c.charCodeAt(0));
    } else {
      bytes = new Uint8Array(await res.arrayBuffer());
    }
    return new Blob([bytes], { type: sniff(bytes) });
  }

  MQ.ai = { settings, saveSettings, hasKey: () => !!settings.key, recognize, tts };
})();
