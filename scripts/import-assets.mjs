#!/usr/bin/env node
import { mkdir, readFile, writeFile, rm } from "node:fs/promises";
import { existsSync } from "node:fs";
import { join, relative } from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = fileURLToPath(new URL("../", import.meta.url));

if (process.env.BROS_ALLOW_ASSET_IMPORT !== "1") {
  console.error("Asset import is maintainer-only. Re-run with BROS_ALLOW_ASSET_IMPORT=1 under an approved asset import task.");
  process.exit(1);
}

const roots = {
  agents: [process.env.BROS_IMPORT_AGENTS_SOURCE, "assets/opencode/agents"],
  commands: [process.env.BROS_IMPORT_COMMANDS_SOURCE, "assets/opencode/commands"],
  skills: [process.env.BROS_IMPORT_SKILLS_SOURCE, "assets/opencode/skills"],
  docs: [process.env.BROS_IMPORT_DOCS_SOURCE, "assets/opencode/docs"],
  templates: [process.env.BROS_IMPORT_TEMPLATES_SOURCE, "assets/opencode/templates"],
};

const sourceRefs = {
  agents: "opencode-agent",
  commands: "opencode-command",
  skills: "opencode-skill",
  docs: "opencode-doc",
  templates: "opencode-template",
};

function displaySource(area, sourceRoot, sourcePath) {
  if (!sourceRoot || !sourcePath) return sourceRefs[area] ?? `opencode-${area}`;
  return `${area}/${relative(sourceRoot, sourcePath).replaceAll("\\", "/")}`;
}

const forbiddenNames = new Set([
  ".env",
  ".env.local",
  ".env.production",
  ".env.development",
  "package-lock.json",
  "npm-debug.log",
  "opencode.jsonc",
]);

const forbiddenParts = new Set(["node_modules", ".git", ".cache", "cache", "logs", "log"]);

