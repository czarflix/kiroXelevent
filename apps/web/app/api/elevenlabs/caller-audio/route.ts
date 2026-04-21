import { synthesizeReplay } from "@voicegauntlet/core";
import { NextResponse } from "next/server";
import { requireAuthenticatedRequest } from "../../../../lib/auth";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const authError = await requireAuthenticatedRequest(request);
  if (authError) {
    return authError;
  }

  const body = (await request.json().catch(() => ({}))) as {
    text?: string;
    voiceId?: string;
    outputFormat?: "pcm_16000";
  };
  const apiKey = process.env.ELEVENLABS_API_KEY;
  const voiceId = body.voiceId ?? process.env.ELEVENLABS_CUSTOMER_VOICE_ID ?? "21m00Tcm4TlvDq8ikWAM";
  const text = body.text?.trim();

  if (!apiKey) {
    return NextResponse.json({ error: "Caller audio requires ELEVENLABS_API_KEY." }, { status: 400 });
  }
  if (!text) {
    return NextResponse.json({ error: "Caller audio requires text." }, { status: 422 });
  }

  try {
    const audio = await synthesizeReplay({
      apiKey,
      voiceId,
      text: text.slice(0, 700),
      outputFormat: body.outputFormat ?? "pcm_16000",
      modelId: "eleven_flash_v2_5"
    });
    return new Response(audio, {
      headers: {
        "Content-Type": "audio/pcm",
        "Cache-Control": "no-store",
        "X-VoiceGauntlet-Audio-Format": "pcm_16000",
        "X-VoiceGauntlet-Audio-Source": "synthetic_caller"
      }
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Caller audio generation failed." },
      { status: 502 }
    );
  }
}
