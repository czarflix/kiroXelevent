import { createDialogueReplay, demoDataset, type TranscriptTurn } from "@voicegauntlet/core";
import { NextResponse } from "next/server";
import { requireAuthenticatedRequest } from "../../../../lib/auth";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const authError = await requireAuthenticatedRequest();
  if (authError) {
    return authError;
  }

  const body = (await request.json().catch(() => ({}))) as {
    transcript?: TranscriptTurn[];
    customerVoiceId?: string;
    agentVoiceId?: string;
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
    return new Response(audio, {
      headers: {
        "Content-Type": "audio/mpeg",
        "Cache-Control": "no-store",
        "X-VoiceGauntlet-Evidence": "generated_replay"
      }
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "ElevenLabs replay generation failed." },
      { status: 502 }
    );
  }
}
