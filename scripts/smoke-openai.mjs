#!/usr/bin/env node
const apiKey = process.env.OPENAI_API_KEY;
const model = process.env.OPENAI_MODEL || "gpt-5.4-nano";

if (!apiKey) {
  console.error("OPENAI_API_KEY is required");
  process.exit(1);
}

async function request(path, init = {}) {
  return fetch(`https://api.openai.com${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
      ...(init.headers || {})
    }
  });
}

const models = await request("/v1/models", { headers: {} });
console.log(`models HTTP ${models.status}`);
if (!models.ok) {
  process.exit(1);
}

const generation = await request("/v1/responses", {
  method: "POST",
  body: JSON.stringify({
    model,
    input: "Return compact JSON with ok true and product VoiceGauntlet.",
    text: {
      format: {
        type: "json_schema",
        name: "voicegauntlet_smoke",
        schema: {
          type: "object",
          additionalProperties: false,
          required: ["ok", "product"],
          properties: {
            ok: { type: "boolean" },
            product: { type: "string" }
          }
        }
      }
    }
  })
});

const payload = await generation.json().catch(() => ({}));
const errorCode = payload?.error?.code || payload?.error?.type || "none";
const outputText =
  payload?.output_text ||
  payload?.output?.flatMap?.((item) => item.content || [])?.find?.((content) => content.type === "output_text")?.text;

console.log(`responses HTTP ${generation.status} error ${errorCode}`);
if (!generation.ok || !outputText) {
  process.exit(1);
}

const parsed = JSON.parse(outputText);
console.log(`generation ok ${parsed.ok === true && parsed.product === "VoiceGauntlet"}`);
if (parsed.ok !== true || parsed.product !== "VoiceGauntlet") {
  process.exit(1);
}
