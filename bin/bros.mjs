#!/usr/bin/env node
import { access, readFile, readdir } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { applyModelRoutingToAgents, brosConfigDefaults, loadResolvedBrosConfig } from "../src/config.mjs";

const packageRoot = dirname(dirname(fileURLToPath(import.meta.url)));
const assetRoot = join(packageRoot, "assets", "opencode");
const manifestPath = join(packageRoot, "assets", "manifest.json");

const commands = [
  ["help", "Show available BROS Harness commands."],
  ["snippet", "Print OpenCode installer commands and resulting plugin entry."],
  ["doctor", "Validate package asset directories and manifest shape without mutation."],
  ["status", "Print local package status without reading configs, env, or credentials."],
  ["config-status", "Validate BROS global/repo/plugin config files and show model-routing and permission-profile effects."],
  ["list-assets", "Summarize packaged OpenCode agent, command, skill, doc, and template counts."],
  ["agent-install-prompt", "Print a safe prompt an AI agent can follow to install the plugin."]
];

const requiredPaths = [
  "assets/opencode/agents",
  "assets/opencode/commands",
  "assets/opencode/skills",
  "assets/opencode/templates",
  "assets/opencode/docs",
  "assets/manifest.json",
  "src/plugin.mjs",
  "package.json"
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

function printHelp() {
  console.log("BROS Harness CLI");
  console.log("");
  console.log("Usage: bros <command>");
  console.log("");
  console.log("Commands:");
  for (const [name, description] of commands) {
    console.log(`  ${name.padEnd(22)} ${description}`);
  }
  console.log("");
  console.log("All commands are read-only. This CLI does not edit live OpenCode config.");
}

async function getPackageVersion() {
  const packageJson = await readJson(join(packageRoot, "package.json"));
  return packageJson.version || "latest";
}

async function printSnippet() {
  const version = await getPackageVersion();
  console.log(`Recommended OpenCode installer command:
opencode plugin bros-harness

Global OpenCode config:
opencode plugin bros-harness --global

Pinned current package when cache or latest resolution is suspect:
opencode plugin bros-harness@${version} --force

Full guide:
docs/installation.md

Resulting config entry:
${JSON.stringify({ plugin: ["bros-harness"] }, null, 2)}`);
}

async function readJson(path) {
  return JSON.parse(await readFile(path, "utf8"));
}

async function doctor() {
  for (const relativePath of requiredPaths) {
    await access(join(packageRoot, relativePath));
  }

  const [manifest, packageJson] = await Promise.all([
    readJson(manifestPath),
    readJson(join(packageRoot, "package.json"))
  ]);

  if (packageJson.name !== "bros-harness") throw new Error("package.json name must be bros-harness.");
  if (packageJson.main !== "./src/plugin.mjs") throw new Error("package.json main must point to ./src/plugin.mjs.");
  if (packageJson.exports?.["."] !== "./src/plugin.mjs") throw new Error("package.json exports must expose ./src/plugin.mjs.");
  if (!packageJson.bin?.bros) throw new Error("package.json must expose the bros CLI bin.");
  const manifestErrors = validateManifestShape(manifest);
  if (manifestErrors.length > 0) throw new Error(`Invalid asset manifest shape:\n- ${manifestErrors.join("\n- ")}`);
  if (manifest.counts?.skills?.skipped !== 3) throw new Error("Expected exactly 3 skipped skills to remain skipped.");
  for (const entry of manifest.entries) {
    await access(join(packageRoot, entry.path));
  }

  console.log("BROS Harness doctor: ok");
  console.log(`Manifest entries: ${manifest.entries.length}`);
  console.log("Scope: local package files only; no OpenCode config, environment, provider, MCP, telemetry, or credential values were read.");
  console.log("No filesystem changes were made.");
}

async function status() {
  const [manifest, packageJson] = await Promise.all([
    readJson(manifestPath),
    readJson(join(packageRoot, "package.json"))
  ]);
  const counts = manifest.counts ?? {};
  console.log("BROS Harness status");
  console.log(`Package: ${packageJson.name ?? "unknown"}@${packageJson.version ?? "unknown"}`);
  console.log(`Node requirement: ${packageJson.engines?.node ?? "unspecified"}`);
  console.log(`Manifest generated: ${manifest.generatedAt ?? "unknown"}`);
  console.log(`Manifest entries: ${Array.isArray(manifest.entries) ? manifest.entries.length : "unknown"}`);
  console.log(`Packaged agents: ${counts.agents?.imported ?? "unknown"}`);
  console.log(`Packaged commands: ${counts.commands?.imported ?? "unknown"}`);
  console.log(`Packaged skills: ${counts.skills?.imported ?? "unknown"} imported, ${counts.skills?.skipped ?? "unknown"} skipped`);
  console.log("Read-only scope: local package metadata and asset manifest only.");
  console.log("Not inspected: user config files, .opencode directories, environment variables, providers, MCP servers, telemetry settings, or credential material.");
}

async function readPackagedAgentModels() {
  const files = (await readdir(join(assetRoot, "agents")))
    .filter((file) => file.endsWith(".md"))
    .filter((file) => file !== "README.md")
    .sort();
  const agents = {};
  for (const file of files) {
    const markdown = await readFile(join(assetRoot, "agents", file), "utf8");
    const name = markdown.match(/^name:\s*(.+)$/m)?.[1]?.trim();
    const model = markdown.match(/^model:\s*(.+)$/m)?.[1]?.trim();
    if (name && model) agents[name] = { model };
  }
  return agents;
}

async function configStatus() {
  const resolved = await loadResolvedBrosConfig({ input: {} });
  if (resolved.errors.length > 0) {
    throw new Error(`Invalid BROS config:\n- ${resolved.errors.join("\n- ")}`);
  }
  const baseAgents = await readPackagedAgentModels();
  const routed = applyModelRoutingToAgents(baseAgents, resolved);
  console.log("BROS Harness config status");
  console.log(`Global config path: ${brosConfigDefaults.globalConfigPath}`);
  console.log(`Repo config path: ${brosConfigDefaults.repoConfigPath}`);
  console.log("Precedence: packaged defaults < global BROS config < repo BROS config < OpenCode plugin input.");
  console.log(`Fallback model configured: ${resolved.fallbackModel ? "yes" : "no"}`);
  console.log(`Explicit model routes: ${Object.keys(resolved.modelRouting).length}`);
  console.log(`Supported permission profiles: ${brosConfigDefaults.permissionProfiles.join(", ")}`);
  console.log(`Active permission profiles: ${resolved.permissionProfiles?.enabled?.length ? resolved.permissionProfiles.enabled.join(", ") : "none"}`);
  if (resolved.permissionProfiles) {
    console.log(`Permission profile scope: ${resolved.permissionProfiles.scope}`);
    console.log(`Permission profile expiry: ${resolved.permissionProfiles.expires_at}`);
    console.log("Permission profile reason: configured (value redacted from status output)");
    console.log(`Permission hard review: ${resolved.permissionProfiles.hard_review ? "enabled" : "disabled"}`);
  }
  if (resolved.warnings.length > 0) {
    console.log("Warnings:");
    for (const warning of resolved.warnings) console.log(`- ${warning}`);
  }
  if (routed.events.length > 0) {
    console.log("Routing changes:");
    for (const event of routed.events) console.log(`- ${event.agent}: ${event.category} via ${event.source}`);
  } else {
    console.log("Routing changes: none");
  }
  console.log("No provider, credential, MCP, telemetry, or top-level permission config was read or changed.");
}

async function countMarkdownFiles(relativeDir) {
  const files = await readdir(join(assetRoot, relativeDir));
  return files.filter((file) => file.endsWith(".md")).length;
}

async function listAssets() {
  const manifest = await readJson(manifestPath);
  const counts = manifest.counts ?? {};
  console.log("BROS Harness packaged assets");
  console.log(`Agents: ${counts.agents?.imported ?? await countMarkdownFiles("agents")}`);
  console.log(`Commands: ${counts.commands?.imported ?? await countMarkdownFiles("commands")}`);
  console.log(`Skills: ${counts.skills?.imported ?? "unknown"} imported, ${counts.skills?.skipped ?? "unknown"} skipped`);
  console.log(`Docs: ${counts.docs?.imported ?? await countMarkdownFiles("docs")}`);
  console.log(`Templates: ${counts.templates?.imported ?? "unknown"}`);
}

async function printAgentInstallPrompt() {
  console.log(`Install BROS Harness into OpenCode by following docs/installation.md as the source of truth.\nDo not only paste JSON into opencode.jsonc; use OpenCode's plugin installer unless the guide's fallback applies.\nDo not edit providers, MCP, permissions, telemetry, secrets, npm publishing, or npm dist-tags.\nRestart OpenCode and verify BROS agents after installation.`);
}

const command = process.argv[2] ?? "help";

try {
  switch (command) {
    case "help":
    case "--help":
    case "-h":
      printHelp();
      break;
    case "snippet":
      await printSnippet();
      break;
    case "doctor":
      await doctor();
      break;
    case "status":
      await status();
      break;
    case "config-status":
      await configStatus();
      break;
    case "list-assets":
      await listAssets();
      break;
    case "agent-install-prompt":
      await printAgentInstallPrompt();
      break;
    default:
      console.error(`Unknown command: ${command}`);
      printHelp();
      process.exitCode = 1;
  }
} catch (error) {
  console.error(`BROS Harness ${command}: failed`);
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
}
