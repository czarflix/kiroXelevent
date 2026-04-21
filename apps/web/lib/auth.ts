import { NextResponse } from "next/server";
import { createCookieSupabase, createServiceSupabase } from "./supabase";

export async function requireAuthenticatedRequest(request?: Request) {
  const bearer = getBearerToken(request);
  if (bearer) {
    const supabase = createServiceSupabase();
    const { data, error } = await supabase.auth.getUser(bearer);
    if (!error && data.user) {
      return null;
    }
  }

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

export async function requireAuthenticatedUser(request?: Request) {
  const bearer = getBearerToken(request);
  if (bearer) {
    const supabase = createServiceSupabase();
    const { data, error } = await supabase.auth.getUser(bearer);
    if (!error && data.user) {
      return { response: null, user: data.user };
    }
  }

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

function getBearerToken(request?: Request) {
  const header = request?.headers.get("authorization");
  if (!header?.toLowerCase().startsWith("bearer ")) {
    return null;
  }
  return header.slice("bearer ".length).trim() || null;
}
