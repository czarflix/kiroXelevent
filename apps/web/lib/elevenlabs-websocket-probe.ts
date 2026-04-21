import { createSignedConversationUrl, getConversationAudio, getConversationDetails, synthesizeReplay } from "@voicegauntlet/core";

type ProbeEvent = {
  type: string;
  text?: string;
  eventId?: number;
  audioBytes?: number;
};

export type WebSocketProbeResult = {
  signedUrlCreated: boolean;
  websocketOpened: boolean;
  conversationId: string | null;
  transcript: Array<{ role: "user" | "agent"; message: string; timeInCallSecs?: number }>;
  events: ProbeEvent[];
  agentAudioBase64: string | null;
  conversationAudioBase64: string | null;
  hasUserAudio: boolean | null;
  hasResponseAudio: boolean | null;
  warning: string | null;
};

export async function runElevenLabsWebSocketProbe(params: {
  apiKey: string;
  agentId: string;
  callerText: string;
  callerVoiceId: string;
  timeoutMs?: number;
}): Promise<WebSocketProbeResult> {
  const signedUrl = await createSignedConversationUrl(params.apiKey, params.agentId);
  const events: ProbeEvent[] = [];
  const transcript: WebSocketProbeResult["transcript"] = [];
  const agentAudioChunks: Buffer[] = [];
  let conversationId: string | null = null;
  let websocketOpened = false;
  let settled = false;

  const pcm = await synthesizeReplay({
    apiKey: params.apiKey,
    voiceId: params.callerVoiceId,
    text: params.callerText,
    outputFormat: "pcm_16000",
    modelId: "eleven_flash_v2_5"
  });

  await new Promise<void>((resolve, reject) => {
    const timeout = setTimeout(() => {
      settled = true;
      try {
        socket.close();
      } catch {
        // ignore close races
      }
      resolve();
    }, params.timeoutMs ?? 18_000);

    const socket = new WebSocket(signedUrl);

    socket.addEventListener("open", () => {
      websocketOpened = true;
      events.push({ type: "open" });
      sendPcmChunks(socket, Buffer.from(pcm));
    });

    socket.addEventListener("message", (message) => {
      let payload: Record<string, unknown>;
      try {
        payload = JSON.parse(String(message.data)) as Record<string, unknown>;
      } catch {
        return;
      }
      const type = String(payload.type ?? "unknown");
      events.push({ type });

      if (type === "conversation_initiation_metadata") {
        const meta = payload.conversation_initiation_metadata_event as Record<string, unknown> | undefined;
        conversationId = typeof meta?.conversation_id === "string" ? meta.conversation_id : conversationId;
      }

      if (type === "ping") {
        const ping = payload.ping_event as Record<string, unknown> | undefined;
        const eventId = typeof ping?.event_id === "number" ? ping.event_id : undefined;
        socket.send(JSON.stringify({ type: "pong", event_id: eventId }));
      }

      if (type === "user_transcript") {
        const event = payload.user_transcription_event as Record<string, unknown> | undefined;
        const text = typeof event?.user_transcript === "string" ? event.user_transcript : "";
        if (text) {
          transcript.push({ role: "user", message: text });
          events.push({ type: "user_transcript_text", text });
        }
      }

      if (type === "agent_response") {
        const event = payload.agent_response_event as Record<string, unknown> | undefined;
        const text = typeof event?.agent_response === "string" ? event.agent_response : "";
        if (text) {
          transcript.push({ role: "agent", message: text });
          events.push({ type: "agent_response_text", text });
        }
      }

      if (type === "audio") {
        const event = payload.audio_event as Record<string, unknown> | undefined;
        const base64 = typeof event?.audio_base_64 === "string" ? event.audio_base_64 : "";
        if (base64) {
          const buffer = Buffer.from(base64, "base64");
          agentAudioChunks.push(buffer);
          events.push({ type: "agent_audio", audioBytes: buffer.byteLength });
        }
      }

      if (!settled && transcript.some((turn) => turn.role === "agent") && agentAudioChunks.length > 0) {
        settled = true;
        clearTimeout(timeout);
        socket.close();
        resolve();
      }
    });

    socket.addEventListener("error", () => {
      clearTimeout(timeout);
      reject(new Error("ElevenLabs WebSocket probe failed."));
    });

    socket.addEventListener("close", () => {
      if (!settled) {
        settled = true;
        clearTimeout(timeout);
        resolve();
      }
    });
  });

  let conversationAudioBase64: string | null = null;
  let hasUserAudio: boolean | null = null;
  let hasResponseAudio: boolean | null = null;
  let warning: string | null = null;

  if (conversationId) {
    const details = await getConversationDetails(params.apiKey, conversationId);
    hasUserAudio = details.hasUserAudio;
    hasResponseAudio = details.hasResponseAudio;
    if (details.transcript.length) {
      transcript.splice(
        0,
        transcript.length,
        ...details.transcript
          .filter((turn) => turn.role === "user" || turn.role === "agent")
          .map((turn) => ({
            role: turn.role as "user" | "agent",
            message: turn.message,
            ...(turn.timeInCallSecs === undefined ? {} : { timeInCallSecs: turn.timeInCallSecs })
          }))
      );
    }
    if (details.hasAudio && details.hasUserAudio && details.hasResponseAudio) {
      const audio = await getConversationAudio(params.apiKey, conversationId);
      conversationAudioBase64 = Buffer.from(audio).toString("base64");
    } else {
      warning = "WebSocket session completed, but ElevenLabs did not confirm complete two-sided recorded audio.";
    }
  } else {
    warning = "WebSocket session completed without a conversation id.";
  }

  return {
    signedUrlCreated: true,
    websocketOpened,
    conversationId,
    transcript,
    events,
    agentAudioBase64: agentAudioChunks.length ? Buffer.concat(agentAudioChunks).toString("base64") : null,
    conversationAudioBase64,
    hasUserAudio,
    hasResponseAudio,
    warning
  };
}

function sendPcmChunks(socket: WebSocket, pcm: Buffer) {
  const chunkSize = 3200;
  for (let offset = 0; offset < pcm.byteLength; offset += chunkSize) {
    const chunk = pcm.subarray(offset, Math.min(offset + chunkSize, pcm.byteLength));
    socket.send(JSON.stringify({ user_audio_chunk: chunk.toString("base64") }));
  }
  const silence = Buffer.alloc(3200);
  socket.send(JSON.stringify({ user_audio_chunk: silence.toString("base64") }));
}
