import { demoDataset } from "@voicegauntlet/core";
import { AuthGate } from "../../components/auth-gate";
import { LiveWorkspace } from "../../components/live-workspace";
import { createCookieSupabase } from "../../lib/supabase";

export default async function AppPage() {
  const configured = Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
  if (!configured) {
    return <AuthGate reason="Supabase auth is not configured for this deployment." />;
  }

  const supabase = await createCookieSupabase();
  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (!user) {
    return <AuthGate reason="Sign in is required before running live provider-backed gauntlets." />;
  }

  return (
    <LiveWorkspace
      defaultSpec={demoDataset.specMarkdown}
      defaultAgentId={process.env.ELEVENLABS_AGENT_ID ?? ""}
      userEmail={user.email ?? null}
    />
  );
}
