import { NextResponse } from "next/server";
import { createCookieSupabase } from "./supabase";

export async function requireAuthenticatedRequest() {
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
    return NextResponse.json({ error: "Supabase auth is required for live provider routes." }, { status: 401 });
  }

  const supabase = await createCookieSupabase();
  const {
    data: { user },
    error
  } = await supabase.auth.getUser();

  if (error || !user) {
    return NextResponse.json({ error: "Sign in is required for live provider routes." }, { status: 401 });
  }

  return null;
}

export async function requireAuthenticatedUser() {
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
    return {
      response: NextResponse.json({ error: "Supabase auth is required for live provider routes." }, { status: 401 }),
      user: null
    };
  }

  const supabase = await createCookieSupabase();
  const {
    data: { user },
    error
  } = await supabase.auth.getUser();

  if (error || !user) {
    return {
      response: NextResponse.json({ error: "Sign in is required for live provider routes." }, { status: 401 }),
      user: null
    };
  }

  return { response: null, user };
}
