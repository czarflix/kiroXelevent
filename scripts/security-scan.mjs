#!/usr/bin/env node
import { execFileSync } from "node:child_process";

const patterns = [
  "sk_[A-Za-z0-9]{20,}",
  "sk-proj-[A-Za-z0-9_-]{20,}",
  "sbp_[A-Za-z0-9]{20,}",
  "sb_secret_[A-Za-z0-9_-]{20,}",
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
    text = execFileSync("sed", ["-n", "1,240p", file], { encoding: "utf8" });
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
