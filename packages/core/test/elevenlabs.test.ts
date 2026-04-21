import { describe, expect, it } from "vitest";
import { buildDialogueReplayInputs, conversationDetailsToAudioEvidence, normalizeElevenLabsTranscript, simulateConversation } from "../src";
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
});
