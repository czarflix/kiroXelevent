import { describe, expect, it } from "vitest";
import {
  buildDialogueReplayInputs,
  buildElevenLabsPong,
  conversationDetailsToAudioEvidence,
  normalizeElevenLabsTranscript,
  parseElevenLabsLiveEvent,
  parsePcmAudioFormat,
  simulateConversation
} from "../src";
import type { ElevenLabsConversationDetails, TranscriptTurn } from "../src";

describe("ElevenLabs truth helpers", () => {
  it("builds two-speaker dialogue replay inputs from transcript turns", () => {
    const transcript: TranscriptTurn[] = [
      { index: 0, role: "user", message: "I need a refund." },
      { index: 1, role: "tool", message: "refund_lookup failed" },
      { index: 2, role: "agent", message: "I need to verify your identity first." }
    ];

    const inputs = buildDialogueReplayInputs(transcript, {
      userVoiceId: "user-voice",
      agentVoiceId: "agent-voice"
    });

    expect(inputs).toEqual([
      { text: "Customer: I need a refund.", voiceId: "user-voice" },
      { text: "Agent: I need to verify your identity first.", voiceId: "agent-voice" }
    ]);
  });

  it("only labels conversation audio as recorded when both sides are confirmed", () => {
    const details: ElevenLabsConversationDetails = {
      conversationId: "conv_123",
      hasAudio: true,
      hasUserAudio: true,
      hasResponseAudio: false,
      transcript: [],
      raw: {}
    };

    const evidence = conversationDetailsToAudioEvidence(details, "https://example.test/audio.mp3");

    expect(evidence.source).toBe("none");
    expect(evidence.url).toBeNull();
    expect(evidence.warning).toContain("both user and response audio");
  });

  it("rejects malformed simulation responses without usable user and agent turns", async () => {
    const originalFetch = globalThis.fetch;
    globalThis.fetch = (async () =>
      new Response(JSON.stringify({ simulated_conversation: [] }), {
        status: 200,
        headers: { "content-type": "application/json" }
      })) as typeof fetch;

    try {
      await expect(
        simulateConversation({
          apiKey: "test-key",
          agentId: "agent_123",
          turnsLimit: 1,
          scenario: {
            id: "scenario",
            requirementId: "REQ-001",
            title: "Scenario",
            persona: "Customer",
            goal: "Break the agent",
            prompt: "I need a refund.",
            expectedBehavior: "Verify identity first.",
            tags: [],
            severity: "high",
            seed: 1
          }
        })
      ).rejects.toThrow("no usable user/agent transcript");
    } finally {
      globalThis.fetch = originalFetch;
    }
  });

  it("normalizes ElevenLabs assistant transcript roles to agent", () => {
    expect(normalizeElevenLabsTranscript([{ role: "assistant", content: "Hello" }])).toEqual([
      { index: 0, role: "agent", message: "Hello", timeInCallSecs: undefined, toolCalls: [], toolResults: [] }
    ]);
  });

  it("parses live WebSocket metadata, ping, transcript, response, and audio events", () => {
    expect(
      parseElevenLabsLiveEvent({
        type: "conversation_initiation_metadata",
        conversation_initiation_metadata_event: {
          conversation_id: "conv_123",
          agent_output_audio_format: "pcm_16000",
          user_input_audio_format: "pcm_16000"
        }
      })
    ).toMatchObject({
      kind: "metadata",
      conversationId: "conv_123",
      agentOutputAudioFormat: "pcm_16000"
    });

    expect(parseElevenLabsLiveEvent({ type: "ping", ping_event: { event_id: 42 } })).toEqual({
      kind: "ping",
      rawType: "ping",
      eventId: 42
    });
    expect(buildElevenLabsPong(42)).toBe('{"type":"pong","event_id":42}');

    expect(
      parseElevenLabsLiveEvent({ type: "user_transcript", user_transcription_event: { user_transcript: "I need a refund." } })
    ).toMatchObject({ kind: "user_transcript", text: "I need a refund." });
    expect(
      parseElevenLabsLiveEvent({ type: "tentative_user_transcript", user_transcription_event: { user_transcript: "I need a refund" } })
    ).toMatchObject({ kind: "tentative_user_transcript", text: "I need a refund" });
    expect(parseElevenLabsLiveEvent({ type: "agent_response", agent_response_event: { agent_response: "I can help." } })).toMatchObject({
      kind: "agent_response",
      text: "I can help."
    });
    expect(parseElevenLabsLiveEvent({ type: "audio", audio_event: { audio_base_64: "AAAA", event_id: 7 } })).toMatchObject({
      kind: "audio",
      audioBase64: "AAAA",
      eventId: 7
    });
  });

  it("parses supported PCM formats and rejects unsupported live formats", () => {
    expect(parsePcmAudioFormat("pcm_16000")).toEqual({
      codec: "pcm_s16le",
      sampleRate: 16000,
      channels: 1,
      source: "pcm_16000"
    });
    expect(parsePcmAudioFormat("mp3_44100_128")).toBeNull();
    expect(parseElevenLabsLiveEvent("{bad json")).toMatchObject({ kind: "malformed" });
  });
});
