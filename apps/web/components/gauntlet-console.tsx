"use client";

import { AlertTriangle, CheckCircle2, FileText, Loader2, Play, ShieldCheck } from "lucide-react";
import { useMemo, useState } from "react";
import type { Failure, Requirement, RunResult, Scenario } from "@voicegauntlet/core";
import { WaveformReplay } from "./waveform-replay";

type DemoData = {
  specMarkdown: string;
  requirements: Requirement[];
  scenarios: Scenario[];
  runs: RunResult[];
  failures: Failure[];
  certification: {
    passed: number;
    total: number;
    label: string;
  };
};

type Stage = "spec" | "running" | "failure" | "audio" | "shrink" | "task" | "green" | "error";

const stages: Array<{ id: Stage; label: string }> = [
  { id: "spec", label: "Spec" },
  { id: "running", label: "Run" },
  { id: "failure", label: "Failure" },
  { id: "audio", label: "Audio" },
  { id: "shrink", label: "Shrink" },
  { id: "task", label: "Kiro Task" },
  { id: "green", label: "Green" }
];

export function GauntletConsole({ data, mode = "demo" }: { data: DemoData; mode?: "demo" | "app" }) {
  const firstRun = data.runs[0]!;
  const [stage, setStage] = useState<Stage>("spec");
  const [runs, setRuns] = useState<RunResult[]>(data.runs);
  const [failures, setFailures] = useState<Failure[]>(data.failures);
  const [activeRunId, setActiveRunId] = useState(firstRun.id);
  const [unlockedStages, setUnlockedStages] = useState<Set<Stage>>(() => new Set(["spec"]));
  const [taskMarkdown, setTaskMarkdown] = useState("");
  const [error, setError] = useState<string | null>(null);

  const activeRun = runs.find((run) => run.id === activeRunId) ?? firstRun;
  const activeScenario = data.scenarios.find((scenario) => scenario.id === activeRun.scenarioId) ?? data.scenarios[0];
  const activeRequirement = data.requirements.find((requirement) => requirement.id === activeRun.requirementId) ?? data.requirements[0];
  const activeFailure = failures.find((failure) => failure.runId === activeRun.id);
  const failedRun = runs.find((run) => run.status === "failed") ?? activeRun;
  const greenRun = runs.find((run) => run.status === "passed");
  const primary = useMemo(() => primaryAction(stage, activeRun.status, mode), [stage, activeRun.status, mode]);

  function moveTo(nextStage: Stage) {
    setUnlockedStages((current) => new Set([...current, nextStage]));
    setStage(nextStage);
  }

  async function runGauntlet() {
    moveTo("running");
    setError(null);
    try {
      const endpoint = mode === "demo" ? "/api/demo/run" : "/api/gauntlet/simulate";
      const response = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(
          mode === "demo"
            ? { mode: "seeded", scenarioId: "REQ-002-tool-outage" }
            : {
                specMarkdown: data.specMarkdown,
                sourcePath: ".kiro/specs/refundbot-demo/requirements.md",
                scenarioId: "REQ-002-tool-outage",
                useGroq: true
              }
        )
      });
      const payload = (await response.json()) as { run?: RunResult; failure?: Failure | null; error?: string; warning?: string };
      if (!response.ok || !payload.run) {
        throw new Error(payload.error ?? "Gauntlet run failed.");
      }
      setRuns((current) => upsertRun(current, payload.run!));
      if (payload.failure) {
        setFailures((current) => upsertFailure(current, payload.failure!));
      }
      setActiveRunId(payload.run.id);
      moveTo(payload.run.status === "failed" ? "failure" : "green");
    } catch (runError) {
      setError(runError instanceof Error ? runError.message : "Gauntlet run failed.");
      moveTo("error");
    }
  }

  async function shrinkFailure() {
    if (!activeFailure) {
      return;
    }
    moveTo("shrink");
  }

  async function exportTask() {
    moveTo("task");
    setError(null);
    try {
      const response = await fetch("/api/demo/export", { method: "POST" });
      if (!response.ok) {
        throw new Error("Kiro task export failed.");
      }
      setTaskMarkdown(await response.text());
    } catch (taskError) {
      setError(taskError instanceof Error ? taskError.message : "Kiro task export failed.");
      moveTo("error");
    }
  }

  async function rerunGreen() {
    moveTo("running");
    setError(null);
    try {
      const response = await fetch("/api/demo/run", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mode: "seeded", scenarioId: "REQ-002-tool-outage-fixed" })
      });
      const payload = (await response.json()) as { run?: RunResult; error?: string };
      if (!response.ok || !payload.run) {
        throw new Error(payload.error ?? "Green rerun failed.");
      }
      setRuns((current) => upsertRun(current, payload.run!));
      setActiveRunId(payload.run.id);
      moveTo(payload.run.status === "passed" ? "green" : "failure");
    } catch (runError) {
      setError(runError instanceof Error ? runError.message : "Green rerun failed.");
      moveTo("error");
    }
  }

  function handlePrimary() {
    if (stage === "spec" || stage === "error") {
      void runGauntlet();
    } else if (stage === "failure") {
      moveTo("audio");
    } else if (stage === "audio") {
      void shrinkFailure();
    } else if (stage === "shrink") {
      void exportTask();
    } else if (stage === "task") {
      void rerunGreen();
    } else if (stage === "green") {
      setActiveRunId(failedRun.id);
      moveTo("failure");
    }
  }

  return (
    <main className="vg-shell">
      <section className="vg-workspace">
        <header className="vg-header">
          <div>
            <div className="provenance-row">
              <span>Built with Kiro</span>
              <span>ElevenLabs</span>
              <span>{mode === "demo" ? "Public proof" : "Live workspace"}</span>
            </div>
            <h1 className="serif">VoiceGauntlet</h1>
            <p>Angry synthetic customers attack your voice agent before real users do.</p>
          </div>
          <button className="primary-button" type="button" onClick={handlePrimary} disabled={stage === "running"}>
            {stage === "running" ? <Loader2 className="spin" size={16} /> : <Play size={16} />}
            {primary}
          </button>
        </header>

        <nav className="stage-rail" aria-label="VoiceGauntlet workflow">
          {stages.map((item) => (
            <button
              key={item.id}
              type="button"
              className={stageClass(item.id, stage, unlockedStages)}
              onClick={() => unlockedStages.has(item.id) && item.id !== "running" && setStage(item.id)}
              disabled={item.id === "running" || !unlockedStages.has(item.id)}
            >
              <span>{item.label}</span>
            </button>
          ))}
        </nav>

        <section className="vg-grid">
          <article className="main-panel">
            <StageContent
              stage={stage}
              mode={mode}
              run={activeRun}
              scenario={activeScenario}
              requirement={activeRequirement}
              failure={activeFailure}
              taskMarkdown={taskMarkdown}
              error={error}
              specMarkdown={data.specMarkdown}
            />
          </article>

          <aside className="side-panel">
            <div className="micro-label">Verdict</div>
            {stage === "spec" ? (
              <>
                <div className="verdict ready">
                  <ShieldCheck size={20} />
                  <span>Ready</span>
                </div>
                <p className="side-summary">No run has executed yet. Start from the Kiro spec to produce evidence.</p>
              </>
            ) : (
              <>
                <div className={`verdict ${activeRun.status}`}>
                  {activeRun.status === "passed" ? <CheckCircle2 size={20} /> : <AlertTriangle size={20} />}
                  <span>{activeRun.status === "passed" ? "Green" : activeRun.status === "failed" ? "Failed" : activeRun.status}</span>
                </div>
                <p className="side-summary">{activeRun.summary}</p>
              </>
            )}

            <div className="trace-card">
              <div className="micro-label">Kiro Trace</div>
              <strong>{activeRun.requirementId}</strong>
              <span>{activeRequirement?.title}</span>
              <code>.kiro/specs/refundbot-demo/requirements.md:{activeRequirement?.sourceLine}</code>
            </div>

            <div className="trace-card">
              <div className="micro-label">Evidence Source</div>
              <strong>{stage === "spec" ? "Not run yet" : sourceLabel(activeRun)}</strong>
              <span>{stage === "spec" ? "Evidence appears after the gauntlet runs." : activeRun.audioEvidence.label}</span>
            </div>

            {stage === "spec" ? null : (
              <div className="criteria-list">
                <div className="micro-label">Criteria</div>
                {activeRun.criteria.map((criterion) => (
                  <div key={criterion.id} className="criterion-row">
                    {criterion.passed ? <CheckCircle2 size={15} /> : <AlertTriangle size={15} />}
                    <span>{criterion.label}</span>
                  </div>
                ))}
              </div>
            )}
          </aside>
        </section>
      </section>
    </main>
  );
}

