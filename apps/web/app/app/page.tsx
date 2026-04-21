import { demoDataset } from "@voicegauntlet/core";
import { GauntletConsole } from "../../components/gauntlet-console";
import { createCookieSupabase } from "../../lib/supabase";

export default async function AppPage() {
  const configured = Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
  if (!configured) {
    return <LiveWorkspaceGate reason="Supabase auth is not configured for this deployment." />;
  }

  const supabase = await createCookieSupabase();
  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (!user) {
    return <LiveWorkspaceGate reason="Sign in is required before running live provider-backed gauntlets." />;
  }

  return <GauntletConsole data={demoDataset} mode="app" />;
}

function LiveWorkspaceGate({ reason }: { reason: string }) {
  return (
    <main className="vg-shell">
      <section className="vg-workspace">
        <article className="stage-card">
          <div className="provenance-row">
            <span>Built with Kiro</span>
            <span>Live workspace</span>
          </div>
          <h1 className="serif mt-6 text-6xl">VoiceGauntlet Live</h1>
          <p className="lede mt-4">{reason}</p>
          <p className="lede mt-4">
            The public proof demo remains available at <a href="/demo">/demo</a>. Live runs require authenticated Supabase cookies plus valid
            ElevenLabs and Groq server-side keys.
          </p>
        </article>
      </section>
    </main>
  );
}
