#!/usr/bin/env node
import { access, readFile, readdir } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const packageRoot = dirname(dirname(fileURLToPath(import.meta.url)));
const assetRoot = join(packageRoot, "assets", "opencode");
const manifestPath = join(packageRoot, "assets", "manifest.json");

const commands = [
  ["help", "Show available BROS Harness commands."],
  ["snippet", "Print OpenCode installer commands and resulting plugin entry."],
  ["doctor", "Validate package asset directories and manifest shape without mutation."],
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
  if (manifest.name !== "bros-harness" || !Array.isArray(manifest.entries)) throw new Error("Invalid asset manifest shape.");
  if (manifest.counts?.skills?.skipped !== 3) throw new Error("Expected exactly 3 skipped skills to remain skipped.");

  console.log("BROS Harness doctor: ok");
  console.log(`Manifest entries: ${manifest.entries.length}`);
  console.log("No filesystem changes were made.");
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
