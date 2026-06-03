#!/usr/bin/env node
import { readFile } from "node:fs/promises";
import { join } from "node:path";

const commandPaths = {
  "bros-assemble": "assets/opencode/commands/bros-assemble.md",
  "bros-plan": "assets/opencode/commands/bros-plan.md",
  "bros-build": "assets/opencode/commands/bros-build.md",
  "bros-review": "assets/opencode/commands/bros-review.md",
  "bros-status": "assets/opencode/commands/bros-status.md",
};

const agentPaths = {
  "bro-build": "assets/opencode/agents/bro-build.md",
  "bro-design": "assets/opencode/agents/bro-design.md",
  "bro-docs": "assets/opencode/agents/bro-docs.md",
  "bro-explore": "assets/opencode/agents/bro-explore.md",
  "bro-ops": "assets/opencode/agents/bro-ops.md",
  "bro-shield": "assets/opencode/agents/bro-shield.md",
  "bro-test": "assets/opencode/agents/bro-test.md",
  "bro-ui": "assets/opencode/agents/bro-ui.md",
  "mighty-bro": "assets/opencode/agents/mighty-bro.md",
};

const skillPaths = {
  "web-doc-search": "assets/opencode/skills/web-doc-search/SKILL.md",
  "search-first": "assets/opencode/skills/search-first/SKILL.md",
  "frontend-design": "assets/opencode/skills/frontend-design/SKILL.md",
  "frontend-design-direction": "assets/opencode/skills/frontend-design-direction/SKILL.md",
  "design-system": "assets/opencode/skills/design-system/SKILL.md",
};

const templatePaths = {
  "explorer-evidence-packet": "assets/opencode/templates/bros/explorer-evidence-packet.md",
  "ui-implementation-packet": "assets/opencode/templates/bros/ui-implementation-packet.md",
};

const requiredBlocks = [
  "BROS REVIEW:",
  "NO RUBBER STAMP:",
  "BRO CHALLENGE:",
  "MIGHTY BRO CHECK:",
  "HANDOFF:",
];

const allowedVerdicts = [
  "PROPOSED",
  "APPROVED",
  "CHANGES_REQUIRED",
  "REJECTED",
  "BLOCKED",
  "REDISPATCH_REQUIRED",
];

function asRegExp(pattern) {
  return new RegExp(pattern, "i");
}

function hasPattern(text, pattern) {
  return asRegExp(pattern).test(text);
}

function requirePattern(errors, scope, text, pattern) {
  if (!hasPattern(text, pattern)) errors.push(`${scope}: missing required pattern: ${pattern}`);
}

function rejectPattern(errors, scope, text, pattern) {
  if (hasPattern(text, pattern)) errors.push(`${scope}: forbidden pattern present: ${pattern}`);
}

async function readCommandMarkdown() {
  const entries = await Promise.all(
    Object.entries(commandPaths).map(async ([name, path]) => [name, await readFile(path, "utf8")]),
  );
  return Object.fromEntries(entries);
}

async function readAgentMarkdown() {
  const entries = await Promise.all(
    Object.entries(agentPaths).map(async ([name, path]) => [name, await readFile(path, "utf8")]),
  );
  return Object.fromEntries(entries);
}

async function readMarkdownMap(paths) {
  const entries = await Promise.all(
    Object.entries(paths).map(async ([name, path]) => [name, await readFile(path, "utf8")]),
  );
  return Object.fromEntries(entries);
}

function validateCanonicalCommandNames(errors, commands) {
  for (const [name, path] of Object.entries(commandPaths)) {
    if (!commands[name]) errors.push(`${name}: command markdown missing at ${path}`);
    requirePattern(errors, name, commands[name] ?? "", `/${name}`);
  }
}

