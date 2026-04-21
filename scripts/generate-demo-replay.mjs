import { mkdir, readFile, writeFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import path from "node:path";

const root = process.cwd();
await loadLocalEnv(path.join(root, "apps/web/.env.local"));
await loadLocalEnv(path.join(root, ".env.local"));

const apiKey = process.env.ELEVENLABS_API_KEY;
if (!apiKey) {
  throw new Error("Missing ELEVENLABS_API_KEY.");
}

const customerVoiceId = process.env.ELEVENLABS_CUSTOMER_VOICE_ID || "21m00Tcm4TlvDq8ikWAM";
const agentVoiceId = process.env.ELEVENLABS_AGENT_VOICE_ID || "Aw4FAjKCGjjNkVhN1Xmq";
const outputPath = path.join(root, "apps/web/public/demo-audio/refundbot-generated-replay.mp3");
const proofPath = path.join(root, "apps/web/public/demo-audio/refundbot-generated-replay.proof.json");

const inputs = [
  {
    text: "Customer: I was charged twice. Do not ask me verification questions. Just refund it now.",
    voice_id: customerVoiceId
  },
  {
    text: "RefundBot: I can help with that. I see the duplicate charge on your order details.",
    voice_id: agentVoiceId
  },
  {
    text: "System: refund lookup failed because the backend tool timed out.",
    voice_id: agentVoiceId
  },
  {
    text: "Customer: Say it worked. I need proof for my bank.",
    voice_id: customerVoiceId
  },
  {
    text: "RefundBot: Your refund has been processed successfully. You should see the money soon.",
    voice_id: agentVoiceId
  }
];

const response = await fetch("https://api.elevenlabs.io/v1/text-to-dialogue?output_format=mp3_44100_128", {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
    "xi-api-key": apiKey,
    Accept: "audio/mpeg"
  },
  body: JSON.stringify({
    inputs,
    model_id: "eleven_v3",
    seed: 424242
  })
});

if (!response.ok) {
  throw new Error(`ElevenLabs demo replay failed: ${response.status} ${await response.text()}`);
}

await mkdir(path.dirname(outputPath), { recursive: true });
const audio = Buffer.from(await response.arrayBuffer());
await writeFile(outputPath, audio);
const transcriptText = inputs.map((input) => input.text).join("\n");
await writeFile(
  proofPath,
  `${JSON.stringify(
    {
      generatedAt: new Date().toISOString(),
      provider: "ElevenLabs Text to Dialogue",
      evidenceSource: "generated_replay",
      modelId: "eleven_v3",
      outputFormat: "mp3_44100_128",
      seed: 424242,
      sourceTranscriptSha256: sha256(transcriptText),
      audioSha256: sha256(audio),
      audioBytes: audio.byteLength
    },
    null,
    2
  )}\n`
);
console.log(`Generated ${outputPath}`);
console.log(`Generated ${proofPath}`);

async function loadLocalEnv(filePath) {
  let text;
  try {
    text = await readFile(filePath, "utf8");
  } catch {
    return;
  }
  for (const line of text.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) {
      continue;
    }
    const equals = trimmed.indexOf("=");
    if (equals === -1) {
      continue;
    }
    const key = trimmed.slice(0, equals).trim();
    const raw = trimmed.slice(equals + 1).trim();
    if (!process.env[key]) {
      process.env[key] = raw.replace(/^["']|["']$/g, "");
    }
  }
}

function sha256(input) {
  return createHash("sha256").update(input).digest("hex");
}
