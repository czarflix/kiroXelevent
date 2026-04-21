import { createSignedConversationUrl, getConversationAudio, getConversationDetails } from "@voicegauntlet/core";
import { NextResponse } from "next/server";
import { requireAuthenticatedRequest } from "../../../../lib/auth";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const authError = await requireAuthenticatedRequest();
  if (authError) {
    return authError;
  }

  const body = (await request.json().catch(() => ({}))) as {
    agentId?: string;
    conversationId?: string;
    includeAudio?: boolean;
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
      if (body.includeAudio && details.hasAudio && details.hasUserAudio && details.hasResponseAudio) {
        const audio = await getConversationAudio(apiKey, body.conversationId);
        audioBase64 = Buffer.from(audio).toString("base64");
      }
      return NextResponse.json({
        conversationId: details.conversationId,
        transcript: details.transcript,
        audioEvidence: {
          source: details.hasAudio && details.hasUserAudio && details.hasResponseAudio ? "recorded_call" : "none",
          label:
            details.hasAudio && details.hasUserAudio && details.hasResponseAudio
              ? "Recorded ElevenLabs call"
              : "Conversation exists but does not expose complete recorded audio",
          url: audioBase64 ? `data:audio/mpeg;base64,${audioBase64}` : null,
          turnAudio: [],
          conversationId: details.conversationId,
          hasUserAudio: details.hasUserAudio,
          hasResponseAudio: details.hasResponseAudio,
          generatedAt: null,
          warning:
            details.hasAudio && details.hasUserAudio && details.hasResponseAudio
              ? null
              : "Recorded-call label is withheld because ElevenLabs did not report both user and response audio."
        }
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
