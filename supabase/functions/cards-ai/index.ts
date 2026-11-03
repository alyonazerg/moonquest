// Supabase Edge Function "cards-ai": turns a word list or a photo into flashcards
// (English word, Russian translation, emoji). The AI key lives here as a secret,
// so students can make cards without having a key in their browser.
//
// Secrets (Supabase → Edge Functions → Secrets), set ONE of them:
//   ANTHROPIC_API_KEY   (Claude)      optional CLAUDE_MODEL,  default claude-sonnet-5-5
//   OPENAI_API_KEY      (OpenAI)      optional OPENAI_MODEL,  default gpt-4.1-mini
//   MISTRAL_API_KEY     (Mistral)     optional MISTRAL_MODEL, default mistral-small-latest

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const PROMPT = `You help an English teacher of Russian-speaking children (10-12 years old).
Extract the English vocabulary to learn from the material (a word list, a textbook page or a photo).
Rules:
- Keep words and short phrases exactly as written in English (e.g. "do gymnastics", "tie your shoes").
- Give a short natural Russian translation for a child.
- Give ONE emoji that best shows the meaning (empty string if nothing fits).
- If the material is a list of irregular verbs (3 forms), return kind "verbs".
- Ignore page numbers, instructions and exercise text.
- At most 40 items.
Return ONLY JSON:
{"title": "short title", "kind": "words", "items": [{"en": "...", "ru": "...", "pic": "🙂"}]}
or for verbs:
{"title": "...", "kind": "verbs", "items": [{"base": "go", "v2": "went", "v3": "gone", "ru": "идти"}]}`;

const JEOPARDY_PROMPT = `Create a Jeopardy-style quiz board for Russian-speaking children (10-12 years old) learning English (level A1-A2).
Use the teacher's material below (topic, word list, grammar or textbook page).
- 4 or 5 categories, each with exactly 5 questions worth 100, 200, 300, 400, 500 (harder = more points).
- Questions in simple English; you may ask to translate a Russian word, choose a grammar form, fill a gap (use ___), answer a riddle.
- Answers short (one word or a short phrase).
Return ONLY JSON: {"title": "short title", "items": [{"cat": "Category", "pts": 100, "q": "question", "a": "answer"}]}`;

const VPR_PROMPT = `You write an end-of-unit English test for Russian pupils (A1–A2) in the exact format of the Russian ВПР-2027 (4 класс), using ONLY the vocabulary and grammar of the unit material below.
Exactly 4 tasks in this order: 1) "listen": dialog of 8–12 lines (2 people) + 5 questions A–E with 3 options, "a" = 1/2/3; 2) "read": heading + text 120–170 words + 5 questions (E = "Choose the true sentence."); 3) "grammar": heading + story with gaps {A} {B} {C} {D} {E} + 5 gaps with 3 forms; 4) "form": heading (name) + text 60–80 words + 8 fields, each answer ONE word, numbers as words.
Return ONLY JSON: {"title":"…","tasks":[{"type":"listen","dialog":[["Mum","…"]],"questions":[{"q":"…","options":["…","…","…"],"a":1}]},{"type":"read","heading":"…","text":"…","questions":[…]},{"type":"grammar","heading":"…","text":"…{A}…","gaps":[{"options":["…","…","…"],"a":2}]},{"type":"form","heading":"…","text":"…","fields":[{"label":"Name","a":["…"]}]}]}`;

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...cors, "Content-Type": "application/json" } });

function parse(raw: string) {
  const t = raw.trim().replace(/^```(?:json)?\s*/i, "").replace(/```$/, "");
  return JSON.parse(t.slice(t.indexOf("{"), t.lastIndexOf("}") + 1));
}

async function ask(text: string, images: string[], mode = "cards"): Promise<string> {
  const prompt = (mode === "jeopardy" ? JEOPARDY_PROMPT : mode === "vpr" ? VPR_PROMPT : PROMPT) + (text ? "\n\nMaterial:\n" + text : "");
  const anthropic = Deno.env.get("ANTHROPIC_API_KEY");
  const openai = Deno.env.get("OPENAI_API_KEY");
  const mistral = Deno.env.get("MISTRAL_API_KEY");

  if (anthropic) {
    const content: unknown[] = images.map((img) => {
      const m = img.match(/^data:([^;]+);base64,(.*)$/)!;
      return { type: "image", source: { type: "base64", media_type: m[1], data: m[2] } };
    });
    content.push({ type: "text", text: prompt });
    const r = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: { "content-type": "application/json", "x-api-key": anthropic, "anthropic-version": "2023-06-01" },
      body: JSON.stringify({ model: Deno.env.get("CLAUDE_MODEL") || "claude-sonnet-5-5", max_tokens: 4000, messages: [{ role: "user", content }] }),
    });
    if (!r.ok) throw new Error(`Claude ${r.status}: ${(await r.text()).slice(0, 200)}`);
    const d = await r.json();
    return d.content.filter((c: { type: string }) => c.type === "text").map((c: { text: string }) => c.text).join("");
  }

  const openaiStyle = async (url: string, key: string, model: string, imagePart: (img: string) => unknown) => {
    const content: unknown[] = [{ type: "text", text: prompt }, ...images.map(imagePart)];
    const r = await fetch(url, {
      method: "POST",
      headers: { "content-type": "application/json", authorization: "Bearer " + key },
      body: JSON.stringify({ model, messages: [{ role: "user", content }], response_format: { type: "json_object" }, temperature: 0.2 }),
    });
    if (!r.ok) throw new Error(`AI ${r.status}: ${(await r.text()).slice(0, 200)}`);
    const d = await r.json();
    const c = d.choices[0].message.content;
    return typeof c === "string" ? c : c.map((p: { text?: string }) => p.text || "").join("");
  };
  if (openai) {
    return openaiStyle("https://api.openai.com/v1/chat/completions", openai, Deno.env.get("OPENAI_MODEL") || "gpt-4.1-mini",
      (img) => ({ type: "image_url", image_url: { url: img } }));
  }
  if (mistral) {
    return openaiStyle("https://api.mistral.ai/v1/chat/completions", mistral, Deno.env.get("MISTRAL_MODEL") || "mistral-small-latest",
      (img) => ({ type: "image_url", image_url: img }));
  }
  throw new Error("No AI key: add ANTHROPIC_API_KEY, OPENAI_API_KEY or MISTRAL_API_KEY in Edge Functions → Secrets.");
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (req.method !== "POST") return json({ error: "POST only" }, 405);
  try {
    const { text = "", images = [], mode = "cards" } = await req.json();
    // keep requests small: this function only makes vocabulary cards
    if (typeof text !== "string" || text.length > 6000) return json({ error: "Text is too long (max 6000 characters)." }, 400);
    if (!Array.isArray(images) || images.length > 3) return json({ error: "Up to 3 photos at a time." }, 400);
    if (images.some((i) => typeof i !== "string" || !i.startsWith("data:image/") || i.length > 7_000_000)) return json({ error: "Photo is too big." }, 400);
    if (!text.trim() && !images.length) return json({ error: "Write some words or add a photo." }, 400);

    const out = parse(await ask(text, images, ["jeopardy", "vpr"].includes(mode) ? mode : "cards"));
    if (mode === "vpr") return json(out);
    if (mode === "jeopardy") { out.items = (out.items || []).slice(0, 30); return json(out); }
    out.kind = out.kind === "verbs" ? "verbs" : "words";
    out.items = (out.items || []).slice(0, 40);
    return json(out);
  } catch (e) {
    return json({ error: e instanceof Error ? e.message : String(e) }, 500);
  }
});
