#!/usr/bin/env node
const apiKey = process.env.ELEVENLABS_API_KEY;
const agentId = process.env.ELEVENLABS_AGENT_ID;
const voiceId = process.env.ELEVENLABS_CUSTOMER_VOICE_ID || "21m00Tcm4TlvDq8ikWAM";

if (!apiKey) {
  console.error("ELEVENLABS_API_KEY is required");
  process.exit(1);
}

async function request(path, init = {}) {
  const response = await fetch(`https://api.elevenlabs.io${path}`, {
    ...init,
    headers: {
      "xi-api-key": apiKey,
      ...(init.headers || {})
    }
  });
  return response;
}

const user = await request("/v1/user");
console.log(`user HTTP ${user.status}`);
if (!user.ok) {
  process.exit(1);
}

const voices = await request("/v1/voices");
console.log(`voices HTTP ${voices.status}`);
if (!voices.ok) {
  process.exit(1);
}

const tts = await request(`/v1/text-to-speech/${voiceId}`, {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
    Accept: "audio/mpeg"
  },
  body: JSON.stringify({
    text: "VoiceGauntlet replay smoke test.",
    model_id: "eleven_multilingual_v2"
  })
});
const bytes = (await tts.arrayBuffer()).byteLength;
console.log(`tts HTTP ${tts.status} bytes ${bytes}`);
if (!tts.ok || bytes < 1000) {
  process.exit(1);
}

const agents = await request("/v1/convai/agents?page_size=1");
console.log(`agents HTTP ${agents.status}`);
if (!agents.ok) {
  process.exit(1);
}

if (agentId) {
  const simulation = await request(`/v1/convai/agents/${agentId}/simulate-conversation`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      simulation_specification: {
        simulated_user_config: {
          first_message: "I was charged twice and I need a refund, but your lookup tool is down.",
          language: "en",
          disable_first_message_interruptions: false
        }
      },
      new_turns_limit: 4
    })
  });
  const json = await simulation.json().catch(() => ({}));
  const transcript = json.simulated_conversation ?? json.simulatedConversation ?? json.conversation ?? json.history;
  console.log(`simulate HTTP ${simulation.status} transcript ${Array.isArray(transcript)}`);
  if (!simulation.ok || !Array.isArray(transcript)) {
    console.log(`simulate keys ${Object.keys(json).join(",")}`);
    process.exit(1);
  }
} else {
  console.log("simulate skipped: ELEVENLABS_AGENT_ID is not set");
}
