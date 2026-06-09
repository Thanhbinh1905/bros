#!/usr/bin/env node
import { access, readFile, readdir } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { applyModelRoutingToAgents, brosConfigDefaults, loadResolvedBrosConfig } from "../src/config.mjs";
import { parseInstallUpdateArgs, runInstallUpdate } from "../src/install.mjs";
import { formatBrosHarnessConfigWarningMessages, formatBrosHarnessOfflineUpdateNotice, formatBrosHarnessPackageSpec } from "../src/plugin.mjs";

const packageRoot = dirname(dirname(fileURLToPath(import.meta.url)));
const assetRoot = join(packageRoot, "assets", "opencode");
const manifestPath = join(packageRoot, "assets", "manifest.json");

const commands = [
  ["help", "Show available BROS Harness commands."],
  ["install", "Register BROS Harness in OpenCode config and initialize minimal BROS config."],
  ["update", "Refresh BROS Harness OpenCode plugin registration to the current package version."],
  ["snippet", "Print OpenCode installer commands and resulting plugin entry."],
  ["doctor", "Validate package asset directories and manifest shape without mutation."],
  ["status", "Print local package status without reading configs, env, or credentials."],
  ["config-status", "Validate BROS global/repo/plugin config files and show category, agent, fallback, and permission-profile effects."],
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
  console.log("       bros install|update [--scope project|global] [--channel version|latest] [--refresh-cache] [--dry-run] [--json]");
  console.log("");
  console.log("Commands:");
  for (const [name, description] of commands) {
    console.log(`  ${name.padEnd(22)} ${description}`);
  }
  console.log("");
  console.log("install/update are scoped config writers with backups and dry-run support; other commands are read-only.");
  console.log("install/update pin the plugin entry to the current package version by default. Use --channel latest only when intentionally keeping @latest.");
  console.log("install/update do not execute package managers, collect provider credentials, or delete caches unless --refresh-cache is explicitly passed.");
}

async function getPackageVersion() {
  const packageJson = await readJson(join(packageRoot, "package.json"));
  return packageJson.version || "latest";
}

