import { createSignedConversationUrl } from "@voicegauntlet/core";
import { NextResponse } from "next/server";
import { requireAuthenticatedRequest } from "../../../../lib/auth";

export async function POST(request: Request) {
  const authError = await requireAuthenticatedRequest();
  if (authError) {
    return authError;
  }

  const body = (await request.json().catch(() => ({}))) as { agentId?: string };
  const apiKey = process.env.ELEVENLABS_API_KEY;
  const agentId = body.agentId ?? process.env.ELEVENLABS_AGENT_ID;

  if (!apiKey || !agentId) {
    return NextResponse.json({ error: "ElevenLabs server credentials are not configured." }, { status: 400 });
  }

  const signedUrl = await createSignedConversationUrl(apiKey, agentId);
  return NextResponse.json({ signedUrl, expiresInSeconds: 900 });
}
