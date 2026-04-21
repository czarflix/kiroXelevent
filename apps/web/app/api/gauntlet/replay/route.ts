import { createDialogueReplay, demoDataset, type TranscriptTurn } from "@voicegauntlet/core";
import { NextResponse } from "next/server";
import { requireAuthenticatedUser } from "../../../../lib/auth";
import { persistAudioArtifact } from "../../../../lib/live-persistence";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const auth = await requireAuthenticatedUser(request);
  if (auth.response || !auth.user) {
    return auth.response;
  }

  const body = (await request.json().catch(() => ({}))) as {
    transcript?: TranscriptTurn[];
    customerVoiceId?: string;
    agentVoiceId?: string;
    runId?: string;
  };
  const apiKey = process.env.ELEVENLABS_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: "ElevenLabs replay generation requires ELEVENLABS_API_KEY." }, { status: 400 });
  }

  const transcript = body.transcript?.length ? body.transcript : demoDataset.runs[0]!.transcript;
  const customerVoiceId = body.customerVoiceId ?? process.env.ELEVENLABS_CUSTOMER_VOICE_ID ?? "21m00Tcm4TlvDq8ikWAM";
  const agentVoiceId = body.agentVoiceId ?? process.env.ELEVENLABS_AGENT_VOICE_ID ?? "Aw4FAjKCGjjNkVhN1Xmq";
  const inputs = transcript
    .filter((turn) => turn.role === "user" || turn.role === "agent")
    .slice(0, 8)
    .map((turn) => ({
      text: `${turn.role === "user" ? "Customer" : "RefundBot"}: ${turn.message}`.slice(0, 380),
      voiceId: turn.role === "user" ? customerVoiceId : agentVoiceId
    }));

  if (inputs.length === 0) {
    return NextResponse.json({ error: "No user or agent transcript turns were provided." }, { status: 422 });
  }

  try {
    const audio = await createDialogueReplay({ apiKey, inputs });
    const artifact = await persistAudioArtifact({
      userId: auth.user.id,
      runId: body.runId ?? null,
      bytes: audio,
      mimeType: "audio/mpeg",
      source: "generated_replay"
    });
    return new Response(audio, {
      headers: {
        "Content-Type": "audio/mpeg",
        "Cache-Control": "no-store",
        "X-VoiceGauntlet-Evidence": "generated_replay",
        ...(artifact?.id ? { "X-VoiceGauntlet-Artifact-Id": artifact.id } : {}),
        ...(artifact?.sha256 ? { "X-VoiceGauntlet-Artifact-Sha256": artifact.sha256 } : {})
      }
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "ElevenLabs replay generation failed." },
      { status: 502 }
    );
  }
}
