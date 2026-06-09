import { routingCategoryRegistry } from "./config.mjs";

export const workflowModes = Object.freeze(["INFO_ONLY", "DOC_ONLY", "READ_ONLY_REVIEW", "SMALL_PATCH", "FULL_BROS"]);
export const workflowDepths = Object.freeze(["quick", "standard", "deep", "critical"]);

const hardGateTriggers = new Set(["security", "ui", "production", "permission", "credential", "destructive", "release", "conflict"]);

const categoryTags = Object.freeze({
  security: "security",
  ui: "ui",
  docs: "docs",
  ops: "ops",
  production: "ops",
  release: "release_ops",
  credential: "security",
  permission: "security",
  destructive: "ops",
  conflict: "deep_review",
  review: "qa_review",
  small_patch: "quick_patch",
  git: "git_ops",
  package: "package_ops",
  runtime: "local_runtime",
  vision: "vision_engineering",
  agent_harness: "agent_harness",
});

const baseCategoriesByMode = Object.freeze({
  INFO_ONLY: ["planner"],
  DOC_ONLY: ["planner"],
  READ_ONLY_REVIEW: ["planner", "qa_review"],
  SMALL_PATCH: ["planner", "quick_patch", "coder_build", "qa_review"],
  FULL_BROS: ["planner", "explorer_search", "architecture", "coder_build", "qa_review", "security", "ops", "docs"],
});

function addCategory(categories, category) {
  if (category && routingCategoryRegistry[category]) categories.add(category);
}

function categoriesForScenario(mode, tags, input) {
  const categories = new Set(baseCategoriesByMode[mode] ?? ["planner"]);
  if (mode === "DOC_ONLY" && input.fileEdit) addCategory(categories, "docs");
  if (mode === "READ_ONLY_REVIEW") {
    categories.delete("qa_review");
    addCategory(categories, tags.has("security") ? "security" : "qa_review");
  }
  for (const tag of tags) addCategory(categories, categoryTags[tag]);
  return [...categories];
}

function agentsForCategories(categories) {
  const agents = new Set();
  for (const category of categories) {
    for (const agent of routingCategoryRegistry[category]?.defaultAgents ?? []) agents.add(agent);
  }
  return [...agents];
}

export function classifyRoutingScenario(input = {}) {
  const tags = new Set(input.tags ?? []);
  const hardGate = [...tags].some((tag) => hardGateTriggers.has(tag));
  let mode = "INFO_ONLY";
  if (hardGate || tags.has("complex")) mode = "FULL_BROS";
  else if (tags.has("small_patch")) mode = "SMALL_PATCH";
  else if (tags.has("review")) mode = "READ_ONLY_REVIEW";
  else if (tags.has("docs")) mode = "DOC_ONLY";

  const depth = hardGate ? "critical" : tags.has("deep") ? "deep" : mode === "INFO_ONLY" ? "quick" : "standard";
  const governance = mode === "INFO_ONLY" ? "compact" : mode === "FULL_BROS" ? "full" : "standard";

  const categories = categoriesForScenario(mode, tags, input);
  const requiredAgents = agentsForCategories(categories);

  const blocked = [];
  if (tags.has("missing_packet") && mode !== "INFO_ONLY") blocked.push("missing_required_packet");
  if (tags.has("hard_denied_command")) blocked.push("hard_denied_command");
  if (tags.has("persona_persisted")) blocked.push("persona_leakage");
  if (tags.has("conflict")) blocked.push("reviewer_conflict_requires_redispatch_or_waiver");
  if (tags.has("assemble_tail_work")) blocked.push("tail_work_manual_gate");

  return {
    mode,
    depth,
    governance,
    categories,
    agents: [...requiredAgents],
    blocked,
  };
}