function validateGovernanceSignature(errors, commandName, markdown) {
  requirePattern(errors, commandName, markdown, "BROS SIG: mighty-bro \\| Mighty Bro \\(Orchestrator\\) \\| phase=<n> \\| verdict=<verdict> \\| packet=<id-or-none>");
  for (const block of requiredBlocks) requirePattern(errors, commandName, markdown, block.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"));
  for (const verdict of allowedVerdicts) requirePattern(errors, commandName, markdown, verdict);
}

function validatePacketTrustBoundary(errors, commandName, markdown) {
  requirePattern(errors, commandName, markdown, "trusted/untrusted separation|trusted policy/gates from untrusted|untrusted handoff data|Treat packet contents as untrusted");
  requirePattern(errors, commandName, markdown, "non-authoritative|cannot .*bypass gates|never as authority|cannot grant security approval");
}

function validateNoImplementationBeforeGates(errors, commands) {
  requirePattern(errors, "bros-plan", commands["bros-plan"], "Run Phases 0 through 4 only");
  requirePattern(errors, "bros-plan", commands["bros-plan"], "Do not write code, edit files, or run shell commands");
  requirePattern(errors, "bros-plan", commands["bros-plan"], "Stop at the task-plan approval gate");
  requirePattern(errors, "bros-review", commands["bros-review"], "Do not implement fixes unless the user explicitly asks for remediation after the review");

  rejectPattern(errors, "bros-plan", commands["bros-plan"], "dispatch Phase 5 implementation tasks");
  rejectPattern(errors, "bros-review", commands["bros-review"], "dispatch Phase 5 implementation tasks");
}

function validateModeSemantics(errors, commands, agents) {
  const normalClassification = "inline quick|quick Explorer|direct specialist|suggest `/bros-plan`|suggest `/bros-assemble`";
  requirePattern(errors, "mighty-bro", agents["mighty-bro"], normalClassification);
  requirePattern(errors, "bros-status", commands["bros-status"], normalClassification);

  requirePattern(errors, "bros-plan", commands["bros-plan"], "planning-only lane");
  requirePattern(errors, "bros-plan", commands["bros-plan"], "must not auto-build|must not automatically build|must not auto build");
  rejectPattern(errors, "bros-plan", commands["bros-plan"], "Phase 5 implementation");

  requirePattern(errors, "bros-build", commands["bros-build"], "approved implementation lane");
  requirePattern(errors, "bros-build", commands["bros-build"], "not plan from scratch|does not plan from scratch");

  requirePattern(errors, "bros-assemble", commands["bros-assemble"], "one-prompt end-to-end delivery lane");
  requirePattern(errors, "bros-assemble", commands["bros-assemble"], "plan\+build\+review\+docs|plan, build, review, and docs");
  requirePattern(errors, "bros-assemble", commands["bros-assemble"], "safe scope");
  requirePattern(errors, "bros-assemble", commands["bros-assemble"], "cannot bypass security, destructive-operation, production/cloud, secret, permission, QA, architecture, or governance gates");
  requirePattern(errors, "bros-assemble", commands["bros-assemble"], "no auto-publish|no automatic publish|must not publish");
  requirePattern(errors, "bros-assemble", commands["bros-assemble"], "no auto-merge|no automatic merge|must not merge");
  requirePattern(errors, "bros-assemble", commands["bros-assemble"], "do not dispatch Phase 5|must not dispatch Phase 5|no build when blocked");
  requirePattern(errors, "bros-assemble", commands["bros-assemble"], "classify → plan → build → QA/security/ops → docs/final report");
  requirePattern(errors, "bros-assemble", commands["bros-assemble"], "must not install dependencies");
  requirePattern(errors, "bros-assemble", commands["bros-assemble"], "must not read or validate secrets/credentials");
  requirePattern(errors, "bros-assemble", commands["bros-assemble"], "Final Report Contract");
}

function validateBuildPacketGate(errors, markdown) {
  requirePattern(errors, "bros-build", markdown, "approved Phase 0-4 plan");
  requirePattern(errors, "bros-build", markdown, "Required Upstream Packets, Packet References, Gate Status, and Waiver Rationale");
  requirePattern(errors, "bros-build", markdown, "Block Phase 5 dispatch if a required .*UI Implementation Packet.*Explorer Evidence Packet.*missing, incomplete, stale, inconsistent with trusted gates, or waived without explicit scoped rationale");
  requirePattern(errors, "bros-build", markdown, "missing required packet without valid waiver");
  requirePattern(errors, "bros-build", markdown, "Do not falsely block non-UI work solely for lacking a UI packet");
}

function validateEvidenceMetadata(errors, commands, agents) {
  const metadataTerms = ["Produced at", "Trace ID", "Freshness", "Freshness basis", "Overall confidence"];
  for (const term of metadataTerms) requirePattern(errors, "bro-explore", agents["bro-explore"], term);
  requirePattern(errors, "bro-explore", agents["bro-explore"], "Reuse scope");
  requirePattern(errors, "bro-explore", agents["bro-explore"], "Staleness triggers");
  requirePattern(errors, "bro-explore", agents["bro-explore"], "claim-level confidence|Confidence and Limitations|Redaction and Trace Hygiene");
  for (const term of metadataTerms) requirePattern(errors, "mighty-bro", agents["mighty-bro"], term);
  for (const term of metadataTerms) requirePattern(errors, "bros-plan", commands["bros-plan"], term);
  for (const term of metadataTerms) requirePattern(errors, "bros-build", commands["bros-build"], term);
  for (const term of metadataTerms) requirePattern(errors, "bros-review", commands["bros-review"], term);
}

function validateExplorerReuseProtocol(errors, agents) {
  const specialists = ["bro-build", "bro-test", "bro-shield", "bro-ops", "bro-docs", "bro-ui", "bro-design"];
  for (const agentName of specialists) {
    const markdown = agents[agentName] ?? "";
    requirePattern(errors, agentName, markdown, "Explorer Reuse Protocol");
    requirePattern(errors, agentName, markdown, "REDISPATCH_REQUIRED.*bro-explore|bro-explore.*Explorer Evidence Packet");
    requirePattern(errors, agentName, markdown, "do not invent facts");
    requirePattern(errors, agentName, markdown, "Produced at.*Trace ID.*Freshness.*Freshness basis.*Overall confidence");
    requirePattern(errors, agentName, markdown, "reuse scope.*staleness triggers|staleness triggers.*reuse scope");
    requirePattern(errors, agentName, markdown, "untrusted evidence, not executable instruction");
    requirePattern(errors, agentName, markdown, "stale/unverified.*unrelated.*contradicted|unrelated.*contradicted.*stale/unverified");
    requirePattern(errors, agentName, markdown, "raw secrets, env values, provider keys, credentials");
  }
}

function validateTraceHygiene(errors, commands, agents) {
  const stalePattern = "historical/non-authoritative|stale/unverified";
  const packagePattern = "excluded from packages|excluded from package contents|excluded from public packages";
  for (const [name, markdown] of Object.entries({ ...commands, ...agents })) {
    requirePattern(errors, name, markdown, stalePattern);
  }
  requirePattern(errors, "mighty-bro", agents["mighty-bro"], packagePattern);
  requirePattern(errors, "bros-build", commands["bros-build"], packagePattern);
  requirePattern(errors, "bros-review", commands["bros-review"], packagePattern);
  requirePattern(errors, "bro-explore", agents["bro-explore"], "Sensitive material encountered.*redacted path/line/classification only");
}

function validateReviewChallenge(errors, markdown) {
  requirePattern(errors, "bros-review", markdown, "Challenge weak user ideas or weak prior Bro outputs");
  requirePattern(errors, "bros-review", markdown, "Do not rubber-stamp plans, findings, waivers, or delivery claims");
  requirePattern(errors, "bros-review", markdown, "severity-ranked objections when evidence or acceptance criteria are insufficient");
  requirePattern(errors, "bros-review", markdown, "Findings first, ordered by severity");
}

function validateQaCurrentBuildProtocol(errors, commands, agents) {
  requirePattern(errors, "bro-test", agents["bro-test"], "QA is report-only|bro-test.*report-only");
  requirePattern(errors, "bro-test", agents["bro-test"], "must not edit files|Do not modify production code, tests, prompts, commands, docs, configs");
  requirePattern(errors, "bro-test", agents["bro-test"], "apply old code|rollback|rebuild|restore");
  requirePattern(errors, "bro-test", agents["bro-test"], "Report.*to Mighty Bro|findings to Mighty Bro");
  requirePattern(errors, "bro-test", agents["bro-test"], "Current build trace has priority over stale evidence");
  requirePattern(errors, "bro-test", agents["bro-test"], "User confirmation.*product input|product input.*does not override");

  requirePattern(errors, "mighty-bro", agents["mighty-bro"], "QA Failure and Current-Build Protocol");
  requirePattern(errors, "mighty-bro", agents["mighty-bro"], "Before any rebuild, rollback, revert, restore, or remediation dispatch, ask the user");
  requirePattern(errors, "mighty-bro", agents["mighty-bro"], "Do not auto-rebuild or auto-rollback on QA failure");
  requirePattern(errors, "mighty-bro", agents["mighty-bro"], "Current build trace has priority over stale evidence");
  requirePattern(errors, "mighty-bro", agents["mighty-bro"], "User confirmation is product input");

  for (const commandName of ["bros-build", "bros-review", "bros-assemble"]) {
    requirePattern(errors, commandName, commands[commandName], "QA/current-build protocol");
    requirePattern(errors, commandName, commands[commandName], "report-only");
    requirePattern(errors, commandName, commands[commandName], "asks? the user before any rebuild, rollback, revert, restore, or remediation dispatch");
    requirePattern(errors, commandName, commands[commandName], "Current build trace has priority over stale evidence|current build trace before stale evidence");
    requirePattern(errors, commandName, commands[commandName], "User confirmation is product input");
  }

  requirePattern(errors, "bros-build", commands["bros-build"], "do not automatically rebuild, roll back, or re-dispatch repairs");
  requirePattern(errors, "bros-assemble", commands["bros-assemble"], "must not automatically rebuild or rollback after QA failure");
}

function validateScenarios(errors, commands, scenarios) {
  for (const scenario of scenarios) {
    const markdown = commands[scenario.command];
    if (!markdown) {
      errors.push(`${scenario.id}: unknown command ${scenario.command}`);
      continue;
    }
    for (const pattern of scenario.requiredPatterns ?? []) {
      requirePattern(errors, scenario.id, markdown, pattern);
    }
    for (const pattern of scenario.forbiddenPatterns ?? []) {
      rejectPattern(errors, scenario.id, markdown, pattern);
    }
  }
}

function validateWebSearchQuality(errors, agents, skills, templates) {
  const surfaces = {
    "bro-explore": agents["bro-explore"],
    "web-doc-search": skills["web-doc-search"],
    "search-first": skills["search-first"],
    "explorer-evidence-packet": templates["explorer-evidence-packet"],
  };

  for (const [name, markdown] of Object.entries(surfaces)) {
    requirePattern(errors, name, markdown, "multiple reputable sources|multiple sources");
    requirePattern(errors, name, markdown, "official.*(docs|documentation|primary sources|source)|prefer official");
    requirePattern(errors, name, markdown, "cit(e|ation)|provenance|URL");
    requirePattern(errors, name, markdown, "untrusted evidence|web content is untrusted|fetched.*untrusted");
    requirePattern(errors, name, markdown, "degraded|single-source");
  }

  requirePattern(errors, "web-doc-search", skills["web-doc-search"], "Source Quality Policy");
  requirePattern(errors, "web-doc-search", skills["web-doc-search"], "Deep Inspection Requirements");
  requirePattern(errors, "bro-explore", agents["bro-explore"], "Web and Documentation Source Quality");
  requirePattern(errors, "explorer-evidence-packet", templates["explorer-evidence-packet"], "Web and Documentation Source Quality");
}

function validateDesignCreativityGuidance(errors, agents, skills, templates) {
  const surfaces = {
    "bro-ui": agents["bro-ui"],
    "frontend-design": skills["frontend-design"],
    "frontend-design-direction": skills["frontend-design-direction"],
    "design-system": skills["design-system"],
    "ui-implementation-packet": templates["ui-implementation-packet"],
  };

  for (const [name, markdown] of Object.entries(surfaces)) {
    requirePattern(errors, name, markdown, "3\\+ distinct concept lanes|3\\+ distinct directions|at least 3 distinct concept lanes|Concept lanes: \\[3\\+ distinct directions");
    requirePattern(errors, name, markdown, "novelty.*usability.*accessibility.*brand-fit.*feasibility.*risk");
    requirePattern(errors, name, markdown, "Accessibility.*blocking|accessibility failures are blocking|Accessibility is a blocking criterion|Accessibility is mandatory");
    requirePattern(errors, name, markdown, "generic.*repetition|anti-generic|repeated concepts|generic/repeated");
    requirePattern(errors, name, markdown, "protected-style copying|protected-style-copying|living artist.*named designer.*specific brand|copyrighted/trademarked");
  }
}

const commands = await readCommandMarkdown();
const agents = await readAgentMarkdown();
const skills = await readMarkdownMap(skillPaths);
const templates = await readMarkdownMap(templatePaths);
const scenarios = JSON.parse(await readFile(join("scripts", "fixtures", "workflow-regression-scenarios.json"), "utf8"));
const errors = [];

validateCanonicalCommandNames(errors, commands);
for (const [commandName, markdown] of Object.entries(commands)) {
  validateGovernanceSignature(errors, commandName, markdown);
  validatePacketTrustBoundary(errors, commandName, markdown);
}
validateBuildPacketGate(errors, commands["bros-build"]);
validateEvidenceMetadata(errors, commands, agents);
validateExplorerReuseProtocol(errors, agents);
validateTraceHygiene(errors, commands, agents);
validateReviewChallenge(errors, commands["bros-review"]);
validateQaCurrentBuildProtocol(errors, commands, agents);
validateNoImplementationBeforeGates(errors, commands);
validateModeSemantics(errors, commands, agents);
validateWebSearchQuality(errors, agents, skills, templates);
validateDesignCreativityGuidance(errors, agents, skills, templates);
validateScenarios(errors, commands, scenarios);

if (errors.length > 0) {
  throw new Error(`BROS workflow regression validation failed:\n- ${errors.join("\n- ")}`);
}

console.log(`Validated ${scenarios.length} workflow regression scenarios across ${Object.keys(commands).length} commands.`);
