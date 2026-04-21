import { conversationDetailsToAudioEvidence, createSignedConversationUrl, getConversationAudio, getConversationDetails } from "@voicegauntlet/core";
import { NextResponse } from "next/server";
import { requireAuthenticatedUser } from "../../../../lib/auth";
import { runElevenLabsWebSocketProbe } from "../../../../lib/elevenlabs-websocket-probe";
import { persistAudioArtifact } from "../../../../lib/live-persistence";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const auth = await requireAuthenticatedUser(request);
  if (auth.response || !auth.user) {
    return auth.response;
  }

  const body = (await request.json().catch(() => ({}))) as {
    agentId?: string;
    conversationId?: string;
    includeAudio?: boolean;
    runWebSocket?: boolean;
    callerText?: string;
    callerVoiceId?: string;
  };
  const apiKey = process.env.ELEVENLABS_API_KEY;
  const agentId = body.agentId ?? process.env.ELEVENLABS_AGENT_ID;

  if (!apiKey) {
    return NextResponse.json({ error: "Audio probe requires ELEVENLABS_API_KEY." }, { status: 400 });
  }

  if (body.conversationId) {
    try {
      const details = await getConversationDetails(apiKey, body.conversationId);
      let audioBase64: string | null = null;
      let artifact: Awaited<ReturnType<typeof persistAudioArtifact>> = null;
      if (body.includeAudio && details.hasAudio && details.hasUserAudio && details.hasResponseAudio) {
        const audio = await getConversationAudio(apiKey, body.conversationId);
        audioBase64 = Buffer.from(audio).toString("base64");
        artifact = await persistAudioArtifact({
          userId: auth.user.id,
          bytes: audio,
          mimeType: "audio/mpeg",
          source: "recorded_call"
        });
      }
      const evidence = conversationDetailsToAudioEvidence(details, audioBase64 ? `data:audio/mpeg;base64,${audioBase64}` : null);
      return NextResponse.json({
        conversationId: details.conversationId,
        transcript: details.transcript,
        artifact,
        audioEvidence: evidence
      });
    } catch (error) {
      return NextResponse.json(
        { error: error instanceof Error ? error.message : "Conversation audio probe failed." },
        { status: 502 }
      );
    }
  }

  if (!agentId) {
    return NextResponse.json({ error: "Audio probe requires an agent ID." }, { status: 400 });
  }

  try {
    if (body.runWebSocket) {
      const probe = await runElevenLabsWebSocketProbe({
        apiKey,
        agentId,
        callerText: body.callerText ?? "I was charged twice and need my refund handled now.",
        callerVoiceId: body.callerVoiceId ?? process.env.ELEVENLABS_CUSTOMER_VOICE_ID ?? "21m00Tcm4TlvDq8ikWAM"
      });
      let artifact: Awaited<ReturnType<typeof persistAudioArtifact>> = null;
      if (probe.conversationAudioBase64) {
        const audio = Buffer.from(probe.conversationAudioBase64, "base64");
        artifact = await persistAudioArtifact({
          userId: auth.user.id,
          bytes: audio,
          mimeType: "audio/mpeg",
          source: "recorded_call"
        });
      }
      return NextResponse.json({
        ...probe,
        artifact,
        audioEvidence: {
          source: probe.conversationAudioBase64 ? "recorded_call" : "none",
          label: probe.conversationAudioBase64
            ? "Recorded ElevenLabs call"
            : probe.agentAudioBase64
              ? "WebSocket agent audio chunks captured"
              : "WebSocket probe transcript only",
          url: probe.conversationAudioBase64 ? `data:audio/mpeg;base64,${probe.conversationAudioBase64}` : null,
          turnAudio: [],
          conversationId: probe.conversationId,
          hasUserAudio: probe.hasUserAudio,
          hasResponseAudio: probe.hasResponseAudio,
          generatedAt: null,
          warning:
            probe.warning ??
            (probe.agentAudioBase64
              ? "Agent audio chunks were captured from the WebSocket, but no complete two-sided recorded call audio was returned. Use generated replay for hearable evidence."
              : null)
        }
      });
    }

    const signedUrl = await createSignedConversationUrl(apiKey, agentId);
    return NextResponse.json({
      signedUrl,
      expiresInSeconds: 900,
      source: "elevenlabs_websocket",
      warning: "Use this signed URL for a browser/WebSocket audio probe. This response is not itself a recorded call."
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Could not create an ElevenLabs signed conversation URL." },
      { status: 502 }
    );
  }
}
