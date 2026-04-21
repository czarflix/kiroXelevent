#!/usr/bin/env node
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";

const patterns = [
  "sk_[A-Za-z0-9]{20,}",
  "sk-proj-[A-Za-z0-9_-]{20,}",
  "gsk_[A-Za-z0-9_-]{20,}",
  "sbp_[A-Za-z0-9]{20,}",
  "sb_publishable_[A-Za-z0-9_-]{20,}",
  "sb_secret_[A-Za-z0-9_-]{20,}",
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9\\.[A-Za-z0-9_-]{20,}\\.[A-Za-z0-9_-]{20,}",
  "service_role",
  "postgresql://postgres:"
];

const allowed = new Set([".env.example", "README.md", "scripts/security-scan.mjs"]);
const files = execFileSync("git", ["ls-files", "--others", "--cached", "--exclude-standard"], {
  encoding: "utf8"
})
  .split("\n")
  .filter(Boolean)
  .filter((file) => !allowed.has(file));

let failed = false;
for (const file of files) {
  let text = "";
  try {
    const buffer = readFileSync(file);
    if (buffer.includes(0)) {
      continue;
    }
    text = buffer.toString("utf8");
  } catch {
    continue;
  }
  for (const pattern of patterns) {
    if (new RegExp(pattern).test(text)) {
      console.error(`Potential secret matched ${pattern} in ${file}`);
      failed = true;
    }
  }
}

if (failed) {
  process.exit(1);
}

console.log("security scan passed");
