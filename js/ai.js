// AI helpers:
//  - card recognition (text or photo -> word / translation / emoji): Mistral, Claude (Anthropic) or OpenAI
//  - picture generation for cards: OpenAI
//  - text-to-speech: Mistral
// API keys are kept only in this browser (localStorage) and are sent only to the provider's own API.
(function () {
  const API = 'https://api.mistral.ai/v1';
  const DEFAULT_VOICE = 'gb_jane_neutral'; // British English preset
  const defaults = {
    provider: 'mistral',
    key: '', chatModel: 'mistral-small-latest', ttsModel: 'voxtral-mini-tts-latest', voice: DEFAULT_VOICE, refAudio: '',
    anthropicKey: '', claudeModel: 'claude-sonnet-5-5',
    openaiKey: '', openaiModel: 'gpt-4.1-mini', imageModel: 'gpt-image-1',
  };
  const settings = Object.assign({}, defaults, MQ.load('ai', {}));
  if (!settings.voice) settings.voice = DEFAULT_VOICE;
  const saveSettings = (s) => { Object.assign(settings, s); MQ.save('ai', settings); };

  async function call(path, body) {
    if (!settings.key) throw new Error('Нет ключа Mistral. Добавьте его в кабинете учителя → Настройки.');
    let res;
    try {
      res = await fetch(API + path, body === undefined
        ? { headers: { Authorization: 'Bearer ' + settings.key } }
        : { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + settings.key }, body: JSON.stringify(body) });
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

  const parseJson = (raw) => {
    const t = String(raw).trim().replace(/^```(?:json)?\s*/i, '').replace(/```$/, '');
    return JSON.parse(t.slice(t.indexOf('{'), t.lastIndexOf('}') + 1));
  };
  async function post(name, url, headers, body) {
    let res;
    try { res = await fetch(url, { method: 'POST', headers: Object.assign({ 'Content-Type': 'application/json' }, headers), body: JSON.stringify(body) }); }
    catch (e) { throw new Error(`Не удалось связаться с ${name} (сеть или браузер заблокировал запрос): ${e.message}`); }
    if (!res.ok) throw new Error(`${name} ${res.status}: ${(await res.text()).slice(0, 300)}`);
    return res.json();
  }

  const providers = {
    async mistral(text, images) {
      const content = [{ type: 'text', text }];
      images.forEach(img => content.push({ type: 'image_url', image_url: img }));
      const res = await call('/chat/completions', { model: settings.chatModel, messages: [{ role: 'user', content }], response_format: { type: 'json_object' }, temperature: 0.2 });
      const raw = (await res.json()).choices[0].message.content;
      return typeof raw === 'string' ? raw : raw.map(p => p.text || '').join('');
    },
    async anthropic(text, images) {
      if (!settings.anthropicKey) throw new Error('Нет ключа Claude. Добавьте его в Настройках.');
      const content = images.map(img => {
        const [, type, data] = img.match(/^data:([^;]+);base64,(.*)$/);
        return { type: 'image', source: { type: 'base64', media_type: type, data } };
      });
      content.push({ type: 'text', text });
      const data = await post('Claude', 'https://api.anthropic.com/v1/messages', {
        'x-api-key': settings.anthropicKey, 'anthropic-version': '2023-06-01', 'anthropic-dangerous-direct-browser-access': 'true',
      }, { model: settings.claudeModel, max_tokens: 4000, messages: [{ role: 'user', content }] });
      return data.content.filter(c => c.type === 'text').map(c => c.text).join('');
    },
    async openai(text, images) {
      if (!settings.openaiKey) throw new Error('Нет ключа OpenAI. Добавьте его в Настройках.');
      const content = [{ type: 'text', text }];
      images.forEach(img => content.push({ type: 'image_url', image_url: { url: img } }));
      const data = await post('OpenAI', 'https://api.openai.com/v1/chat/completions', { Authorization: 'Bearer ' + settings.openaiKey },
        { model: settings.openaiModel, messages: [{ role: 'user', content }], response_format: { type: 'json_object' }, temperature: 0.2 });
      return data.choices[0].message.content;
    },
  };
  const PROVIDER_NAMES = { mistral: 'Mistral', anthropic: 'Claude', openai: 'OpenAI' };
  const recognizerReady = () => !!(settings.provider === 'anthropic' ? settings.anthropicKey : settings.provider === 'openai' ? settings.openaiKey : settings.key);

  async function recognize({ text, files }) {
    const images = [];
    for (const f of files || []) images.push(await fileToDataUrl(f));
    const prompt = PROMPT + (text ? '\n\nMaterial:\n' + text : '');
    const raw = await (providers[settings.provider] || providers.mistral)(prompt, images);
    const json = parseJson(raw);
    json.kind = json.kind === 'verbs' ? 'verbs' : 'words';
    json.items = (json.items || []).filter(it => json.kind === 'verbs' ? it.base && it.v2 && it.v3 : it.en);
    return json;
  }

  // ---------- pictures for cards (OpenAI) ----------
  // Returns a small square WebP blob (about 15-30 KB) ready to store.
  async function drawPicture(word, ru) {
    if (!settings.openaiKey) throw new Error('Для картинок нужен ключ OpenAI (Настройки).');
    const data = await post('OpenAI', 'https://api.openai.com/v1/images/generations', { Authorization: 'Bearer ' + settings.openaiKey }, {
      model: settings.imageModel, size: '1024x1024', quality: 'low', n: 1,
      prompt: `A simple, cheerful flat illustration for a children's English vocabulary flashcard showing "${word}"${ru ? ` (meaning: ${ru})` : ''}. One clear subject, centred, bright colours, plain white background, no text, no letters.`,
    });
    const item = data.data[0];
    const src = item.b64_json ? 'data:image/png;base64,' + item.b64_json : item.url;
    return shrink(src, 320);
  }
  function shrink(src, size) {
    return new Promise((ok, fail) => {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => {
        const c = document.createElement('canvas');
        c.width = c.height = size;
        c.getContext('2d').drawImage(img, 0, 0, size, size);
        c.toBlob(b => b ? ok(b) : fail(new Error('Не удалось сжать картинку')), 'image/webp', 0.8);
      };
      img.onerror = () => fail(new Error('Не удалось загрузить картинку'));
      img.src = src;
    });
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
    // a voice sample (cloning) wins over a preset voice
    if (settings.refAudio) body.ref_audio = settings.refAudio;
    else body.voice = settings.voice || DEFAULT_VOICE;
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

  // List of voices (preset + saved in the workspace)
  async function voices() {
    const res = await call('/audio/voices?limit=100');
    const data = await res.json();
    const list = Array.isArray(data) ? data : data.items || data.data || data.voices || [];
    return list.map(v => ({ id: v.id || v.voice_id || v.slug || v.name, name: v.name || v.id, lang: v.language || v.languages || v.locale || '', type: v.type || '' }));
  }

  // Voice sample file -> base64 (without the data: prefix)
  async function fileToBase64(file) { return (await fileToDataUrl(file)).replace(/^data:[^,]+,/, ''); }

  MQ.ai = { settings, saveSettings, hasKey: () => !!settings.key, recognizerReady, PROVIDER_NAMES, recognize, drawPicture, tts, voices, fileToBase64, DEFAULT_VOICE };
})();
