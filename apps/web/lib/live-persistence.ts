import { createHash } from "node:crypto";
import type { Failure, Requirement, RunResult, Scenario } from "@voicegauntlet/core";
import { createServiceSupabase } from "./supabase";

type PersistLiveRunInput = {
  userId: string;
  sourcePath: string;
  specMarkdown: string;
  requirements: Requirement[];
  scenarios: Scenario[];
  run: RunResult;
  failure: Failure | null;
};

type PersistAudioInput = {
  userId: string;
  runId?: string | null;
  bytes: ArrayBuffer | Buffer;
  mimeType: string;
  source: string;
};

export type PersistedRun = {
  projectId: string;
  specDocumentId: string;
  runId: string;
  failureId: string | null;
};

export async function persistLiveRun(input: PersistLiveRunInput): Promise<PersistedRun | null> {
  try {
    const supabase = createServiceSupabase();
    const project = await ensureLiveProject(input.userId);
    const checksum = sha256(input.specMarkdown);
    const { data: spec, error: specError } = await supabase
      .from("spec_documents")
      .upsert(
        {
          project_id: project.projectId,
          source_path: input.sourcePath,
          raw_markdown: input.specMarkdown,
          parsed: { requirementCount: input.requirements.length },
          checksum,
          status: "parsed"
        },
        { onConflict: "project_id,source_path,checksum" }
      )
      .select("id")
      .single();
    if (specError || !spec) {
      throw specError ?? new Error("Spec persistence failed.");
    }

    const requirementIds = new Map<string, string>();
    for (const requirement of input.requirements) {
      const { data, error } = await supabase
        .from("requirements")
        .upsert(
          {
            spec_document_id: spec.id,
            requirement_key: requirement.id,
            title: requirement.title,
            user_story: requirement.userStory ?? null,
            acceptance: requirement.acceptance,
            ears: requirement.ears,
            source_line: requirement.sourceLine
          },
          { onConflict: "spec_document_id,requirement_key" }
        )
        .select("id")
        .single();
      if (error || !data) {
        throw error ?? new Error("Requirement persistence failed.");
      }
      requirementIds.set(requirement.id, data.id);
    }

    const scenarioIds = new Map<string, string>();
    for (const scenario of input.scenarios) {
      const requirementId = requirementIds.get(scenario.requirementId);
      if (!requirementId) {
        continue;
      }
      const { data, error } = await supabase
        .from("scenarios")
        .upsert(
          {
            requirement_id: requirementId,
            scenario_key: scenario.id,
            title: scenario.title,
            persona: scenario.persona,
            goal: scenario.goal,
            prompt: scenario.prompt,
            expected_behavior: scenario.expectedBehavior,
            tags: scenario.tags,
            severity: scenario.severity,
            seed: toPostgresInteger(scenario.seed)
          },
          { onConflict: "requirement_id,scenario_key" }
        )
        .select("id")
        .single();
      if (error || !data) {
        throw error ?? new Error("Scenario persistence failed.");
      }
      scenarioIds.set(scenario.id, data.id);
    }

    const { data: runRow, error: runError } = await supabase
      .from("runs")
      .insert({
        project_id: project.projectId,
        scenario_id: scenarioIds.get(input.run.scenarioId) ?? null,
        status: input.run.status,
        score: input.run.score,
        severity: input.run.severity,
        summary: input.run.summary,
        source: input.run.runSource,
        started_at: input.run.createdAt,
        finished_at: new Date().toISOString()
      })
      .select("id")
      .single();
    if (runError || !runRow) {
      throw runError ?? new Error("Run persistence failed.");
    }

    if (input.run.transcript.length) {
      const { error } = await supabase.from("run_turns").insert(
        input.run.transcript.map((turn) => ({
          run_id: runRow.id,
          turn_index: turn.index,
          role: turn.role,
          message: turn.message,
          time_in_call_secs: turn.timeInCallSecs ?? null,
          tool_calls: turn.toolCalls ?? [],
          tool_results: turn.toolResults ?? []
        }))
      );
      if (error) {
        throw error;
      }
    }

    if (input.run.criteria.length) {
      const { error } = await supabase.from("run_results").insert(
        input.run.criteria.map((criterion) => ({
          run_id: runRow.id,
          criteria_key: criterion.id,
          label: criterion.label,
          passed: criterion.passed,
          rationale: criterion.rationale,
          raw: criterion
        }))
      );
      if (error) {
        throw error;
      }
    }

    let failureId: string | null = null;
    if (input.failure) {
      const { data, error } = await supabase
        .from("failures")
        .insert({
          run_id: runRow.id,
          requirement_key: input.failure.requirementId,
          scenario_key: input.failure.scenarioId,
          severity: input.failure.severity,
          title: input.failure.title,
          evidence: input.failure.evidence,
          reproducibility: {
            confidence: input.failure.confidence,
            originalTurnCount: input.failure.originalTurnCount,
            minimizedTurnCount: input.failure.minimizedTurnCount,
            reproductionCommand: input.failure.reproductionCommand
          }
        })
        .select("id")
        .single();
      if (error || !data) {
        throw error ?? new Error("Failure persistence failed.");
      }
      failureId = data.id;
    }

    return {
      projectId: project.projectId,
      specDocumentId: spec.id,
      runId: runRow.id,
      failureId
    };
  } catch (error) {
    console.error("live persistence failed", error instanceof Error ? error.message : error);
    return null;
  }
}

