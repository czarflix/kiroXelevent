"use client";

import { LogIn } from "lucide-react";
import { useState } from "react";
import { createClientSideSupabase } from "../lib/supabase-client";

export function AuthGate({ reason }: { reason: string }) {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function sendLink() {
    setBusy(true);
    setStatus(null);
    try {
      const supabase = createClientSideSupabase();
      const origin = window.location.origin;
      const { error } = await supabase.auth.signInWithOtp({
        email,
        options: { emailRedirectTo: `${origin}/auth/callback` }
      });
      if (error) {
        throw error;
      }
      setStatus("Check your email for the VoiceGauntlet sign-in link.");
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Sign-in link failed.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="vg-shell">
      <section className="vg-workspace compact-workspace">
        <article className="stage-card auth-card">
          <div className="provenance-row">
            <span>Built with Kiro</span>
            <span>Live workspace</span>
          </div>
          <h1 className="serif">VoiceGauntlet Live</h1>
          <p className="lede">{reason}</p>
          <div className="auth-form">
            <label>
              Email
              <input value={email} onChange={(event) => setEmail(event.target.value)} placeholder="you@example.com" type="email" />
            </label>
            <button className="primary-button" type="button" onClick={sendLink} disabled={busy || !email}>
              <LogIn size={16} />
              {busy ? "Sending" : "Send sign-in link"}
            </button>
          </div>
          {status ? <p className="form-status">{status}</p> : null}
          <p className="lede">
            The public judge proof remains available at <a href="/demo">/demo</a>.
          </p>
        </article>
      </section>
    </main>
  );
}
