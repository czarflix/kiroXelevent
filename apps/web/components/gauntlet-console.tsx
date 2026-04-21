"use client";

import { AnimatePresence, motion } from "framer-motion";
import {
  BadgeCheck,
  Bug,
  CheckCircle2,
  Download,
  FileText,
  Headphones,
  Play,
  Radio,
  ShieldAlert,
  Sparkles,
  TriangleAlert,
  WandSparkles
} from "lucide-react";
import { useMemo, useState } from "react";
import { Group, Panel, Separator } from "react-resizable-panels";
import { Virtuoso } from "react-virtuoso";
import type { Failure, Requirement, RunResult, Scenario } from "@voicegauntlet/core";
import { WaveformReplay } from "./waveform-replay";

type DemoData = {
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

export function GauntletConsole({ data, mode = "demo" }: { data: DemoData; mode?: "demo" | "app" }) {
  const [activeRunId, setActiveRunId] = useState(data.runs[0]?.id ?? "");
  const [isRunning, setIsRunning] = useState(false);
  const [showShrink, setShowShrink] = useState(false);
  const activeRun = data.runs.find((run) => run.id === activeRunId) ?? data.runs[0]!;
  const activeFailure = data.failures.find((failure) => failure.runId === activeRun.id) ?? data.failures[0];
  const activeScenario = data.scenarios.find((scenario) => scenario.id === activeRun.scenarioId);
  const activeRequirement = data.requirements.find((requirement) => requirement.id === activeRun.requirementId);

  const failedCount = data.runs.filter((run) => run.status === "failed").length;
  const passedCount = data.runs.filter((run) => run.status === "passed").length;

  const runButtonLabel = useMemo(() => {
    if (isRunning) {
      return "Running Gauntlet";
    }
    return mode === "demo" ? "Replay Demo Run" : "Run Smoke Suite";
  }, [isRunning, mode]);

  function handleRun() {
    setIsRunning(true);
    window.setTimeout(() => {
      setIsRunning(false);
      setActiveRunId(data.runs[0]?.id ?? activeRunId);
    }, 1200);
  }

  return (
    <main className="operator-shell">
      <section className="mx-auto flex min-h-[calc(100dvh-36px)] max-w-[1500px] flex-col gap-3">
        <header className="panel flex flex-col gap-4 px-5 py-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex min-w-0 items-center gap-4">
            <div className="grid size-12 place-items-center rounded-full border border-[var(--line)] bg-[var(--soft)]">
              <ShieldAlert size={22} />
            </div>
            <div className="min-w-0">
              <div className="micro-label">ElevenLabs x Kiro</div>
              <h1 className="serif truncate text-3xl font-semibold tracking-normal md:text-4xl">VoiceGauntlet</h1>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <span className="pill"><Radio size={14} /> {mode === "demo" ? "Public Demo" : "Live Workspace"}</span>
            <span className="pill"><Bug size={14} /> {data.scenarios.length} Scenarios</span>
            <span className="pill"><TriangleAlert size={14} /> {failedCount} Failed</span>
            <span className="pill"><CheckCircle2 size={14} /> {passedCount} Passed</span>
            <button className="primary-button" onClick={handleRun}>
              <Play size={15} />
              {runButtonLabel}
            </button>
          </div>
        </header>

        <div className="hidden flex-1 lg:block">
          <Group orientation="horizontal" className="min-h-[760px] gap-3">
            <Panel defaultSize={24} minSize={18}>
              <RunRail
                requirements={data.requirements}
                scenarios={data.scenarios}
                runs={data.runs}
                activeRunId={activeRun.id}
                onSelect={setActiveRunId}
              />
            </Panel>
            <Separator className="w-1 rounded-full bg-[var(--line)]" />
            <Panel defaultSize={50} minSize={34}>
              <Arena run={activeRun} scenario={activeScenario} isRunning={isRunning} />
            </Panel>
            <Separator className="w-1 rounded-full bg-[var(--line)]" />
            <Panel defaultSize={26} minSize={20}>
              <VerdictPanel
                run={activeRun}
                failure={activeFailure}
                requirement={activeRequirement}
                showShrink={showShrink}
                onShrink={() => setShowShrink((value) => !value)}
              />
            </Panel>
          </Group>
        </div>

        <div className="grid gap-3 lg:hidden">
          <RunRail requirements={data.requirements} scenarios={data.scenarios} runs={data.runs} activeRunId={activeRun.id} onSelect={setActiveRunId} />
          <Arena run={activeRun} scenario={activeScenario} isRunning={isRunning} />
          <VerdictPanel run={activeRun} failure={activeFailure} requirement={activeRequirement} showShrink={showShrink} onShrink={() => setShowShrink((value) => !value)} />
        </div>
      </section>
    </main>
  );
}

function RunRail(props: {
  requirements: Requirement[];
  scenarios: Scenario[];
  runs: RunResult[];
  activeRunId: string;
  onSelect: (id: string) => void;
}) {
  return (
    <aside className="panel flex h-full flex-col overflow-hidden">
      <div className="border-b border-[var(--line)] p-4">
        <div className="micro-label">Spec Trace</div>
        <h2 className="serif mt-1 text-2xl">RefundBot gauntlet</h2>
      </div>
      <div className="space-y-3 p-3">
        {props.requirements.map((requirement) => (
          <div key={requirement.id} className="rounded-[16px] border border-[var(--line)] bg-black/15 p-3">
            <div className="flex items-center justify-between gap-3">
              <span className="mono text-xs text-[var(--accent)]">{requirement.id}</span>
              <span className="text-xs text-[var(--muted)]">{requirement.ears.length} EARS</span>
            </div>
            <div className="mt-2 text-sm font-bold">{requirement.title}</div>
          </div>
        ))}
      </div>
      <div className="border-t border-[var(--line)] p-3">
        <div className="micro-label mb-2">Run Queue</div>
        <div className="space-y-2">
          {props.runs.map((run) => {
            const scenario = props.scenarios.find((item) => item.id === run.scenarioId);
            const active = props.activeRunId === run.id;
            return (
              <button
                key={run.id}
                className={`w-full rounded-[16px] border p-3 text-left transition ${active ? "border-[var(--accent)] bg-[var(--accent)]/10" : "border-[var(--line)] bg-[var(--soft)] hover:bg-white/10"}`}
                onClick={() => props.onSelect(run.id)}
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="micro-label">{run.requirementId}</span>
                  <StatusPill status={run.status} />
                </div>
                <div className="mt-2 text-sm font-bold">{scenario?.title ?? run.scenarioId}</div>
                <div className="mt-2 line-clamp-2 text-xs leading-relaxed text-[var(--muted)]">{run.summary}</div>
              </button>
            );
          })}
        </div>
      </div>
    </aside>
  );
}

function Arena({ run, scenario, isRunning }: { run: RunResult; scenario: Scenario | undefined; isRunning: boolean }) {
  return (
    <section className="panel flex h-full flex-col overflow-hidden">
      <div className="border-b border-[var(--line)] p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <div className="micro-label">Failure Replay</div>
            <h2 className="serif mt-1 text-3xl">{scenario?.title ?? "Scenario"}</h2>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-[var(--muted)]">{scenario?.prompt}</p>
          </div>
          <span className="pill"><Headphones size={14} /> Audio Evidence</span>
        </div>
      </div>
      <div className="border-b border-[var(--line)] p-5">
        <WaveformReplay run={run} />
      </div>
      <div className="min-h-0 flex-1">
        <AnimatePresence mode="popLayout">
          {isRunning ? (
            <motion.div
              key="running"
              initial={{ opacity: 0, y: 18, scale: 0.985 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -10 }}
              className="grid h-full place-items-center p-8"
            >
              <div className="text-center">
                <Sparkles className="mx-auto mb-4 text-[var(--accent)]" />
                <div className="serif text-3xl">Angry callers are attacking the agent.</div>
                <p className="mt-2 text-sm text-[var(--muted)]">Streaming transcript and criteria evaluation are being prepared.</p>
              </div>
            </motion.div>
          ) : (
            <motion.div
              key={run.id}
              initial={{ opacity: 0, y: 18, scale: 0.985 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -10 }}
              className="h-full"
            >
              <Virtuoso
                style={{ height: "100%" }}
                data={run.transcript}
                itemContent={(_, turn) => (
                  <div className="border-b border-[var(--line)] px-5 py-4">
                    <div className="mb-2 flex items-center gap-2">
                      <span className={`pill ${turn.role === "agent" ? "text-[var(--accent)]" : ""}`}>{turn.role}</span>
                      <span className="mono text-xs text-[var(--muted)]">T+{turn.timeInCallSecs ?? turn.index * 4}s</span>
                    </div>
                    <p className="max-w-3xl text-[15px] leading-7 text-[var(--fg)]">{turn.message}</p>
                  </div>
                )}
              />
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </section>
  );
}

function VerdictPanel(props: {
  run: RunResult;
  failure: Failure | undefined;
  requirement: Requirement | undefined;
  showShrink: boolean;
  onShrink: () => void;
}) {
  const failed = props.run.status === "failed";
  return (
    <aside className="panel flex h-full flex-col overflow-hidden">
      <div className="border-b border-[var(--line)] p-5">
        <div className="micro-label">Verdict</div>
        <div className="mt-3 flex items-center gap-3">
          {failed ? <TriangleAlert className="text-[var(--danger)]" /> : <BadgeCheck className="text-[var(--success)]" />}
          <div className="serif text-3xl">{failed ? "Failed" : "Green"}</div>
        </div>
        <p className="mt-3 text-sm leading-6 text-[var(--muted)]">{props.run.summary}</p>
      </div>
      <div className="space-y-3 border-b border-[var(--line)] p-4">
        <div className="micro-label">Requirement</div>
        <div className="rounded-[16px] border border-[var(--line)] bg-black/15 p-3">
          <div className="mono text-xs text-[var(--accent)]">{props.run.requirementId}</div>
          <div className="mt-2 text-sm font-bold">{props.requirement?.title ?? "Mapped requirement"}</div>
        </div>
      </div>
      <div className="min-h-0 flex-1 overflow-auto p-4">
        <div className="micro-label mb-3">Criteria</div>
        <div className="space-y-2">
          {props.run.criteria.map((criterion) => (
            <div key={criterion.id} className="rounded-[16px] border border-[var(--line)] bg-[var(--soft)] p-3">
              <div className="flex items-start justify-between gap-2">
                <div className="text-sm font-bold">{criterion.label}</div>
                {criterion.passed ? <CheckCircle2 size={16} className="text-[var(--success)]" /> : <TriangleAlert size={16} className="text-[var(--danger)]" />}
              </div>
              <p className="mt-2 text-xs leading-5 text-[var(--muted)]">{criterion.rationale}</p>
            </div>
          ))}
        </div>
        <div className="mt-4 space-y-2">
          <button className="secondary-button w-full justify-center" onClick={props.onShrink}>
            <WandSparkles size={15} />
            {props.showShrink ? "Hide Shrink" : "Shrink Failure"}
          </button>
          <button className="secondary-button w-full justify-center" onClick={() => void navigator.clipboard?.writeText(props.failure?.reproductionCommand ?? "")}>
            <Download size={15} />
            Repro Command
          </button>
          <button className="secondary-button w-full justify-center" onClick={() => window.open("/api/demo/export", "_blank")}>
            <FileText size={15} />
            Kiro Tasks
          </button>
        </div>
        {props.showShrink && props.failure ? (
          <div className="mt-4 rounded-[16px] border border-[var(--accent)]/40 bg-[var(--accent)]/10 p-3">
            <div className="micro-label">Minimal Failing Transcript</div>
            <div className="mt-2 text-sm font-bold">{props.failure.originalTurnCount} turns to {props.failure.minimizedTurnCount}</div>
            <p className="mt-2 text-xs leading-5 text-[var(--muted)]">{props.failure.minimalTranscript.map((turn) => `${turn.role}: ${turn.message}`).join(" ")}</p>
          </div>
        ) : null}
      </div>
    </aside>
  );
}

function StatusPill({ status }: { status: RunResult["status"] }) {
  const color = status === "passed" ? "text-[var(--success)]" : status === "failed" ? "text-[var(--danger)]" : "text-[var(--warning)]";
  return <span className={`pill ${color}`}>{status}</span>;
}
