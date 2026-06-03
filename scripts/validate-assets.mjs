#!/usr/bin/env node
import { access, readdir, readFile } from "node:fs/promises";
import { join } from "node:path";
import {
  assertNoPackagedAssetInvariantErrors,
  validateAgentAsset,
  validateCommandAsset,
} from "../src/security-invariants.mjs";

const requiredPaths = [
  "assets/opencode/agents",
  "assets/opencode/commands",
  "assets/opencode/skills",
  "assets/opencode/templates",
  "assets/opencode/docs",
  "assets/manifest.json",
  "assets/skills.lifecycle.json"
];

const validAreas = ["agents", "commands", "skills", "templates", "docs"];
const pathPrefixes = {
  agents: "assets/opencode/agents/",
  commands: "assets/opencode/commands/",
  skills: "assets/opencode/skills/",
  templates: "assets/opencode/templates/",
  docs: "assets/opencode/docs/"
};

function isObject(value) {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

async function* walk(dir) {
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) yield* walk(path);
    else if (entry.isFile()) yield path;
  }
}

function parseYamlScalar(value) {
  const trimmed = value.trim();
  if (trimmed === "") return "";
  if (trimmed === "true") return true;
  if (trimmed === "false") return false;
  if ((trimmed.startsWith('"') && trimmed.endsWith('"')) || (trimmed.startsWith("'") && trimmed.endsWith("'"))) {
    return trimmed.slice(1, -1);
  }
  return trimmed;
}

function parseYamlKeyValue(line) {
  let quote = "";
  for (let index = 0; index < line.length; index += 1) {
    const char = line[index];
    if ((char === '"' || char === "'") && line[index - 1] !== "\\") {
      quote = quote === char ? "" : quote || char;
      continue;
    }
    if (char === ":" && !quote) return [line.slice(0, index), line.slice(index + 1)];
  }
  return null;
}

