import { normalizeElevenLabsTranscript } from "./evaluator";
import type { Scenario, TranscriptTurn } from "./types";

const apiBase = "https://api.elevenlabs.io";

export type ElevenLabsSimulationResult = {
  transcript: TranscriptTurn[];
  raw: unknown;
};

export async function simulateConversation(params: {
  apiKey: string;
  agentId: string;
  scenario: Scenario;
  turnsLimit?: number;
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
          first_message: params.scenario.prompt,
          language: "en",
          disable_first_message_interruptions: false
        }
      },
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
}): Promise<ArrayBuffer> {
  const response = await fetch(`${apiBase}/v1/text-to-speech/${params.voiceId}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "xi-api-key": params.apiKey,
      Accept: "audio/mpeg"
    },
    body: JSON.stringify({
      text: params.text,
      model_id: "eleven_multilingual_v2",
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
