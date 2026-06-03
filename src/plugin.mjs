import { access, readdir, readFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const packageRoot = dirname(dirname(fileURLToPath(import.meta.url)));
const assetRoot = join(packageRoot, "assets", "opencode");

export const brosHarness = Object.freeze({
  name: "bros-harness",
  packageRoot,
  assetRoot,
  agentsDir: join(assetRoot, "agents"),
  commandsDir: join(assetRoot, "commands"),
  skillsDir: join(assetRoot, "skills"),
  docsDir: join(assetRoot, "docs"),
  templatesDir: join(assetRoot, "templates")
});

const requiredAssetDirs = [
  brosHarness.agentsDir,
  brosHarness.commandsDir,
  brosHarness.skillsDir,
  brosHarness.docsDir,
  brosHarness.templatesDir
];

export async function verifyBrosHarnessAssets() {
  await Promise.all(requiredAssetDirs.map((path) => access(path)));
  return brosHarness;
}

function parseCommandMarkdown(markdown) {
  const match = markdown.match(/^---\n([\s\S]*?)\n---\n?([\s\S]*)$/);
  if (!match) {
    return { description: "BROS Harness command.", prompt: markdown.trim() };
  }

  const descriptionMatch = match[1].match(/^description:\s*(.+)$/m);
  const description = descriptionMatch?.[1]?.replace(/^['\"]|['\"]$/g, "").trim();
  return {
    description: description || "BROS Harness command.",
    prompt: match[2].trim()
  };
}

async function loadPackagedCommands() {
  const files = (await readdir(brosHarness.commandsDir))
    .filter((file) => file.endsWith(".md"))
    .filter((file) => file !== "README.md")
    .sort();

  const commands = {};
  for (const file of files) {
    const name = file.replace(/\.md$/, "");
    const markdown = await readFile(join(brosHarness.commandsDir, file), "utf8");
    commands[name] = parseCommandMarkdown(markdown);
  }
  return commands;
}

function mergeSkillsPath(cfg) {
  if (cfg.skills !== undefined && (cfg.skills === null || typeof cfg.skills !== "object" || Array.isArray(cfg.skills))) {
    return;
  }

  cfg.skills ??= {};
  if (cfg.skills.paths !== undefined && !Array.isArray(cfg.skills.paths)) {
    return;
  }

  cfg.skills.paths ??= [];
  if (!cfg.skills.paths.includes(brosHarness.skillsDir)) {
    cfg.skills.paths.push(brosHarness.skillsDir);
  }
}

function mergeCommands(cfg, commands) {
  if (cfg.command !== undefined && (cfg.command === null || typeof cfg.command !== "object" || Array.isArray(cfg.command))) {
    return;
  }

  cfg.command ??= {};
  for (const [name, command] of Object.entries(commands)) {
    cfg.command[name] ??= command;
  }
}

export default async function brosHarnessPlugin(_input = {}, _options = {}) {
  await verifyBrosHarnessAssets();
  const commands = await loadPackagedCommands();

  return {
    config(cfg) {
      mergeSkillsPath(cfg);
      mergeCommands(cfg, commands);
    }
  };
}