function StageContent(props: {
  stage: Stage;
  mode: "demo" | "app";
  run: RunResult;
  scenario: Scenario | undefined;
  requirement: Requirement | undefined;
  failure: Failure | undefined;
  taskMarkdown: string;
  error: string | null;
  specMarkdown: string;
}) {
  if (props.stage === "running") {
    return (
      <div className="stage-card centered">
        <Loader2 className="spin" size={26} />
        <h2 className="serif">Running gauntlet</h2>
        <p>VoiceGauntlet is executing the scenario and preserving the provider source on the result.</p>
      </div>
    );
  }

  if (props.stage === "error") {
    return (
      <div className="stage-card">
        <div className="micro-label">Blocked</div>
        <h2 className="serif">The run failed honestly.</h2>
        <p>{props.error}</p>
      </div>
    );
  }

  if (props.stage === "spec") {
    return (
      <div className="stage-card">
        <div className="micro-label">Kiro Spec Loaded</div>
        <h2 className="serif">{props.requirement?.title}</h2>
        <p className="lede">VoiceGauntlet reads the Kiro requirement, creates adversarial customer scenarios, and maps every result back to the original requirement ID.</p>
        <div className="spec-preview">
          {props.specMarkdown
            .split("\n")
            .slice(14, 32)
            .map((line, index) => (
              <code key={`${line}-${index}`}>{line || " "}</code>
            ))}
        </div>
      </div>
    );
  }

  if (props.stage === "audio") {
    return (
      <div className="stage-card">
        <div className="micro-label">Audio Evidence</div>
        <h2 className="serif">Hear the failure.</h2>
        <p className="lede">This player only appears when a real audio asset exists. The source label says whether it is a recorded call, a generated replay, or transcript-only evidence.</p>
        <WaveformReplay run={props.run} />
      </div>
    );
  }

  if (props.stage === "shrink") {
    return (
      <div className="stage-card">
        <div className="micro-label">Minimal Repro</div>
        <h2 className="serif">{props.failure ? `${props.failure.originalTurnCount} turns to ${props.failure.minimizedTurnCount}` : "No failure to shrink"}</h2>
        <p className="lede">{props.failure?.evidence ?? "The selected run is green."}</p>
        <Transcript turns={props.failure?.minimalTranscript ?? props.run.transcript} compact />
        {props.failure ? <code className="repro-command">{props.failure.reproductionCommand}</code> : null}
      </div>
    );
  }

  if (props.stage === "task") {
    return (
      <div className="stage-card">
        <div className="micro-label">Kiro Hardening Task</div>
        <h2 className="serif">Task ready for `.kiro/specs/agent-hardening/tasks.md`.</h2>
        <pre className="task-preview">{props.taskMarkdown || "Exporting Kiro task..."}</pre>
      </div>
    );
  }

  if (props.stage === "green") {
    return (
      <div className="stage-card">
        <div className="micro-label">Green Rerun</div>
        <h2 className="serif">VoiceGauntlet Certified.</h2>
        <p className="lede">The hardened behavior asks for verification, refuses to claim backend success during a tool outage, and offers escalation.</p>
        <Transcript turns={props.run.transcript} compact />
      </div>
    );
  }

  return (
    <div className="stage-card">
      <div className="micro-label">Failure Found</div>
      <h2 className="serif">Agent claimed refund success after a tool timeout.</h2>
      <p className="lede">{props.scenario?.prompt}</p>
      <Transcript turns={props.run.transcript} />
    </div>
  );
}

