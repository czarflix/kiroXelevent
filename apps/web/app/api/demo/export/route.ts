import { demoDataset, exportKiroFixTasks } from "@voicegauntlet/core";

export function GET() {
  const markdown = exportKiroFixTasks(demoDataset.failures, demoDataset.requirements, demoDataset.scenarios);
  return new Response(markdown, {
    headers: {
      "Content-Type": "text/markdown; charset=utf-8",
      "Content-Disposition": "inline; filename=tasks.md"
    }
  });
}
