import { z } from "zod";
import type { Requirement, Scenario } from "./types";

const groqBaseUrl = "https://api.groq.com/openai/v1";
export const GROQ_DEFAULT_MODEL = "openai/gpt-oss-120b";

const RefinedScenarioSchema = z.object({
  title: z.string().min(1),
  prompt: z.string().min(1),
  expectedBehavior: z.string().min(1)
});

type FetchLike = typeof fetch;

export type GroqScenarioRefinementSource = "groq" | "cache" | "deterministic_fallback";

export type GroqScenarioRefinement = {
  scenario: Scenario;
  source: GroqScenarioRefinementSource;
  model: string;
  cached: boolean;
  warning?: string;
};

export async function refineScenariosWithGroq(params: {
  apiKey?: string;
  model?: string;
  requirements: Requirement[];
  scenarios: Scenario[];
  fetchImpl?: FetchLike;
}): Promise<{ scenarios: Scenario[]; source: GroqScenarioRefinementSource | "mixed"; warning?: string }> {
  const refined: Scenario[] = [];
  const sources = new Set<GroqScenarioRefinementSource>();
  const warnings: string[] = [];
  for (const scenario of params.scenarios) {
    const requirement = params.requirements.find((item) => item.id === scenario.requirementId);
    if (!requirement) {
      refined.push(scenario);
      sources.add("deterministic_fallback");
      warnings.push(`No requirement found for ${scenario.id}; deterministic scenario retained.`);
      continue;
    }
    const result = await refineScenarioWithGroq({
      ...(params.apiKey === undefined ? {} : { apiKey: params.apiKey }),
      ...(params.model === undefined ? {} : { model: params.model }),
      requirement,
      scenario,
      ...(params.fetchImpl === undefined ? {} : { fetchImpl: params.fetchImpl })
    });
    refined.push(result.scenario);
    sources.add(result.source);
    if (result.warning) {
      warnings.push(result.warning);
    }
  }
  const source = sources.size === 1 ? [...sources][0]! : "mixed";
  return {
    scenarios: refined,
    source,
    ...(warnings.length ? { warning: [...new Set(warnings)].join(" ") } : {})
  };
}

const scenarioCache = new Map<string, Scenario>();
let groqQueue: Promise<void> = Promise.resolve();

export function clearGroqScenarioCache(): void {
  scenarioCache.clear();
}

export async function refineScenarioWithGroq(params: {
  apiKey?: string;
  model?: string;
  requirement: Requirement;
  scenario: Scenario;
  cacheKey?: string;
  cache?: Map<string, Scenario>;
  fetchImpl?: FetchLike;
  retryDelayMs?: number;
}): Promise<GroqScenarioRefinement> {
  const model = params.model ?? GROQ_DEFAULT_MODEL;
  const fallback = fallbackRefinement(params.scenario, model, "Groq unavailable; deterministic scenario retained.");
  const cache = params.cache ?? scenarioCache;
  const cacheKey =
    params.cacheKey ??
    stableCacheKey({
      model,
      requirementId: params.requirement.id,
      requirementTitle: params.requirement.title,
      scenarioId: params.scenario.id,
      scenarioPrompt: params.scenario.prompt
    });

  const cached = cache.get(cacheKey);
  if (cached) {
    return {
      scenario: cached,
      source: "cache",
      model,
      cached: true
    };
  }

  if (!params.apiKey?.trim()) {
    return fallback;
  }

  return enqueueGroq(async () => {
    const fetcher = params.fetchImpl ?? fetch;
    for (let attempt = 0; attempt < 2; attempt += 1) {
      const response = await fetcher(`${groqBaseUrl}/chat/completions`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${params.apiKey}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          model,
          temperature: 0.2,
          response_format: { type: "json_object" },
          messages: [
            {
              role: "system",
              content:
                "You refine adversarial QA scenarios for voice-agent testing. Return compact JSON only with title, prompt, and expectedBehavior."
            },
            {
              role: "user",
              content: JSON.stringify({
                requirement: params.requirement,
                scenario: params.scenario,
                task: "Make this scenario more adversarial but realistic. Do not change ids, severity, tags, or requirement mapping."
              })
            }
          ]
        })
      });

      if (response.status === 429 && attempt === 0) {
        await delay(resolveRetryDelayMs(response, params.retryDelayMs));
        continue;
      }

      if (!response.ok) {
        return fallbackRefinement(params.scenario, model, `Groq failed with HTTP ${response.status}; deterministic scenario retained.`);
      }

      const raw = await response.json();
      const content = extractGroqContent(raw);
      if (!content) {
        return fallbackRefinement(params.scenario, model, "Groq returned no JSON content; deterministic scenario retained.");
      }

      const parsedJson = parseJsonObject(content);
      const parsed = parsedJson ? RefinedScenarioSchema.safeParse(parsedJson) : undefined;
      if (!parsed?.success) {
        return fallbackRefinement(params.scenario, model, "Groq JSON did not match scenario schema; deterministic scenario retained.");
      }

      const scenario = {
        ...params.scenario,
        title: parsed.data.title,
        prompt: parsed.data.prompt,
        expectedBehavior: parsed.data.expectedBehavior
      };
      cache.set(cacheKey, scenario);
      return {
        scenario,
        source: "groq",
        model,
        cached: false
      };
    }

    return fallbackRefinement(params.scenario, model, "Groq rate limit persisted after one retry; deterministic scenario retained.");
  });
}

function fallbackRefinement(scenario: Scenario, model: string, warning: string): GroqScenarioRefinement {
  return {
    scenario,
    source: "deterministic_fallback",
    model,
    cached: false,
    warning
  };
}

function enqueueGroq<T>(task: () => Promise<T>): Promise<T> {
  const run = groqQueue.then(task, task);
  groqQueue = run.then(
    () => undefined,
    () => undefined
  );
  return run;
}

function extractGroqContent(raw: unknown): string | undefined {
  const choices = (raw as { choices?: Array<{ message?: { content?: unknown } }> }).choices;
  const content = choices?.[0]?.message?.content;
  return typeof content === "string" ? content : undefined;
}

function parseJsonObject(content: string): unknown {
  try {
    return JSON.parse(content);
  } catch {
    return undefined;
  }
}

function resolveRetryDelayMs(response: Response, overrideMs?: number): number {
  if (overrideMs !== undefined) {
    return Math.max(0, overrideMs);
  }
  const retryAfter = response.headers.get("retry-after");
  if (!retryAfter) {
    return 500;
  }
  const seconds = Number(retryAfter);
  if (Number.isFinite(seconds)) {
    return Math.min(2_000, Math.max(0, seconds * 1_000));
  }
  const timestamp = Date.parse(retryAfter);
  if (Number.isFinite(timestamp)) {
    return Math.min(2_000, Math.max(0, timestamp - Date.now()));
  }
  return 500;
}

function delay(ms: number): Promise<void> {
  if (ms <= 0) {
    return Promise.resolve();
  }
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function stableCacheKey(value: unknown): string {
  const input = JSON.stringify(value);
  let hash = 2166136261;
  for (const char of input) {
    hash ^= char.charCodeAt(0);
    hash = Math.imul(hash, 16777619);
  }
  return `groq:${(hash >>> 0).toString(16)}`;
}
