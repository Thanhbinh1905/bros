#!/usr/bin/env node
import { execFile } from "node:child_process";
import { readFile } from "node:fs/promises";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);

const forbiddenPatterns = [
  /^\.bros(?:\/|$)/,
  /^\.git(?:\/|$)/,
  /^\.github(?:\/|$)/,
  /^\.opencode(?:\/|$)/,
  /^opencode\.jsonc?$/,
  /^(?:\.env|\.env\..*)$/,
  /^.*\.log$/,
  /^scripts\/import-assets\.mjs$/,
  /^assets\/import-report\.md$/,
  /^packages\//,
  /(?:^|\/)(?:id_rsa|id_ed25519|\.npmrc|\.netrc)$/,
  /(?:secret|credential|token|provider-key|private-key)/i,
];

const allowedSecretNamedFiles = new Set([
  "scripts/verify-no-secrets.mjs",
]);

const requiredFiles = [
  "package.json",
  "bin/bros.mjs",
  "src/plugin.mjs",
  "assets/manifest.json",
  "scripts/verify-package-contents.mjs",
  "scripts/verify-no-secrets.mjs",
  "README.md",
  "docs/configuration.md",
  "LICENSE",
];

function parsePackJson(stdout) {
  const parsed = JSON.parse(stdout);
  if (!Array.isArray(parsed) || !parsed[0] || !Array.isArray(parsed[0].files)) {
    throw new Error("npm pack --dry-run --json returned an unexpected shape");
  }
  return parsed[0].files.map((file) => file.path).sort();
}

const { stdout } = await execFileAsync("npm", ["pack", "--dry-run", "--json"], {
  maxBuffer: 1024 * 1024 * 10,
});
const files = parsePackJson(stdout);
const fileSet = new Set(files);
const skillsLifecycle = JSON.parse(await readFile("assets/skills.lifecycle.json", "utf8"));
const blockedSkillRootPatterns = (skillsLifecycle.skippedSources ?? [])
  .filter((entry) => entry?.lifecycleStatus === "blocked" && typeof entry.source === "string")
  .map((entry) => new RegExp(`^assets/opencode/${entry.source.replace(/\/SKILL\.md$/, "").replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}/`));

const missing = requiredFiles.filter((file) => !fileSet.has(file));
const forbidden = files.filter(
  (file) => !allowedSecretNamedFiles.has(file) && [
    ...forbiddenPatterns,
    ...blockedSkillRootPatterns,
  ].some((pattern) => pattern.test(file)),
);

if (missing.length > 0 || forbidden.length > 0) {
  const lines = [];
  if (missing.length > 0) lines.push(`Missing required package files:\n- ${missing.join("\n- ")}`);
  if (forbidden.length > 0) lines.push(`Forbidden or review-required package files:\n- ${forbidden.join("\n- ")}`);
  throw new Error(lines.join("\n"));
}

console.log(`Verified npm pack dry-run contents: ${files.length} files, no forbidden local session traces/configs/import tooling/secret-like paths.`);
