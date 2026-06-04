import { access, readdir, readFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import {
  assertNoForbiddenConfigMutation,
  assertNoPackagedAssetInvariantErrors,
  snapshotForbiddenConfig,
  validateAgentAsset,
  validateCommandAsset,
} from "./security-invariants.mjs";
import {
  applyModelRoutingToAgents,
  applyPermissionProfilesToAgents,
  loadResolvedBrosConfig,
  resolveModelRouteForAgent,
} from "./config.mjs";

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

const knownBrosAgentIds = new Set([
  "mighty-bro",
  "bro-explore",
  "bro-build",
  "bro-shield",
  "bro-test",
  "bro-docs",
  "bro-design",
  "bro-ui",
  "bro-ops",
]);

export async function verifyBrosHarnessAssets() {
  await Promise.all(requiredAssetDirs.map((path) => access(path)));
  return brosHarness;
}

function parseCommandMarkdown(markdown) {
  const match = markdown.match(/^---\n([\s\S]*?)\n---\n?([\s\S]*)$/);
  if (!match) {
    return { description: "BROS Harness command.", template: markdown.trim() };
  }

  const descriptionMatch = match[1].match(/^description:\s*(.+)$/m);
  const description = descriptionMatch?.[1]?.replace(/^['\"]|['\"]$/g, "").trim();
  return {
    description: description || "BROS Harness command.",
    template: match[2].trim()
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

function parseYamlKeyValue(line) {
  let quote = "";
  for (let index = 0; index < line.length; index += 1) {
    const char = line[index];
    if ((char === '"' || char === "'") && line[index - 1] !== "\\") {
      quote = quote === char ? "" : quote || char;
      continue;
    }

    if (char === ":" && !quote) {
      return [line.slice(0, index), line.slice(index + 1)];
    }
  }
  return null;
}

function parseSimpleYamlObject(yaml) {
  const root = {};
  const stack = [{ indent: -1, value: root }];

  for (const rawLine of yaml.split("\n")) {
    if (!rawLine.trim() || rawLine.trim().startsWith("#")) continue;

    const indent = rawLine.match(/^ */)?.[0].length ?? 0;
    const line = rawLine.trim();
    const parsedLine = parseYamlKeyValue(line);
    if (!parsedLine) continue;

    const key = parsedLine[0].trim().replace(/^['"]|['"]$/g, "");
    const rawValue = parsedLine[1]?.trimStart() ?? "";

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
    if (parsed) {
      assertNoPackagedAssetInvariantErrors(validateAgentAsset({
        path: `assets/opencode/agents/${file}`,
        frontmatter: { name: parsed.name, ...parsed.agent, prompt: undefined },
        prompt: parsed.agent.prompt,
      }));
      agents[parsed.name] = parsed.agent;
    }
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
    assertNoPackagedAssetInvariantErrors(validateCommandAsset({ path: `assets/opencode/commands/${file}`, markdown }));
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

function mergeAgents(cfg, agents, resolvedConfig) {
  if (cfg.agent !== undefined && (cfg.agent === null || typeof cfg.agent !== "object" || Array.isArray(cfg.agent))) {
    return;
  }

  cfg.agent ??= {};
  for (const [name, agent] of Object.entries(agents)) {
    if (cfg.agent[name] === undefined) {
      cfg.agent[name] = agent;
      continue;
    }

    if (knownBrosAgentIds.has(name) && cfg.agent[name] !== null && typeof cfg.agent[name] === "object" && !Array.isArray(cfg.agent[name])) {
      const explicitRoute = resolveModelRouteForAgent(name, resolvedConfig, { allowFallback: false });
      if (explicitRoute?.model) cfg.agent[name].model = explicitRoute.model;
    }
  }
}

export async function brosHarnessServer(input = {}, options = {}) {
  await verifyBrosHarnessAssets();
  const baseAgents = await loadPackagedAgents();
  const commands = await loadPackagedCommands();
  const resolvedConfig = await loadResolvedBrosConfig({
    cwd: options.cwd ?? process.cwd(),
    input,
    includeFiles: options.includeFiles ?? true,
  });
  if (resolvedConfig.errors.length > 0) {
    throw new Error(`Invalid BROS Harness config:\n- ${resolvedConfig.errors.join("\n- ")}`);
  }
  const routed = applyModelRoutingToAgents(baseAgents, resolvedConfig);
  const profiled = applyPermissionProfilesToAgents(routed.agents, resolvedConfig);
  const agents = profiled.agents;
  const routingMessages = [
    ...resolvedConfig.warnings,
    ...routed.events.map((event) => `routing applied: ${event.agent} (${event.category}) uses ${event.source}`),
    ...profiled.events.map((event) => `permission profile applied: ${event.agent} uses ${event.profile} within ${event.scope} scope until ${event.expires_at}; reason: ${event.reason}`),
  ];

  return {
    config(cfg) {
      const forbiddenConfigBefore = snapshotForbiddenConfig(cfg);
      for (const message of routingMessages) {
        console.warn(`BROS Harness config: ${message}`);
      }
      mergeSkillsPath(cfg);
      mergeAgents(cfg, agents, resolvedConfig);
      mergeCommands(cfg, commands);
      assertNoForbiddenConfigMutation(forbiddenConfigBefore, cfg);
    }
  };
}

export default {
  id: "bros-harness",
  server: brosHarnessServer
};
