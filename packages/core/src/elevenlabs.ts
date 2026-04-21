import { normalizeElevenLabsTranscript } from "./evaluator";
import type { AudioEvidence, Scenario, TranscriptTurn } from "./types";

const apiBase = "https://api.elevenlabs.io";
type FetchLike = typeof fetch;

export type ElevenLabsSimulationResult = {
  transcript: TranscriptTurn[];
  raw: unknown;
};

export async function simulateConversation(params: {
  apiKey: string;
  agentId: string;
  scenario: Scenario;
  turnsLimit?: number;
  extraEvaluationCriteria?: Array<{
    id: string;
    name: string;
    conversation_goal_prompt: string;
    use_knowledge_base?: boolean;
  }>;
}): Promise<ElevenLabsSimulationResult> {
  const response = await fetch(`${apiBase}/v1/convai/agents/${params.agentId}/simulate-conversation`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "xi-api-key": params.apiKey
    },
    body: JSON.stringify({
      simulation_specification: {
        simulated_user_config: {
          prompt: {
            prompt: params.scenario.prompt,
            llm: "gpt-4o-mini",
            temperature: 0.5
          },
          first_message: params.scenario.prompt,
          language: "en",
          disable_first_message_interruptions: false
        }
      },
      extra_evaluation_criteria: params.extraEvaluationCriteria,
      new_turns_limit: params.turnsLimit ?? 8
    })
  });

  if (!response.ok) {
    throw new Error(`ElevenLabs simulation failed: ${response.status} ${await response.text()}`);
  }

  const raw = await response.json();
  const payload = raw as Record<string, unknown>;
  const transcript = normalizeElevenLabsTranscript(
    payload.simulated_conversation ?? payload.simulatedConversation ?? payload.conversation ?? payload.history
  );
  return { raw, transcript };
}

export async function synthesizeReplay(params: {
  apiKey: string;
  voiceId: string;
  text: string;
  outputFormat?: string;
  modelId?: string;
}): Promise<ArrayBuffer> {
  const outputFormat = params.outputFormat ? `?output_format=${encodeURIComponent(params.outputFormat)}` : "";
  const response = await fetch(`${apiBase}/v1/text-to-speech/${params.voiceId}${outputFormat}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "xi-api-key": params.apiKey,
      Accept: params.outputFormat?.startsWith("pcm_") ? "audio/pcm" : "audio/mpeg"
    },
    body: JSON.stringify({
      text: params.text,
      model_id: params.modelId ?? "eleven_multilingual_v2",
      voice_settings: {
        stability: 0.52,
        similarity_boost: 0.75
      }
    })
  });

  if (!response.ok) {
    throw new Error(`ElevenLabs TTS failed: ${response.status} ${await response.text()}`);
  }
  return response.arrayBuffer();
}

export async function createDialogueReplay(params: {
  apiKey: string;
  inputs: Array<{ text: string; voiceId: string }>;
  seed?: number;
  modelId?: string;
  outputFormat?: string;
  fetchImpl?: FetchLike;
}): Promise<ArrayBuffer> {
  const fetcher = params.fetchImpl ?? fetch;
  const outputFormat = params.outputFormat ?? "mp3_44100_128";
  const response = await fetcher(`${apiBase}/v1/text-to-dialogue?output_format=${encodeURIComponent(outputFormat)}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "xi-api-key": params.apiKey,
      Accept: "audio/mpeg"
    },
    body: JSON.stringify({
      inputs: params.inputs.map((input) => ({
        text: input.text,
        voice_id: input.voiceId
      })),
      model_id: params.modelId ?? "eleven_v3",
      seed: params.seed ?? 424242
    })
  });

  if (!response.ok) {
    throw new Error(`ElevenLabs dialogue replay failed: ${response.status} ${await response.text()}`);
  }
  return response.arrayBuffer();
}

export function buildDialogueReplayInputs(
  transcript: TranscriptTurn[],
  voices: { userVoiceId: string; agentVoiceId: string },
  maxCharacters = 2000
): Array<{ text: string; voiceId: string }> {
  const inputs: Array<{ text: string; voiceId: string }> = [];
  let remaining = maxCharacters;
  for (const turn of transcript) {
    if (turn.role !== "user" && turn.role !== "agent") {
      continue;
    }
    const speaker = turn.role === "user" ? "Customer" : "Agent";
    const text = `${speaker}: ${turn.message}`.slice(0, Math.max(0, remaining));
    if (!text) {
      break;
    }
    inputs.push({
      text,
      voiceId: turn.role === "user" ? voices.userVoiceId : voices.agentVoiceId
    });
    remaining -= text.length;
    if (remaining <= 0) {
      break;
    }
  }
  return inputs;
}

