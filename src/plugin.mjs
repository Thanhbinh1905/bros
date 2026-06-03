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

function parseSimpleYamlObject(yaml) {
  const root = {};
  const stack = [{ indent: -1, value: root }];

  for (const rawLine of yaml.split("\n")) {
    if (!rawLine.trim() || rawLine.trim().startsWith("#")) continue;

    const indent = rawLine.match(/^ */)?.[0].length ?? 0;
    const line = rawLine.trim();
    const match = line.match(/^(.+?):(?:\s*(.*))?$/);
    if (!match) continue;

    const key = match[1].trim().replace(/^['"]|['"]$/g, "");
    const rawValue = match[2] ?? "";

    while (stack.length > 1 && indent <= stack[stack.length - 1].indent) {
      stack.pop();
    }

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

function parseAgentMarkdown(markdown) {
  const match = markdown.match(/^---\n([\s\S]*?)\n---\n?([\s\S]*)$/);
  if (!match) return null;

  const frontmatter = parseSimpleYamlObject(match[1]);
  const { name, ...agent } = frontmatter;
  if (!name) return null;

  return {
    name,
    agent: {
      ...agent,
      prompt: match[2].trim()
    }
  };
}

async function loadPackagedAgents() {
  const files = (await readdir(brosHarness.agentsDir))
    .filter((file) => file.endsWith(".md"))
    .filter((file) => file !== "README.md")
    .sort();

  const agents = {};
  for (const file of files) {
    const markdown = await readFile(join(brosHarness.agentsDir, file), "utf8");
    const parsed = parseAgentMarkdown(markdown);
    if (parsed) agents[parsed.name] = parsed.agent;
  }
  return agents;
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

function mergeAgents(cfg, agents) {
  if (cfg.agent !== undefined && (cfg.agent === null || typeof cfg.agent !== "object" || Array.isArray(cfg.agent))) {
    return;
  }

  cfg.agent ??= {};
  for (const [name, agent] of Object.entries(agents)) {
    cfg.agent[name] ??= agent;
  }
}

export default async function brosHarnessPlugin(_input = {}, _options = {}) {
  await verifyBrosHarnessAssets();
  const agents = await loadPackagedAgents();
  const commands = await loadPackagedCommands();

  return {
    config(cfg) {
      mergeSkillsPath(cfg);
      mergeAgents(cfg, agents);
      mergeCommands(cfg, commands);
    }
  };
}