export async function persistAudioArtifact(input: PersistAudioInput) {
  try {
    const supabase = createServiceSupabase();
    const project = await ensureLiveProject(input.userId);
    const buffer = Buffer.isBuffer(input.bytes) ? input.bytes : Buffer.from(new Uint8Array(input.bytes));
    const hash = sha256(buffer);
    const extension = input.mimeType.includes("mpeg") || input.mimeType.includes("mp3") ? "mp3" : "bin";
    const storagePath = `${project.projectId}/${input.runId ?? "probe"}/${hash}.${extension}`;
    const { error: uploadError } = await supabase.storage.from("audio").upload(storagePath, buffer, {
      contentType: input.mimeType,
      upsert: true
    });
    if (uploadError) {
      throw uploadError;
    }
    const { data, error } = await supabase
      .from("artifacts")
      .insert({
        project_id: project.projectId,
        run_id: input.runId ?? null,
        kind: "audio",
        bucket: "audio",
        storage_path: storagePath,
        mime_type: input.mimeType,
        sha256: hash,
        metadata: { source: input.source }
      })
      .select("id, storage_path")
      .single();
    if (error || !data) {
      throw error ?? new Error("Audio artifact persistence failed.");
    }
    return { id: data.id as string, storagePath: data.storage_path as string, sha256: hash };
  } catch (error) {
    console.error("audio persistence failed", error instanceof Error ? error.message : error);
    return null;
  }
}

export async function persistFixExport(input: { userId: string; markdown: string; failureIds?: string[] }) {
  try {
    const supabase = createServiceSupabase();
    const project = await ensureLiveProject(input.userId);
    const { data, error } = await supabase
      .from("fix_exports")
      .insert({
        project_id: project.projectId,
        markdown: input.markdown,
        source_failure_ids: input.failureIds ?? []
      })
      .select("id")
      .single();
    if (error || !data) {
      throw error ?? new Error("Fix export persistence failed.");
    }
    return { id: data.id as string, projectId: project.projectId };
  } catch (error) {
    console.error("fix export persistence failed", error instanceof Error ? error.message : error);
    return null;
  }
}

async function ensureLiveProject(userId: string): Promise<{ organizationId: string; projectId: string }> {
  const supabase = createServiceSupabase();
  const { data: membership } = await supabase
    .from("memberships")
    .select("organization_id")
    .eq("user_id", userId)
    .limit(1)
    .maybeSingle();

  let organizationId = membership?.organization_id as string | undefined;
  if (!organizationId) {
    const { data: org, error: orgError } = await supabase
      .from("organizations")
      .insert({ name: "VoiceGauntlet Workspace" })
      .select("id")
      .single();
    if (orgError || !org) {
      throw orgError ?? new Error("Organization creation failed.");
    }
    organizationId = org.id as string;
    const { error: membershipError } = await supabase
      .from("memberships")
      .insert({ organization_id: organizationId, user_id: userId, role: "owner" });
    if (membershipError) {
      throw membershipError;
    }
  }

  const { data: existing } = await supabase
    .from("projects")
    .select("id")
    .eq("organization_id", organizationId)
    .eq("slug", "voicegauntlet-live")
    .maybeSingle();
  if (existing?.id) {
    return { organizationId, projectId: existing.id as string };
  }

  const { data: project, error: projectError } = await supabase
    .from("projects")
    .insert({
      organization_id: organizationId,
      name: "VoiceGauntlet Live",
      slug: "voicegauntlet-live",
      site_url: process.env.NEXT_PUBLIC_SITE_URL ?? null
    })
    .select("id")
    .single();
  if (projectError || !project) {
    throw projectError ?? new Error("Project creation failed.");
  }
  return { organizationId, projectId: project.id as string };
}

function sha256(input: string | Buffer) {
  return createHash("sha256").update(input).digest("hex");
}

function toPostgresInteger(value: number) {
  const max = 2_147_483_647;
  return Math.abs(Math.trunc(value)) % max;
}
