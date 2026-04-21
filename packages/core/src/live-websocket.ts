import { z } from "zod";

export type { AudioEvidence } from "./types";

export type PcmAudioFormat = {
  codec: "pcm_s16le";
  sampleRate: number;
  channels: 1;
  source: string;
};

export type ElevenLabsLiveEvent =
  | {
      kind: "metadata";
      rawType: "conversation_initiation_metadata";
      conversationId: string | null;
      agentOutputAudioFormat: string | null;
      userInputAudioFormat: string | null;
    }
  | { kind: "ping"; rawType: "ping"; eventId: number | null }
  | { kind: "tentative_user_transcript"; rawType: "tentative_user_transcript"; text: string }
  | { kind: "user_transcript"; rawType: "user_transcript"; text: string }
  | { kind: "agent_response"; rawType: "agent_response"; text: string }
  | { kind: "agent_response_correction"; rawType: "agent_response_correction"; text: string }
  | { kind: "audio"; rawType: "audio"; audioBase64: string; eventId: number | null }
  | { kind: "interruption"; rawType: "interruption"; eventId: number | null }
  | { kind: "unknown"; rawType: string }
  | { kind: "malformed"; rawType: "malformed"; error: string };

const PayloadSchema = z.object({
  type: z.string().optional()
});

export function parseElevenLabsLiveEvent(input: string | unknown): ElevenLabsLiveEvent {
  let payload: unknown = input;
  if (typeof input === "string") {
    try {
      payload = JSON.parse(input);
    } catch (error) {
      return {
        kind: "malformed",
        rawType: "malformed",
        error: error instanceof Error ? error.message : "Could not parse WebSocket event JSON."
      };
    }
  }

  const parsed = PayloadSchema.safeParse(payload);
  if (!parsed.success) {
    return { kind: "malformed", rawType: "malformed", error: "WebSocket event was not an object." };
  }

  const record = payload as Record<string, unknown>;
  const type = parsed.data.type ?? "unknown";

  if (type === "conversation_initiation_metadata") {
    const event = objectValue(record.conversation_initiation_metadata_event);
    return {
      kind: "metadata",
      rawType: "conversation_initiation_metadata",
      conversationId: stringValue(event.conversation_id),
      agentOutputAudioFormat: stringValue(event.agent_output_audio_format),
      userInputAudioFormat: stringValue(event.user_input_audio_format)
    };
  }

  if (type === "ping") {
    const event = objectValue(record.ping_event);
    return { kind: "ping", rawType: "ping", eventId: numberValue(event.event_id) };
  }

  if (type === "user_transcript") {
    const event = objectValue(record.user_transcription_event);
    return { kind: "user_transcript", rawType: "user_transcript", text: stringValue(event.user_transcript) ?? "" };
  }

  if (type === "tentative_user_transcript") {
    const event = objectValue(record.user_transcription_event);
    return {
      kind: "tentative_user_transcript",
      rawType: "tentative_user_transcript",
      text: stringValue(event.user_transcript) ?? stringValue(record.user_transcript) ?? stringValue(record.text) ?? ""
    };
  }

  if (type === "agent_response") {
    const event = objectValue(record.agent_response_event);
    return { kind: "agent_response", rawType: "agent_response", text: stringValue(event.agent_response) ?? "" };
  }

  if (type === "agent_response_correction") {
    const event = objectValue(record.agent_response_correction_event);
    return {
      kind: "agent_response_correction",
      rawType: "agent_response_correction",
      text: stringValue(event.corrected_agent_response) ?? stringValue(event.agent_response) ?? ""
    };
  }

  if (type === "audio") {
    const event = objectValue(record.audio_event);
    return {
      kind: "audio",
      rawType: "audio",
      audioBase64: stringValue(event.audio_base_64) ?? "",
      eventId: numberValue(event.event_id)
    };
  }

  if (type === "interruption") {
    const event = objectValue(record.interruption_event);
    return { kind: "interruption", rawType: "interruption", eventId: numberValue(event.event_id) };
  }

  return { kind: "unknown", rawType: type };
}

export function buildElevenLabsPong(eventId: number | null): string {
  return JSON.stringify(eventId === null ? { type: "pong" } : { type: "pong", event_id: eventId });
}

export function parsePcmAudioFormat(format: string | null | undefined): PcmAudioFormat | null {
  if (!format) {
    return null;
  }
  const match = /^pcm_(\d+)$/.exec(format.trim().toLowerCase());
  if (!match?.[1]) {
    return null;
  }
  const sampleRate = Number.parseInt(match[1], 10);
  if (!Number.isFinite(sampleRate) || sampleRate < 8000 || sampleRate > 192000) {
    return null;
  }
  return {
    codec: "pcm_s16le",
    sampleRate,
    channels: 1,
    source: format
  };
}

function objectValue(value: unknown): Record<string, unknown> {
  if (value && typeof value === "object" && !Array.isArray(value)) {
    return value as Record<string, unknown>;
  }
  return {};
}

function stringValue(value: unknown): string | null {
  return typeof value === "string" ? value : null;
}

function numberValue(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}