function parseSimpleYamlObject(yaml) {
  const root = {};
  const stack = [{ indent: -1, value: root }];
  for (const rawLine of yaml.split("\n")) {
    if (!rawLine.trim() || rawLine.trim().startsWith("#")) continue;
    const indent = rawLine.match(/^ */)?.[0].length ?? 0;
    const parsedLine = parseYamlKeyValue(rawLine.trim());
    if (!parsedLine) continue;
    const key = parsedLine[0].trim().replace(/^['"]|['"]$/g, "");
    const rawValue = parsedLine[1]?.trimStart() ?? "";
    while (stack.length > 1 && indent <= stack[stack.length - 1].indent) stack.pop();
    const parent = stack[stack.length - 1].value;
    if (rawValue === "") {
      parent[key] = {};
      stack.push({ indent, value: parent[key] });
    } else {
      parent[key] = parseYamlScalar(rawValue);
    }
  }
  return root;
}

function parseMarkdownFrontmatter(markdown) {
  const match = markdown.match(/^---\n([\s\S]*?)\n---\n?([\s\S]*)$/);
  if (!match) return { frontmatter: {}, body: markdown };
  return { frontmatter: parseSimpleYamlObject(match[1]), body: match[2] };
}

function validateManifestShape(manifest) {
  const errors = [];
  if (!isObject(manifest)) return ["manifest must be an object"];
  if (manifest.name !== "bros-harness") errors.push("manifest.name must be bros-harness");
  if (typeof manifest.generatedAt !== "string" || Number.isNaN(Date.parse(manifest.generatedAt))) {
    errors.push("manifest.generatedAt must be an ISO-compatible timestamp string");
  }
  if (typeof manifest.importPolicy !== "string" || manifest.importPolicy.trim() === "") {
    errors.push("manifest.importPolicy must be a non-empty string");
  }
  if (!isObject(manifest.counts)) errors.push("manifest.counts must be an object");
  if (!Array.isArray(manifest.entries)) {
    errors.push("manifest.entries must be an array");
    return errors;
  }

  const countsByArea = new Map();
  const paths = new Set();
  for (const [index, entry] of manifest.entries.entries()) {
    const label = `manifest.entries[${index}]`;
    if (!isObject(entry)) {
      errors.push(`${label} must be an object`);
      continue;
    }
    if ("source" in entry) errors.push(`${label}.source is deprecated; use sourceRef`);
    if (typeof entry.sourceRef !== "string" || entry.sourceRef.trim() === "") {
      errors.push(`${label}.sourceRef must be a non-empty string`);
    }
    if (typeof entry.path !== "string" || entry.path.trim() === "") {
      errors.push(`${label}.path must be a non-empty string`);
    } else {
      if (entry.path.startsWith("/") || entry.path.includes("..")) {
        errors.push(`${label}.path must be a repository-relative asset path`);
      }
      if (paths.has(entry.path)) errors.push(`${label}.path duplicates another manifest entry`);
      paths.add(entry.path);
    }
    if (typeof entry.area !== "string" || !validAreas.includes(entry.area)) {
      errors.push(`${label}.area must be one of ${validAreas.join(", ")}`);
      continue;
    }
    countsByArea.set(entry.area, (countsByArea.get(entry.area) ?? 0) + 1);
    if (typeof entry.path === "string" && !entry.path.startsWith(pathPrefixes[entry.area])) {
      errors.push(`${label}.path must start with ${pathPrefixes[entry.area]}`);
    }
  }

  if (isObject(manifest.counts)) {
    for (const area of validAreas) {
      const count = manifest.counts[area];
      if (!isObject(count)) {
        errors.push(`manifest.counts.${area} must be an object`);
        continue;
      }
      for (const field of ["candidates", "imported", "skipped"]) {
        if (!Number.isInteger(count[field]) || count[field] < 0) {
          errors.push(`manifest.counts.${area}.${field} must be a non-negative integer`);
        }
      }
      if (Number.isInteger(count.imported) && count.imported !== (countsByArea.get(area) ?? 0)) {
        errors.push(`manifest.counts.${area}.imported must equal entries for ${area}`);
      }
    }
  }

  return errors;
}

async function validateSkippedImportReport(manifest) {
  const skipped = Object.values(manifest.counts ?? {}).reduce((total, count) => total + (count?.skipped ?? 0), 0);
  if (skipped === 0) return [];
  const errors = [];
  let report = "";
  try {
    report = await readFile("assets/import-report.md", "utf8");
  } catch {
    return ["assets/import-report.md must exist when manifest counts include skipped items"];
  }
  if (!report.includes("## Skipped Items")) errors.push("assets/import-report.md must list skipped items");
  const skippedLines = report.split("\n").filter((line) => line.startsWith("- area: "));
  if (skippedLines.length !== skipped) {
    errors.push(`assets/import-report.md skipped item count (${skippedLines.length}) must equal manifest skipped count (${skipped})`);
  }
  for (const line of skippedLines) {
    const source = line.match(/source: `([^`]+)`/)?.[1];
    if (!source) {
      errors.push(`assets/import-report.md skipped line is missing source: ${line}`);
      continue;
    }
    if (manifest.entries.some((entry) => entry.path.endsWith(source.replace(/^skills\//, "opencode/skills/")))) {
      errors.push(`skipped source also appears imported in manifest: ${source}`);
    }
  }
  return errors;
}

function validateSkillsLifecycle(manifest, lifecycle, importReport) {
  const errors = [];
  const requiredStates = ["active", "deprecated", "skipped", "redacted", "blocked"];
  const allowedStatuses = new Set(requiredStates);
  const packagedSkillPaths = new Set(
    manifest.entries
      .filter((entry) => entry.area === "skills" && typeof entry.path === "string")
      .map((entry) => entry.path),
  );
  const skippedSkillCount = manifest.counts?.skills?.skipped ?? 0;
  const packagedSkillNames = new Set(
    manifest.entries
      .filter((entry) => entry.area === "skills" && typeof entry.path === "string" && entry.path.endsWith("/SKILL.md"))
      .map((entry) => entry.path.match(/^assets\/opencode\/skills\/([^/]+)\/SKILL\.md$/)?.[1])
      .filter(Boolean),
  );

  if (!isObject(lifecycle)) return ["assets/skills.lifecycle.json must be an object"];
  if (lifecycle.area !== "skills") errors.push("assets/skills.lifecycle.json.area must be skills");
  if (!Array.isArray(lifecycle.allowedStatuses)) {
    errors.push("assets/skills.lifecycle.json.allowedStatuses must be an array");
  } else {
    for (const state of requiredStates) {
      if (!lifecycle.allowedStatuses.includes(state)) {
        errors.push(`assets/skills.lifecycle.json.allowedStatuses must include ${state}`);
      }
    }
  }
  if (!isObject(lifecycle.statusDefinitions)) {
    errors.push("assets/skills.lifecycle.json.statusDefinitions must be an object");
  } else {
    for (const state of requiredStates) {
      if (typeof lifecycle.statusDefinitions[state] !== "string" || lifecycle.statusDefinitions[state].trim() === "") {
        errors.push(`assets/skills.lifecycle.json.statusDefinitions.${state} must be a non-empty string`);
      }
    }
  }
  if (lifecycle.packagedDefaultStatus !== "active") {
    errors.push("assets/skills.lifecycle.json.packagedDefaultStatus must be active");
  }
  if (!isObject(lifecycle.releaseGate) || lifecycle.releaseGate.validateScript !== "npm run validate") {
    errors.push("assets/skills.lifecycle.json.releaseGate.validateScript must be npm run validate");
  }
  if (!isObject(lifecycle.summary)) {
    errors.push("assets/skills.lifecycle.json.summary must be an object");
  } else {
    if (lifecycle.summary.packagedActive !== manifest.counts?.skills?.imported) {
      errors.push("assets/skills.lifecycle.json.summary.packagedActive must equal manifest counts.skills.imported");
    }
    if (lifecycle.summary.skippedReviewRequired !== skippedSkillCount) {
      errors.push("assets/skills.lifecycle.json.summary.skippedReviewRequired must equal manifest counts.skills.skipped");
    }
  }

  const skippedEntries = Array.isArray(lifecycle.skippedSources) ? lifecycle.skippedSources : null;
  if (!skippedEntries) {
    errors.push("assets/skills.lifecycle.json.skippedSources must be an array");
  } else if (skippedEntries.length !== skippedSkillCount) {
    errors.push("assets/skills.lifecycle.json.skippedSources length must equal manifest counts.skills.skipped");
  }

  const reportSkippedSources = new Set(
    importReport
      .split("\n")
      .filter((line) => line.startsWith("- area: skills;"))
      .map((line) => line.match(/source: `([^`]+)`/)?.[1])
      .filter(Boolean),
  );

  for (const [index, entry] of (skippedEntries ?? []).entries()) {
    const label = `assets/skills.lifecycle.json.skippedSources[${index}]`;
    if (!isObject(entry)) {
      errors.push(`${label} must be an object`);
      continue;
    }
    if (typeof entry.source !== "string" || !entry.source.startsWith("skills/") || entry.source.includes("..")) {
      errors.push(`${label}.source must be a repository-relative skills/* source reference`);
    } else {
      if (!reportSkippedSources.has(entry.source)) {
        errors.push(`${label}.source must appear in assets/import-report.md skipped skill items`);
      }
      const packagedPath = `assets/opencode/${entry.source}`;
      if (packagedSkillPaths.has(packagedPath)) {
        errors.push(`${label}.source must not also be packaged: ${packagedPath}`);
      }
      const blockedRoot = `assets/opencode/${entry.source.replace(/\/SKILL\.md$/, "")}/`;
      for (const packagedPathCandidate of packagedSkillPaths) {
        if (packagedPathCandidate.startsWith(blockedRoot)) {
          errors.push(`${label}.blocked root must not contain packaged manifest entries: ${packagedPathCandidate}`);
        }
      }
    }
    if (entry.lifecycleStatus !== "blocked") {
      errors.push(`${label}.lifecycleStatus must be blocked until sanitized review approves a different state`);
    }
    if (entry.importDisposition !== "skipped") {
      errors.push(`${label}.importDisposition must be skipped`);
    }
    if (entry.reviewStatus !== "required") {
      errors.push(`${label}.reviewStatus must be required`);
    }
    if (typeof entry.reason !== "string" || entry.reason.trim() === "") {
      errors.push(`${label}.reason must be a non-empty string`);
    }
  }

  const overrides = Array.isArray(lifecycle.packagedOverrides) ? lifecycle.packagedOverrides : [];
  for (const [index, entry] of overrides.entries()) {
    const label = `assets/skills.lifecycle.json.packagedOverrides[${index}]`;
    if (!isObject(entry)) {
      errors.push(`${label} must be an object`);
      continue;
    }
    if (typeof entry.path !== "string" || !packagedSkillPaths.has(entry.path)) {
      errors.push(`${label}.path must reference a packaged skill manifest entry`);
    }
    if (!allowedStatuses.has(entry.lifecycleStatus)) {
      errors.push(`${label}.lifecycleStatus must be one of ${requiredStates.join(", ")}`);
    }
    if (["skipped", "blocked"].includes(entry.lifecycleStatus)) {
      errors.push(`${label}.lifecycleStatus must not be ${entry.lifecycleStatus} for packaged skill assets`);
    }
    if (entry.lifecycleStatus === "redacted" && entry.redactionReview !== "approved") {
      errors.push(`${label}.redactionReview must be approved for redacted packaged skill assets`);
    }
  }

  const profileErrors = validateRoleSkillProfiles(lifecycle.roleSkillProfiles, packagedSkillNames);
  errors.push(...profileErrors);
  errors.push(...validateOverlapMaintenanceScoring(lifecycle.overlapMaintenanceScoring));

  return errors;
}

function validateRoleSkillProfiles(roleSkillProfiles, packagedSkillNames) {
  const errors = [];
  const requiredProfiles = ["orchestrator-plan", "explorer", "build", "qa", "security", "ops", "docs", "ui-design"];
  if (!isObject(roleSkillProfiles)) return ["assets/skills.lifecycle.json.roleSkillProfiles must be an object"];
  if (typeof roleSkillProfiles.policy !== "string" || roleSkillProfiles.policy.trim() === "") {
    errors.push("assets/skills.lifecycle.json.roleSkillProfiles.policy must be a non-empty string");
  }
  if (!isObject(roleSkillProfiles.profiles)) {
    errors.push("assets/skills.lifecycle.json.roleSkillProfiles.profiles must be an object");
    return errors;
  }

  for (const profileName of requiredProfiles) {
    const profile = roleSkillProfiles.profiles[profileName];
    const label = `assets/skills.lifecycle.json.roleSkillProfiles.profiles.${profileName}`;
    if (!isObject(profile)) {
      errors.push(`${label} must be an object`);
      continue;
    }
    for (const field of ["roles", "defaultRecommended", "evidenceTriggered", "avoidByDefault"]) {
      if (!Array.isArray(profile[field])) errors.push(`${label}.${field} must be an array`);
    }
    if (Array.isArray(profile.defaultRecommended) && profile.defaultRecommended.length > 4) {
      errors.push(`${label}.defaultRecommended must include no more than 4 skills`);
    }
    if (typeof profile.broadCapabilityBias !== "string" || profile.broadCapabilityBias.trim() === "") {
      errors.push(`${label}.broadCapabilityBias must be a non-empty string`);
    }
    for (const field of ["defaultRecommended", "evidenceTriggered"]) {
      if (!Array.isArray(profile[field])) continue;
      const seen = new Set();
      for (const skillName of profile[field]) {
        if (typeof skillName !== "string" || skillName.trim() === "") {
          errors.push(`${label}.${field} entries must be non-empty strings`);
          continue;
        }
        if (seen.has(skillName)) errors.push(`${label}.${field} duplicates ${skillName}`);
        seen.add(skillName);
        if (!packagedSkillNames.has(skillName)) {
          errors.push(`${label}.${field} references a skill without packaged SKILL.md: ${skillName}`);
        }
      }
    }
  }

  return errors;
}

function validateOverlapMaintenanceScoring(scoring) {
  const errors = [];
  if (!isObject(scoring)) return ["assets/skills.lifecycle.json.overlapMaintenanceScoring must be an object"];
  if (scoring.status !== "release-gated-advisory") {
    errors.push("assets/skills.lifecycle.json.overlapMaintenanceScoring.status must be release-gated-advisory");
  }
  for (const field of ["policy", "reviewCadence", "validationHook"]) {
    if (typeof scoring[field] !== "string" || scoring[field].trim() === "") {
      errors.push(`assets/skills.lifecycle.json.overlapMaintenanceScoring.${field} must be a non-empty string`);
    }
  }
  if (!isObject(scoring.scale)) {
    errors.push("assets/skills.lifecycle.json.overlapMaintenanceScoring.scale must be an object");
  } else {
    for (const key of ["0", "1", "2", "3"]) {
      if (typeof scoring.scale[key] !== "string" || scoring.scale[key].trim() === "") {
        errors.push(`assets/skills.lifecycle.json.overlapMaintenanceScoring.scale.${key} must be a non-empty string`);
      }
    }
  }
  if (!isObject(scoring.fields)) {
    errors.push("assets/skills.lifecycle.json.overlapMaintenanceScoring.fields must be an object");
  } else {
    for (const field of ["capabilityOverlap", "specificityRisk", "maintenanceBurden", "defaultProfileUse", "evidenceTriggeredUse", "recommendedAction"]) {
      if (typeof scoring.fields[field] !== "string" || scoring.fields[field].trim() === "") {
        errors.push(`assets/skills.lifecycle.json.overlapMaintenanceScoring.fields.${field} must be a non-empty string`);
      }
    }
  }
  return errors;
}

async function validateBlockedSkillRootsAbsent(lifecycle) {
  const errors = [];
  const skippedEntries = Array.isArray(lifecycle.skippedSources) ? lifecycle.skippedSources : [];
  const blockedRoots = skippedEntries
    .filter((entry) => entry?.lifecycleStatus === "blocked" && typeof entry.source === "string")
    .map((entry) => `assets/opencode/${entry.source.replace(/\/SKILL\.md$/, "")}/`);

  if (blockedRoots.length === 0) return errors;
  for await (const path of walk("assets/opencode/skills")) {
    for (const blockedRoot of blockedRoots) {
      if (path.startsWith(blockedRoot)) errors.push(`blocked skipped skill root contains packaged file: ${path}`);
    }
  }
  return errors;
}

async function validatePackagedPromptInvariants() {
  const errors = [];
  for await (const path of walk("assets/opencode/agents")) {
    if (!path.endsWith(".md") || path.endsWith("README.md")) continue;
    const markdown = await readFile(path, "utf8");
    const { frontmatter, body } = parseMarkdownFrontmatter(markdown);
    errors.push(...validateAgentAsset({ path, frontmatter, prompt: body }));
  }
  for await (const path of walk("assets/opencode/commands")) {
    if (!path.endsWith(".md") || path.endsWith("README.md")) continue;
    const markdown = await readFile(path, "utf8");
    errors.push(...validateCommandAsset({ path, markdown }));
  }
  assertNoPackagedAssetInvariantErrors(errors);
}

for (const path of requiredPaths) {
  await access(path);
}

const manifest = JSON.parse(await readFile("assets/manifest.json", "utf8"));
const skillsLifecycle = JSON.parse(await readFile("assets/skills.lifecycle.json", "utf8"));
let importReport = "";
try {
  importReport = await readFile("assets/import-report.md", "utf8");
} catch {
  importReport = "";
}
const errors = [
  ...validateManifestShape(manifest),
  ...(await validateSkippedImportReport(manifest)),
  ...validateSkillsLifecycle(manifest, skillsLifecycle, importReport),
  ...(await validateBlockedSkillRootsAbsent(skillsLifecycle)),
];
if (errors.length > 0) {
  throw new Error(`Invalid asset manifest shape:\n- ${errors.join("\n- ")}`);
}

for (const entry of manifest.entries) {
  await access(entry.path);
}

await validatePackagedPromptInvariants();

console.log(`Validated ${manifest.entries.length} manifest entries.`);
