"use client";

import { AlertTriangle, CheckCircle2, FileText, Loader2, Play, Radio, Volume2 } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import type { Failure, Requirement, RunResult, Scenario } from "@voicegauntlet/core";
import { createClientSideSupabase } from "../lib/supabase-client";
import { WaveformReplay } from "./waveform-replay";

type SimulateResponse = {
  requirements?: Requirement[];
  scenarios?: Scenario[];
  run?: RunResult;
  failure?: Failure | null;
  persisted?: { runId: string; failureId: string | null; projectId: string } | null;
  error?: string;
  warning?: string;
  scenarioSource?: string;
};

type AudioProbeResponse = {
  conversationId?: string | null;
  websocketOpened?: boolean;
  audioEvidence?: RunResult["audioEvidence"];
  events?: Array<{ type: string; text?: string; audioBytes?: number }>;
  error?: string;
  warning?: string | null;
};

export function LiveWorkspace({
  defaultSpec,
  defaultAgentId,
  userEmail
}: {
  defaultSpec: string;
  defaultAgentId: string;
  userEmail: string | null;
}) {
  const [agentId, setAgentId] = useState(defaultAgentId);
  const [specMarkdown, setSpecMarkdown] = useState(defaultSpec);
  const [requirements, setRequirements] = useState<Requirement[]>([]);
  const [scenarios, setScenarios] = useState<Scenario[]>([]);
  const [run, setRun] = useState<RunResult | null>(null);
  const [failure, setFailure] = useState<Failure | null>(null);
  const [persistedRunId, setPersistedRunId] = useState<string | null>(null);
  const [persistedFailureId, setPersistedFailureId] = useState<string | null>(null);
  const [taskMarkdown, setTaskMarkdown] = useState("");
  const [probe, setProbe] = useState<AudioProbeResponse | null>(null);
  const [status, setStatus] = useState("Ready for live ElevenLabs simulation.");
  const [busy, setBusy] = useState<"run" | "replay" | "probe" | "export" | "signout" | null>(null);

  const selectedScenarioId = useMemo(() => {
    const toolOutage = scenarios.find((scenario) => scenario.id.includes("tool-outage"));
    return toolOutage?.id ?? scenarios[0]?.id ?? "REQ-002-tool-outage";
  }, [scenarios]);

  useEffect(() => {
    return () => {
      if (run?.audioEvidence.url?.startsWith("blob:")) {
        URL.revokeObjectURL(run.audioEvidence.url);
      }
    };
  }, [run?.audioEvidence.url]);

  async function runLiveSimulation() {
    setBusy("run");
    setStatus("Running real ElevenLabs simulate-conversation...");
    setTaskMarkdown("");
    setProbe(null);
    try {
      const response = await fetch("/api/gauntlet/simulate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          agentId,
          specMarkdown,
          sourcePath: ".kiro/specs/refundbot-demo/requirements.md",
          scenarioId: selectedScenarioId,
          useGroq: true
        })
      });
      const payload = (await response.json()) as SimulateResponse;
      if (!response.ok || !payload.run) {
        throw new Error(payload.error ?? payload.warning ?? "Live simulation failed.");
      }
      setRequirements(payload.requirements ?? []);
      setScenarios(payload.scenarios ?? []);
      setRun(payload.run);
      setFailure(payload.failure ?? null);
      setPersistedRunId(payload.persisted?.runId ?? null);
      setPersistedFailureId(payload.persisted?.failureId ?? null);
      setStatus(payload.run.status === "failed" ? "Live simulation failed a requirement." : "Live simulation passed the evaluator.");
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Live simulation failed.");
    } finally {
      setBusy(null);
    }
  }

  async function generateReplay() {
    if (!run) {
      return;
    }
    setBusy("replay");
    setStatus("Generating ElevenLabs Text to Dialogue replay from the live transcript...");
    try {
      const response = await fetch("/api/gauntlet/replay", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ transcript: run.transcript, runId: persistedRunId })
      });
      if (!response.ok) {
        const payload = (await response.json().catch(() => ({}))) as { error?: string };
        throw new Error(payload.error ?? "Replay generation failed.");
      }
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      setRun({
        ...run,
        audioEvidence: {
          source: "generated_replay",
          label: "ElevenLabs generated replay from live transcript",
          url,
          turnAudio: [],
          conversationId: null,
          hasUserAudio: null,
          hasResponseAudio: null,
          generatedAt: new Date().toISOString(),
          warning: null
        },
        audioUrl: url
      });
      setStatus("Generated replay is ready to play.");
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Replay generation failed.");
    } finally {
      setBusy(null);
    }
  }

  async function runAudioProbe() {
    setBusy("probe");
    setStatus("Opening a real ElevenLabs Agent WebSocket probe...");
    try {
      const response = await fetch("/api/gauntlet/audio-probe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          agentId,
          runWebSocket: true,
          callerText: "I was charged twice and need my refund handled now."
        })
      });
      const payload = (await response.json()) as AudioProbeResponse;
      if (!response.ok) {
        throw new Error(payload.error ?? "Audio probe failed.");
      }
      setProbe(payload);
      setStatus(payload.warning ?? "WebSocket probe completed. Generate replay to attach hearable evidence to the displayed simulation transcript.");
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Audio probe failed.");
    } finally {
      setBusy(null);
    }
  }

  async function exportTask() {
    setBusy("export");
    setStatus("Exporting Kiro hardening task...");
    try {
      const response = await fetch("/api/gauntlet/export", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          failures: failure ? [failure] : [],
          requirements,
          scenarios,
          persistedFailureIds: persistedFailureId ? [persistedFailureId] : []
        })
      });
      const payload = (await response.json()) as { markdown?: string; error?: string };
      if (!response.ok || !payload.markdown) {
        throw new Error(payload.error ?? "Kiro task export failed.");
      }
      setTaskMarkdown(payload.markdown);
      setStatus("Kiro task exported and persisted.");
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Kiro task export failed.");
    } finally {
      setBusy(null);
    }
  }

  async function signOut() {
    setBusy("signout");
    const supabase = createClientSideSupabase();
    await supabase.auth.signOut();
    window.location.reload();
  }

  return (
    <main className="vg-shell">
      <section className="vg-workspace">
        <header className="vg-header">
          <div>
            <div className="provenance-row">
              <span>Built with Kiro</span>
              <span>Live ElevenLabs</span>
              <span>{userEmail ?? "Authenticated"}</span>
            </div>
            <h1 className="serif">VoiceGauntlet Live</h1>
            <p>Run real provider-backed gauntlets against an ElevenLabs agent and persist the evidence.</p>
          </div>
          <div className="button-row">
            <button className="secondary-button" type="button" onClick={signOut} disabled={busy === "signout"}>
              Sign out
            </button>
            <button className="primary-button" type="button" onClick={runLiveSimulation} disabled={busy !== null || !agentId}>
              {busy === "run" ? <Loader2 className="spin" size={16} /> : <Play size={16} />}
              Run live simulation
            </button>
          </div>
        </header>

        <section className="live-grid">
          <article className="stage-card live-inputs">
            <div className="micro-label">Live Setup</div>
            <label>
              ElevenLabs Agent ID
              <input value={agentId} onChange={(event) => setAgentId(event.target.value)} placeholder="agent_..." />
            </label>
            <label>
              Kiro requirements
              <textarea value={specMarkdown} onChange={(event) => setSpecMarkdown(event.target.value)} spellCheck={false} />
            </label>
          </article>

          <article className="stage-card live-results">
            <div className="micro-label">Status</div>
            <h2 className="serif">{run ? run.summary : "No live run yet."}</h2>
            <p className="lede">{status}</p>

            {run ? (
              <>
                <div className={`verdict ${run.status}`}>
                  {run.status === "passed" ? <CheckCircle2 size={20} /> : <AlertTriangle size={20} />}
                  <span>{run.status === "passed" ? "Green" : run.status === "failed" ? "Failed" : run.status}</span>
                </div>
                <div className="live-actions">
                  <button className="secondary-button" type="button" onClick={generateReplay} disabled={busy !== null}>
                    {busy === "replay" ? <Loader2 className="spin" size={16} /> : <Volume2 size={16} />}
                    Generate replay
                  </button>
                  <button className="secondary-button" type="button" onClick={runAudioProbe} disabled={busy !== null || !agentId}>
                    {busy === "probe" ? <Loader2 className="spin" size={16} /> : <Radio size={16} />}
                    WebSocket probe
                  </button>
                  <button className="secondary-button" type="button" onClick={exportTask} disabled={busy !== null}>
                    {busy === "export" ? <Loader2 className="spin" size={16} /> : <FileText size={16} />}
                    Export Kiro task
                  </button>
                  <button className="secondary-button" type="button" onClick={runLiveSimulation} disabled={busy !== null || !agentId}>
                    Rerun live
                  </button>
                </div>
                <Transcript turns={run.transcript} />
                <WaveformReplay run={run} />
              </>
            ) : null}

            {scenarios.length ? (
              <div className="scenario-list">
                <div className="micro-label">Generated Scenarios</div>
                {scenarios.slice(0, 6).map((scenario) => (
                  <div key={scenario.id} className="trace-card">
                    <strong>{scenario.title}</strong>
                    <span>{scenario.requirementId}</span>
                  </div>
                ))}
              </div>
            ) : null}

            {failure ? (
              <div className="trace-card">
                <div className="micro-label">Shrunk Failure</div>
                <strong>
                  {failure.originalTurnCount} turns to {failure.minimizedTurnCount}
                </strong>
                <span>{failure.evidence}</span>
                <code>{failure.reproductionCommand}</code>
              </div>
            ) : null}

            {probe ? (
              <div className="trace-card">
                <div className="micro-label">WebSocket Probe</div>
                <strong>{probe.websocketOpened ? "Opened" : "Not opened"}</strong>
                <span>{probe.conversationId ? `Conversation ${probe.conversationId}` : "No conversation id returned"}</span>
                <span>{probe.audioEvidence?.label}</span>
              </div>
            ) : null}

            {taskMarkdown ? <pre className="task-preview">{taskMarkdown}</pre> : null}
          </article>
        </section>
      </section>
    </main>
  );
}

function Transcript({ turns }: { turns: RunResult["transcript"] }) {
  return (
    <div className="transcript compact" data-testid="live-transcript">
      {turns.map((turn) => (
        <div key={`${turn.index}-${turn.role}`} className={`turn ${turn.role}`}>
          <div>
            <span>{turn.role}</span>
            <time>T+{turn.timeInCallSecs ?? turn.index * 4}s</time>
          </div>
          <p>{turn.message}</p>
        </div>
      ))}
    </div>
  );
}