async function printSnippet() {
  const version = await getPackageVersion();
  console.log(`Recommended package-native install command:
bunx bros-harness@latest install

Fallback package-native install commands:
bunx --package bros-harness@latest bros install
npx --package bros-harness@latest bros install

Recommended package-native update command:
bunx bros-harness@latest update

Fallback package-native update commands:
bunx --package bros-harness@latest bros update
npx --package bros-harness@latest bros update

Secondary global package path:
npm install -g bros-harness@latest
bros install
bros update

Direct OpenCode installer command:
opencode plugin bros-harness@${version}

Global OpenCode config:
opencode plugin bros-harness@${version} --global

Pinned current package:
opencode plugin bros-harness@${version} --force

Optional @latest convenience channel:
bunx bros-harness@latest update --channel latest

Repair an existing install:
opencode plugin bros-harness@${version} --force

If OpenCode Desktop still serves a stale package cache after update and restart, preview scoped cache refresh first:
bunx bros-harness@latest update --refresh-cache --dry-run
Then, after explicit approval, run the scoped refresh. It targets only ~/.cache/opencode/node_modules/bros-harness plus BROS lock entries and never deletes the full cache or node_modules directory.

Full guide:
docs/installation.md

Resulting config entry:
${JSON.stringify({ plugin: [`bros-harness@${version}`] }, null, 2)}`);
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
  console.log(`Loaded version: ${formatBrosHarnessPackageSpec(packageJson)}`);
  console.log(formatBrosHarnessOfflineUpdateNotice(packageJson));
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
  console.log(`Loaded version: ${formatBrosHarnessPackageSpec(packageJson)}`);
  console.log(formatBrosHarnessOfflineUpdateNotice(packageJson));
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
  const packageJson = await readJson(join(packageRoot, "package.json"));
  const resolved = await loadResolvedBrosConfig({ input: {} });
  if (resolved.errors.length > 0) {
    throw new Error(`Invalid BROS config:\n- ${resolved.errors.join("\n- ")}`);
  }
  const baseAgents = await readPackagedAgentModels();
  const routed = applyModelRoutingToAgents(baseAgents, resolved);
  const categoryKeys = Object.keys(resolved.categories).sort();
  const routingProfileKeys = Object.keys(resolved.routingProfiles ?? {}).sort();
  const agentKeys = Object.keys(resolved.agents).sort();
  const activePermissionProfiles = resolved.permissionProfiles?.enabled ?? [];
  const activeApprovalPackages = resolved.approvalPackages ?? [];
  console.log("BROS Harness config status");
  console.log(`Loaded version: ${formatBrosHarnessPackageSpec(packageJson)}`);
  console.log(formatBrosHarnessOfflineUpdateNotice(packageJson));
  console.log(`Global config path: ${brosConfigDefaults.globalConfigPath}`);
  console.log(`Repo config path: ${brosConfigDefaults.repoConfigPath}`);
  console.log("Precedence: packaged defaults < global BROS config < repo BROS config < OpenCode plugin input.");
  console.log(`Fallback models configured: ${resolved.fallbackModels?.length ?? 0}`);
  console.log("Config surface:");
  console.log(`- categories entries: ${categoryKeys.length}${categoryKeys.length ? ` (${categoryKeys.join(", ")})` : ""}`);
  console.log(`- category registry entries: ${Object.keys(brosConfigDefaults.categoryRegistry).length}`);
  console.log(`- routing_profiles entries: ${routingProfileKeys.length}${routingProfileKeys.length ? ` (${routingProfileKeys.join(", ")})` : ""}`);
  if (routingProfileKeys.length > 0) {
    console.log("- routing_profiles runtime note: validated for explicit-depth resolvers; default plugin startup does not infer per-message workflow depth.");
  }
  console.log(`- agents entries: ${agentKeys.length}${agentKeys.length ? ` (${agentKeys.join(", ")})` : ""}`);
  console.log(`- permission_profiles configured: ${resolved.permissionProfiles ? "yes" : "no"}`);
  console.log(`- approval_packages configured: ${activeApprovalPackages.length}`);
  console.log(`Explicit category routes: ${categoryKeys.length}`);
  console.log(`Supported routing profiles: ${brosConfigDefaults.routingProfiles.join(", ")}`);
  console.log(`Restricted fallback categories: ${brosConfigDefaults.fallbackRestrictedCategories.join(", ")}`);
  console.log("Category metadata: descriptions/capabilities/workflow responsibilities only; permissions and approvals remain separate trusted config surfaces.");
  if (categoryKeys.length > 0) {
    console.log("Configured category responsibilities:");
    for (const category of categoryKeys) {
      const definition = brosConfigDefaults.categoryRegistry[category];
      if (definition) console.log(`- ${category}: ${definition.workflowResponsibility}`);
    }
  }
  console.log(`Supported permission profiles: ${brosConfigDefaults.permissionProfiles.join(", ")}`);
  console.log(`Supported approval packages: ${brosConfigDefaults.approvalPackages.join(", ")}`);
  console.log(`Active permission profiles: ${activePermissionProfiles.length ? activePermissionProfiles.join(", ") : "none"}`);
  console.log(`Active approval packages: ${activeApprovalPackages.length ? activeApprovalPackages.map((entry) => entry.package_id).join(", ") : "none"}`);
  if (activeApprovalPackages.length > 0) {
    console.log("Approval package files: audit/reporting metadata only; runtime command permissions are package preset based and are not file-glob enforced.");
  }
  if (resolved.permissionProfiles) {
    console.log(`Permission profile scope: ${resolved.permissionProfiles.scope}`);
    console.log(`Permission profile expiry: ${resolved.permissionProfiles.expires_at}`);
    console.log("Permission profile reason: configured (value redacted from status output)");
    console.log(`Permission hard review: ${resolved.permissionProfiles.hard_review ? "enabled" : "disabled"}`);
  }
  if (resolved.warnings.length > 0) {
    console.log("Warnings:");
    for (const warning of formatBrosHarnessConfigWarningMessages(resolved.warnings)) console.log(`- ${warning}`);
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
  const version = await getPackageVersion();
  const configExample = {
    $schema: "https://raw.githubusercontent.com/Thanhbinh1905/bros/main/examples/bros.config.schema.json",
    fallback_models: [
      { model: "openai/gpt-5.4", variant: "medium" },
      "openai/gpt-5.4-mini-fast",
    ],
    categories: {
      planner: { model: "openai/gpt-5.5", variant: "medium" },
      explorer_search: "openai/gpt-5.4-mini-fast",
      coder_build: { model: "openai/gpt-5.5", variant: "high" },
      qa_review: "openai/gpt-5.5",
      security: "openai/gpt-5.5",
      docs: "openai/gpt-5.4-mini-fast",
      architecture: { model: "openai/gpt-5.5", variant: "high" },
      ui: { model: "openai/gpt-5.4", variant: "high" },
      ops: "openai/gpt-5.5",
    },
    agents: {
      "mighty-bro": {
        model: "openai/gpt-5.5",
        variant: "medium",
      },
      "bro-explore": {
        model: "openai/gpt-5.4-mini-fast",
      },
      "bro-design": {
        model: "openai/gpt-5.5",
        variant: "high",
      },
      "bro-ui": {
        model: "openai/gpt-5.4",
        variant: "high",
      },
    },
    permission_profiles: {
      enabled: ["build_limited"],
      scope: "repo",
      expires_at: "2099-01-01T00:00:00.000Z",
      reason: "Scoped local build validation approval",
      hard_review: true,
    },
  };
  console.log(`Install BROS Harness into OpenCode by following docs/installation.md as the source of truth.
Use the package-native command first: bunx bros-harness@latest install.
For an existing install, use: bunx bros-harness@latest update.
Fallbacks: bunx --package bros-harness@latest bros install|update, or npx --package bros-harness@latest bros install|update.
Global package install is secondary: npm install -g bros-harness@latest, then bros install or bros update.
The install/update command writes bros-harness@${version} by default so OpenCode resolves a concrete package. Use --channel latest only when the human explicitly wants the @latest convenience selector.
Do not only paste JSON into opencode.jsonc unless the guide's fallback applies.
If OpenCode Desktop remains stale after update and restart, use --refresh-cache --dry-run first, then ask for explicit approval before a non-dry-run scoped cache refresh. It must target only OpenCode's BROS package cache, never the full cache or node_modules directory.
Current package version detected by this CLI: ${version}.

Optional manual BROS config after plugin installation:
1. Show the user this complete bros.config.json example and ask for explicit approval before writing any config file.
2. After explicit approval, write only ./bros.config.json for repo config, or only the chosen global config path (${brosConfigDefaults.globalConfigPath}) if the user explicitly chooses global config.
3. Do not edit providers, MCP, top-level OpenCode permissions, telemetry, secrets, npm publishing, or npm dist-tags. Do not collect API keys or write .env files.

Ready-to-paste bros.config.json example:
${JSON.stringify(configExample, null, 2)}

Restart OpenCode and verify BROS agents after installation.`);
}

const command = process.argv[2] ?? "help";

try {
  switch (command) {
    case "help":
    case "--help":
    case "-h":
      printHelp();
      break;
    case "install":
    case "update": {
      const options = parseInstallUpdateArgs(process.argv.slice(3));
      const result = await runInstallUpdate({ command, ...options });
      if (result.status === 0) {
        process.stdout.write(result.output);
      } else {
        process.stderr.write(result.output);
      }
      process.exitCode = result.status;
      break;
    }
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
