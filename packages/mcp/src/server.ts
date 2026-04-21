#!/usr/bin/env node
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import {
  demoDataset,
  evaluateTranscript,
  exportKiroFixTasks,
  generateScenarios,
  parseKiroRequirements,
  shrinkTranscript
} from "@voicegauntlet/core";

const server = new McpServer({
  name: "voicegauntlet",
  version: "0.1.0"
});

server.tool(
  "voicegauntlet.generate_suite_from_spec",
  {
    markdown: z.string().describe("Kiro requirements.md contents"),
    sourcePath: z.string().default(".kiro/specs/voicegauntlet/requirements.md"),
    maxPerRequirement: z.number().int().min(1).max(4).default(3)
  },
  async ({ markdown, sourcePath, maxPerRequirement }) => {
    const requirements = parseKiroRequirements(markdown, sourcePath);
    const scenarios = generateScenarios(requirements, maxPerRequirement);
    return {
      content: [
        {
          type: "text",
          text: JSON.stringify({ requirements, scenarios }, null, 2)
        }
      ]
    };
  }
);

server.tool(
  "voicegauntlet.run_smoke_suite",
  {
    scenarioId: z.string().optional()
  },
  async ({ scenarioId }) => {
    const scenario = demoDataset.scenarios.find((item) => item.id === scenarioId) ?? demoDataset.scenarios[0]!;
    const run = demoDataset.runs.find((item) => item.scenarioId === scenario.id) ?? evaluateTranscript(scenario, demoDataset.runs[0]!.transcript);
    return { content: [{ type: "text", text: JSON.stringify(run, null, 2) }] };
  }
);

server.tool(
  "voicegauntlet.shrink_failure",
  {
    runId: z.string().optional()
  },
  async ({ runId }) => {
    const run = demoDataset.runs.find((item) => item.id === runId) ?? demoDataset.runs[0]!;
    const failure = shrinkTranscript(run);
    return { content: [{ type: "text", text: JSON.stringify(failure, null, 2) }] };
  }
);

server.tool(
  "voicegauntlet.export_fix_tasks",
  {
    failedOnly: z.boolean().default(true)
  },
  async () => {
    const markdown = exportKiroFixTasks(demoDataset.failures, demoDataset.requirements, demoDataset.scenarios);
    return { content: [{ type: "text", text: markdown }] };
  }
);

server.tool(
  "voicegauntlet.get_run",
  {
    runId: z.string()
  },
  async ({ runId }) => {
    const run = demoDataset.runs.find((item) => item.id === runId);
    return {
      content: [
        {
          type: "text",
          text: run ? JSON.stringify(run, null, 2) : `Run not found: ${runId}`
        }
      ]
    };
  }
);

const transport = new StdioServerTransport();
await server.connect(transport);