const secretPatterns = [
  /api[_-]?key\s*[:=]\s*['"][^'"]{8,}/i,
  /authorization\s*[:=]\s*['"]?bearer\s+[a-z0-9._-]{8,}/i,
  /-----BEGIN (?:RSA |OPENSSH |EC |DSA )?PRIVATE KEY-----/,
  /(?:token|secret|password)\s*[:=]\s*['"][^'"]{8,}/i,
  /sk-[A-Za-z0-9]{20,}/,
];

async function listFiles(dir) {
  const { readdir } = await import("node:fs/promises");
  const out = [];
  async function walk(current) {
    for (const entry of await readdir(current, { withFileTypes: true })) {
      const path = join(current, entry.name);
      if (entry.isDirectory()) await walk(path);
      else if (entry.isFile()) out.push(path);
    }
  }
  await walk(dir);
  return out.sort((a, b) => a.localeCompare(b));
}

function safeReason(sourcePath, text) {
  const parts = sourcePath.split("/").map((part) => part.toLowerCase());
  const name = parts.at(-1);
  if (forbiddenNames.has(name) || parts.some((part) => forbiddenParts.has(part))) return "forbidden-name-or-cache-log-artifact";
  if (text !== undefined && secretPatterns.some((pattern) => pattern.test(text))) return "secret-like-pattern-detected";
  return undefined;
}

async function writeJson(path, value) {
  await writeFile(join(repoRoot, path), `${JSON.stringify(value, null, 2)}\n`);
}

const counts = Object.fromEntries(Object.keys(roots).map((area) => [area, { candidates: 0, imported: 0, skipped: 0 }]));
const entries = [];
const skipped = [];

for (const [area, [sourceRoot, destinationRoot]] of Object.entries(roots)) {
  await mkdir(join(repoRoot, destinationRoot), { recursive: true });
  if (!sourceRoot || !existsSync(sourceRoot)) {
    counts[area].skipped += 1;
    skipped.push({ area, source: sourceRefs[area] ?? `opencode-${area}`, reason: "approved-source-directory-missing" });
    continue;
  }

  for (const sourcePath of await listFiles(sourceRoot)) {
    counts[area].candidates += 1;
    const rel = relative(sourceRoot, sourcePath);
    const data = await readFile(sourcePath);
    let text;
    try {
      text = data.toString("utf8");
    } catch {
      text = undefined;
    }

    const reason = safeReason(sourcePath, text);
    if (reason) {
      counts[area].skipped += 1;
      skipped.push({ area, source: displaySource(area, sourceRoot, sourcePath), reason });
      continue;
    }

    const destinationPath = join(repoRoot, destinationRoot, rel);
    await mkdir(join(destinationPath, ".."), { recursive: true });
    await writeFile(destinationPath, data);
    counts[area].imported += 1;
    entries.push({ area, path: join(destinationRoot, rel).replaceAll("\\", "/"), sourceRef: sourceRefs[area] ?? `opencode-${area}` });
  }
}

entries.sort((a, b) => `${a.area}:${a.path}`.localeCompare(`${b.area}:${b.path}`));

const generatedAt = new Date().toISOString().replace(/\.\d{3}Z$/, "Z");
await writeJson("assets/manifest.json", {
  name: "bros-harness",
  generatedAt,
  importPolicy: "Sanitized import from approved OpenCode asset directories only; raw opencode.jsonc and secret-like/cache/log artifacts excluded.",
  counts,
  entries,
});

for (const area of Object.keys(roots)) {
  await writeJson(`assets/${area}.manifest.json`, { area, counts: counts[area], entries: entries.filter((entry) => entry.area === area) });
}

const totals = Object.values(counts).reduce((acc, count) => ({
  candidates: acc.candidates + count.candidates,
  imported: acc.imported + count.imported,
  skipped: acc.skipped + count.skipped,
}), { candidates: 0, imported: 0, skipped: 0 });

if (skipped.length > 0) {
  const lines = [
    "# Import Report",
    "",
    "## Summary",
    "",
    `- Total source candidates: ${totals.candidates}`,
    `- Imported: ${totals.imported}`,
    `- Skipped: ${totals.skipped}`,
    "",
    "## Counts by Area",
    "",
    ...Object.entries(counts).map(([area, count]) => `- ${area}: candidates=${count.candidates}, imported=${count.imported}, skipped=${count.skipped}`),
    "",
    "## Skipped Items",
    "",
    ...skipped.map((item) => `- area: ${item.area}; source: \`${item.source}\`; reason: ${item.reason}`),
    "",
  ];
  await writeFile(join(repoRoot, "assets/import-report.md"), lines.join("\n"));
} else {
  await rm(join(repoRoot, "assets/import-report.md"), { force: true });
}

const sessionSummary = [
  "",
  "## Repair Import Summary - BUILD-BROS-OSS-001R",
  "",
  `- Updated at: ${generatedAt}`,
  "- Scope: sanitized asset import from approved OpenCode asset directories only.",
  "- Raw OpenCode config and secret-like values were not copied.",
  `- Total source candidates: ${totals.candidates}`,
  `- Imported files: ${totals.imported}`,
  `- Skipped files: ${totals.skipped}`,
  "",
  "### Counts by Area",
  ...Object.entries(counts).map(([area, count]) => `- ${area}: candidates=${count.candidates}, imported=${count.imported}, skipped=${count.skipped}`),
  "",
  "### Notes",
  "- Manifest files were regenerated from imported files.",
  "- Import report was generated only if one or more approved candidates were skipped.",
  "",
];

for (const relPath of [".bros/sessions/2026-06-03-bros-oss-build/audit-log.md", ".bros/sessions/2026-06-03-bros-oss-build/handoff.md"]) {
  const target = join(repoRoot, relPath);
  let current = "";
  try {
    current = await readFile(target, "utf8");
  } catch {
    current = `# ${relPath.split("/").at(-1).replace(".md", "")}\n`;
  }
  await writeFile(target, `${current.trimEnd()}\n${sessionSummary.join("\n")}`);
}

console.log(JSON.stringify({ counts, total: totals, skippedItems: skipped.length }, null, 2));
