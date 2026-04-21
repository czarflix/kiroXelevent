import { NextResponse } from "next/server";

export function GET() {
  return NextResponse.json({
    ok: true,
    service: "voicegauntlet",
    timestamp: new Date().toISOString(),
    elevenlabsConfigured: Boolean(process.env.ELEVENLABS_API_KEY),
    groqConfigured: Boolean(process.env.GROQ_API_KEY),
    supabaseConfigured: Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY)
  });
}
