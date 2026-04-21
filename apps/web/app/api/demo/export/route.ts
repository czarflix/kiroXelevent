import { demoDataset, exportKiroFixTasks } from "@voicegauntlet/core";

export function GET() {
  return buildExportResponse();
}

export function POST() {
  return buildExportResponse();
}

function buildExportResponse() {
  const markdown = exportKiroFixTasks(demoDataset.failures, demoDataset.requirements, demoDataset.scenarios);
  return new Response(markdown, {
    headers: {
      "Content-Type": "text/markdown; charset=utf-8",
      "Content-Disposition": "inline; filename=tasks.md"
    }
  });
}