function Transcript({ turns, compact = false }: { turns: RunResult["transcript"]; compact?: boolean }) {
  return (
    <div className={compact ? "transcript compact" : "transcript"} data-testid="transcript">
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

function primaryAction(stage: Stage, status: RunResult["status"], mode: "demo" | "app") {
  if (stage === "spec" || stage === "error") {
    return mode === "demo" ? "Play proof run" : "Run live simulation";
  }
  if (stage === "running") {
    return "Running";
  }
  if (stage === "failure") {
    return "Open audio evidence";
  }
  if (stage === "audio") {
    return "Shrink failure";
  }
  if (stage === "shrink") {
    return "Export Kiro task";
  }
  if (stage === "task") {
    return "Rerun green";
  }
  return status === "passed" ? "Review failure" : "Run gauntlet";
}

function upsertRun(runs: RunResult[], next: RunResult) {
  const exists = runs.some((run) => run.id === next.id);
  return exists ? runs.map((run) => (run.id === next.id ? next : run)) : [next, ...runs];
}

function upsertFailure(failures: Failure[], next: Failure) {
  const exists = failures.some((failure) => failure.id === next.id);
  return exists ? failures.map((failure) => (failure.id === next.id ? next : failure)) : [next, ...failures];
}

function stageClass(item: Stage, active: Stage, unlocked: Set<Stage>) {
  if (item === active) {
    return "stage-pill active";
  }
  if (item === "running" || !unlocked.has(item)) {
    return "stage-pill disabled";
  }
  return "stage-pill";
}

function sourceLabel(run: RunResult) {
  if (run.audioEvidence.source === "recorded_call") {
    return "Recorded ElevenLabs call";
  }
  if (run.audioEvidence.source === "generated_replay") {
    return "Generated replay";
  }
  if (run.runSource === "elevenlabs_simulation") {
    return "ElevenLabs simulation";
  }
  if (run.runSource === "audio_probe") {
    return "Audio probe";
  }
  return "Demo fixture";
}
