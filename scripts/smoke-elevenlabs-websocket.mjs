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
console.log(`caller pcm content-type ${tts.headers.get("content-type") ?? "unknown"}`);

const result = await runSocket(signedUrl, pcm);
console.log(`websocket opened ${result.opened}`);
console.log(`conversation id ${Boolean(result.conversationId)}`);
console.log(`tentative user transcript ${result.tentativeUserTranscript}`);
console.log(`user transcript ${result.userTranscript}`);
console.log(`agent response ${result.agentResponse}`);
console.log(`agent response after user ${result.agentResponseAfterUser}`);
console.log(`agent audio bytes ${result.agentAudioBytes}`);
console.log(`user input audio format ${result.userInputAudioFormat}`);
console.log(`agent output audio format ${result.agentOutputAudioFormat}`);
console.log(`event counts ${JSON.stringify(result.eventCounts)}`);
if (result.clientError) {
  console.log(`client error ${JSON.stringify(result.clientError)}`);
}

if (
  !result.opened ||
  !result.conversationId ||
  !result.userTranscript ||
  !result.agentResponseAfterUser ||
  result.agentAudioBytesAfterUser <= 0
) {
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
      audioStarted: false,
      tentativeUserTranscript: false,
      userTranscript: false,
      agentResponse: false,
      agentResponseAfterUser: false,
      agentAudioBytes: 0,
      agentAudioBytesAfterUser: 0,
      userInputAudioFormat: null,
      agentOutputAudioFormat: null,
      eventCounts: {},
      clientError: null,
      preCallerAgentAudioBytes: 0
    };
    const socket = new WebSocket(url);
    let audioStartTimer = null;
    const timeout = setTimeout(() => {
      socket.close();
      resolve(state);
    }, 35_000);

    function scheduleAudio(delayMs) {
      if (state.audioStarted || socket.readyState !== WebSocket.OPEN) {
        return;
      }
      if (audioStartTimer) {
        clearTimeout(audioStartTimer);
      }
      audioStartTimer = setTimeout(() => {
        audioStartTimer = null;
        void sendAudio();
      }, delayMs);
    }

    async function sendAudio() {
      if (state.audioStarted || socket.readyState !== WebSocket.OPEN) {
        return;
      }
      state.audioStarted = true;
      console.log("sending caller audio");
      for (let offset = 0; offset < pcm.byteLength; offset += 3200) {
        if (socket.readyState !== WebSocket.OPEN) {
          return;
        }
        const chunk = pcm.subarray(offset, Math.min(offset + 3200, pcm.byteLength));
        socket.send(JSON.stringify({ user_audio_chunk: chunk.toString("base64") }));
        await delay(100);
      }
      for (let index = 0; index < 10; index += 1) {
        if (socket.readyState !== WebSocket.OPEN) {
          return;
        }
        socket.send(JSON.stringify({ user_audio_chunk: Buffer.alloc(3200).toString("base64") }));
        await delay(100);
      }
    }

    socket.addEventListener("open", () => {
      state.opened = true;
      socket.send(JSON.stringify({ type: "conversation_initiation_client_data" }));
    });

    socket.addEventListener("message", (message) => {
      let payload;
      try {
        payload = JSON.parse(String(message.data));
      } catch {
        return;
      }
      if (typeof payload.type === "string") {
        state.eventCounts[payload.type] = (state.eventCounts[payload.type] ?? 0) + 1;
      }
      if (payload.type === "conversation_initiation_metadata") {
        const event = payload.conversation_initiation_metadata_event ?? {};
        state.conversationId = event.conversation_id ?? state.conversationId;
        state.userInputAudioFormat = event.user_input_audio_format ?? null;
        state.agentOutputAudioFormat = event.agent_output_audio_format ?? null;
        scheduleAudio(1200);
      }
      if (payload.type === "ping") {
        socket.send(JSON.stringify({ type: "pong", event_id: payload.ping_event?.event_id }));
      }
      if (payload.type === "tentative_user_transcript" && payload.user_transcription_event?.user_transcript) {
        state.tentativeUserTranscript = true;
      }
      if (payload.type === "user_transcript" && payload.user_transcription_event?.user_transcript) {
        state.userTranscript = true;
      }
      if (payload.type === "agent_response" && payload.agent_response_event?.agent_response) {
        if (!state.audioStarted) {
          scheduleAudio(2200);
        }
        state.agentResponse = true;
        if (state.userTranscript) {
          state.agentResponseAfterUser = true;
        }
      }
      if (payload.type === "audio" && payload.audio_event?.audio_base_64) {
        if (!state.audioStarted) {
          state.preCallerAgentAudioBytes += Buffer.from(payload.audio_event.audio_base_64, "base64").byteLength;
          scheduleAudio(Math.max(1400, estimatePcmDurationMs(state.preCallerAgentAudioBytes, state.agentOutputAudioFormat) + 900));
        }
        const bytes = Buffer.from(payload.audio_event.audio_base_64, "base64").byteLength;
        state.agentAudioBytes += bytes;
        if (state.userTranscript) {
          state.agentAudioBytesAfterUser += bytes;
        }
      }
      if (payload.type === "client_error") {
        state.clientError = payload;
      }
      if (state.conversationId && state.userTranscript && state.agentResponseAfterUser && state.agentAudioBytesAfterUser > 0) {
        clearTimeout(timeout);
        if (audioStartTimer) {
          clearTimeout(audioStartTimer);
        }
        socket.close();
        resolve(state);
      }
    });

    socket.addEventListener("error", () => {
      clearTimeout(timeout);
      if (audioStartTimer) {
        clearTimeout(audioStartTimer);
      }
      reject(new Error("WebSocket error"));
    });
  });
}

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function estimatePcmDurationMs(byteLength, format = "pcm_16000") {
  const match = /^pcm_(\d+)$/.exec(String(format ?? "pcm_16000"));
  const sampleRate = match ? Number.parseInt(match[1], 10) : 16000;
  return Math.ceil((byteLength / 2 / sampleRate) * 1000);
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
