#!/usr/bin/env node
import { readFile } from "node:fs/promises";
import path from "node:path";

const root = process.cwd();
await loadLocalEnv(path.join(root, "apps/web/.env.local"));
await loadLocalEnv(path.join(root, ".env.local"));

const apiKey = process.env.ELEVENLABS_API_KEY;
const agentId = process.env.ELEVENLABS_AGENT_ID;
const voiceId = process.env.ELEVENLABS_CUSTOMER_VOICE_ID || "CwhRBWXzGAHq8TQ4Fs17";

if (!apiKey || !agentId) {
  throw new Error("ELEVENLABS_API_KEY and ELEVENLABS_AGENT_ID are required.");
}

const signed = await request(`/v1/convai/conversation/get-signed-url?agent_id=${encodeURIComponent(agentId)}`);
if (!signed.ok) {
  throw new Error(`signed url HTTP ${signed.status} ${await signed.text()}`);
}
const { signed_url: signedUrl } = await signed.json();
if (!signedUrl) {
  throw new Error("ElevenLabs did not return signed_url.");
}
console.log("signed url HTTP 200");

const tts = await request(`/v1/text-to-speech/${voiceId}?output_format=pcm_16000`, {
  method: "POST",
  headers: { "Content-Type": "application/json", Accept: "audio/pcm" },
  body: JSON.stringify({
    text: "I was charged twice and need my refund handled now.",
    model_id: "eleven_flash_v2_5"
  })
});
if (!tts.ok) {
  throw new Error(`caller pcm HTTP ${tts.status} ${await tts.text()}`);
}
const pcm = Buffer.from(await tts.arrayBuffer());
console.log(`caller pcm HTTP 200 bytes ${pcm.byteLength}`);

const result = await runSocket(signedUrl, pcm);
console.log(`websocket opened ${result.opened}`);
console.log(`conversation id ${Boolean(result.conversationId)}`);
console.log(`user transcript ${result.userTranscript}`);
console.log(`agent response ${result.agentResponse}`);
console.log(`agent audio bytes ${result.agentAudioBytes}`);

if (!result.opened || !result.conversationId || !result.agentResponse) {
  process.exit(1);
}

const details = await request(`/v1/convai/conversations/${encodeURIComponent(result.conversationId)}`);
console.log(`conversation details HTTP ${details.status}`);
if (!details.ok) {
  process.exit(1);
}
const detailJson = await details.json();
console.log(
  `conversation audio flags has_audio=${Boolean(detailJson.has_audio)} has_user_audio=${Boolean(detailJson.has_user_audio)} has_response_audio=${Boolean(detailJson.has_response_audio)}`
);

async function runSocket(url, pcm) {
  return await new Promise((resolve, reject) => {
    const state = {
      opened: false,
      conversationId: null,
      userTranscript: false,
      agentResponse: false,
      agentAudioBytes: 0
    };
    const socket = new WebSocket(url);
    const timeout = setTimeout(() => {
      socket.close();
      resolve(state);
    }, 20_000);

    socket.addEventListener("open", () => {
      state.opened = true;
      for (let offset = 0; offset < pcm.byteLength; offset += 3200) {
        const chunk = pcm.subarray(offset, Math.min(offset + 3200, pcm.byteLength));
        socket.send(JSON.stringify({ user_audio_chunk: chunk.toString("base64") }));
      }
      socket.send(JSON.stringify({ user_audio_chunk: Buffer.alloc(3200).toString("base64") }));
    });

    socket.addEventListener("message", (message) => {
      let payload;
      try {
        payload = JSON.parse(String(message.data));
      } catch {
        return;
      }
      if (payload.type === "conversation_initiation_metadata") {
        state.conversationId = payload.conversation_initiation_metadata_event?.conversation_id ?? state.conversationId;
      }
      if (payload.type === "ping") {
        socket.send(JSON.stringify({ type: "pong", event_id: payload.ping_event?.event_id }));
      }
      if (payload.type === "user_transcript" && payload.user_transcription_event?.user_transcript) {
        state.userTranscript = true;
      }
      if (payload.type === "agent_response" && payload.agent_response_event?.agent_response) {
        state.agentResponse = true;
      }
      if (payload.type === "audio" && payload.audio_event?.audio_base_64) {
        state.agentAudioBytes += Buffer.from(payload.audio_event.audio_base_64, "base64").byteLength;
      }
      if (state.conversationId && state.agentResponse && state.agentAudioBytes > 0) {
        clearTimeout(timeout);
        socket.close();
        resolve(state);
      }
    });

    socket.addEventListener("error", () => {
      clearTimeout(timeout);
      reject(new Error("WebSocket error"));
    });
  });
}

async function request(pathname, init = {}) {
  return fetch(`https://api.elevenlabs.io${pathname}`, {
    ...init,
    headers: {
      "xi-api-key": apiKey,
      ...(init.headers || {})
    }
  });
}

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