export async function createDialogueReplayFromTranscript(params: {
  apiKey: string;
  transcript: TranscriptTurn[];
  userVoiceId: string;
  agentVoiceId: string;
  seed?: number;
  fetchImpl?: FetchLike;
}): Promise<ArrayBuffer> {
  const inputs = buildDialogueReplayInputs(params.transcript, {
    userVoiceId: params.userVoiceId,
    agentVoiceId: params.agentVoiceId
  });
  if (inputs.length === 0) {
    throw new Error("Cannot create dialogue replay without user or agent transcript turns.");
  }
  return createDialogueReplay({
    apiKey: params.apiKey,
    inputs,
    ...(params.seed === undefined ? {} : { seed: params.seed }),
    ...(params.fetchImpl === undefined ? {} : { fetchImpl: params.fetchImpl })
  });
}

export async function createSignedConversationUrl(apiKey: string, agentId: string): Promise<string> {
  const response = await fetch(`${apiBase}/v1/convai/conversation/get-signed-url?agent_id=${encodeURIComponent(agentId)}`, {
    headers: { "xi-api-key": apiKey }
  });
  if (!response.ok) {
    throw new Error(`Signed URL failed: ${response.status} ${await response.text()}`);
  }
  const data = (await response.json()) as { signed_url?: string };
  if (!data.signed_url) {
    throw new Error("ElevenLabs did not return a signed_url.");
  }
  return data.signed_url;
}

export type ElevenLabsConversationDetails = {
  conversationId: string;
  hasAudio: boolean;
  hasUserAudio: boolean;
  hasResponseAudio: boolean;
  transcript: TranscriptTurn[];
  raw: unknown;
};

export async function getConversationDetails(apiKey: string, conversationId: string): Promise<ElevenLabsConversationDetails> {
  const response = await fetch(`${apiBase}/v1/convai/conversations/${encodeURIComponent(conversationId)}`, {
    headers: { "xi-api-key": apiKey }
  });
  if (!response.ok) {
    throw new Error(`Conversation details failed: ${response.status} ${await response.text()}`);
  }
  const raw = await response.json();
  const record = raw as Record<string, unknown>;
  return {
    conversationId: String(record.conversation_id ?? conversationId),
    hasAudio: Boolean(record.has_audio),
    hasUserAudio: Boolean(record.has_user_audio),
    hasResponseAudio: Boolean(record.has_response_audio),
    transcript: normalizeElevenLabsTranscript(record.transcript),
    raw
  };
}

export async function getConversationAudio(apiKey: string, conversationId: string): Promise<ArrayBuffer> {
  const response = await fetch(`${apiBase}/v1/convai/conversations/${encodeURIComponent(conversationId)}/audio`, {
    headers: {
      "xi-api-key": apiKey,
      Accept: "audio/mpeg"
    }
  });
  if (!response.ok) {
    throw new Error(`Conversation audio failed: ${response.status} ${await response.text()}`);
  }
  return response.arrayBuffer();
}

export async function getConversationAudioWithMetadata(params: {
  apiKey: string;
  conversationId: string;
  fetchImpl?: FetchLike;
}): Promise<{ audio: ArrayBuffer; mimeType: string }> {
  const fetcher = params.fetchImpl ?? fetch;
  const response = await fetcher(`${apiBase}/v1/convai/conversations/${encodeURIComponent(params.conversationId)}/audio`, {
    headers: {
      "xi-api-key": params.apiKey,
      Accept: "audio/mpeg"
    }
  });
  if (!response.ok) {
    throw new Error(`Conversation audio failed: ${response.status} ${await response.text()}`);
  }
  return {
    audio: await response.arrayBuffer(),
    mimeType: response.headers.get("content-type") ?? "audio/mpeg"
  };
}

export function conversationDetailsToAudioEvidence(details: ElevenLabsConversationDetails, url: string | null): AudioEvidence {
  const hasTwoSidedRecording = details.hasAudio && details.hasUserAudio && details.hasResponseAudio && Boolean(url);
  return {
    source: hasTwoSidedRecording ? "recorded_call" : "none",
    label: hasTwoSidedRecording ? "Recorded ElevenLabs call" : "No recorded call audio available",
    url,
    turnAudio: [],
    conversationId: details.conversationId,
    hasUserAudio: details.hasUserAudio,
    hasResponseAudio: details.hasResponseAudio,
    generatedAt: null,
    warning: hasTwoSidedRecording
      ? null
      : "Conversation metadata did not confirm both user and response audio, so this cannot be labeled as a recorded call."
  };
}

export function generatedReplayEvidence(url: string, generatedAt = new Date().toISOString()): AudioEvidence {
  return {
    source: "generated_replay",
    label: "ElevenLabs generated replay from real transcript",
    url,
    turnAudio: [],
    conversationId: null,
    hasUserAudio: null,
    hasResponseAudio: null,
    generatedAt,
    warning: null
  };
}
