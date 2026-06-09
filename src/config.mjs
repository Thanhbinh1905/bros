import { access, readFile } from "node:fs/promises";
import { homedir } from "node:os";
import { join, resolve } from "node:path";

const configFileName = "bros.config.json";
const globalConfigPath = join(homedir(), ".config", "opencode", configFileName);

function freezeCategoryRegistry(registry) {
  return Object.freeze(Object.fromEntries(
    Object.entries(registry).map(([name, definition]) => [name, Object.freeze({
      ...definition,
      capabilities: Object.freeze([...(definition.capabilities ?? [])]),
      defaultAgents: Object.freeze([...(definition.defaultAgents ?? [])]),
    })]),
  ));
}

export const routingCategoryRegistry = freezeCategoryRegistry({
  planner: {
    title: "Planning and orchestration",
    description: "Classifies work, preserves governance gates, and coordinates BROS task packets before implementation or review.",
    workflowResponsibility: "Owns intake, routing records, packet completeness, phase gates, and final stop-condition handoff.",
    capabilities: ["intake", "classification", "packet-governance", "gate-coordination"],
    defaultAgents: ["mighty-bro"],
    restrictedFallback: false,
    permissionAuthority: false,
  },
  explorer_search: {
    title: "Evidence discovery",
    description: "Collects repository, documentation, and external evidence before planning or implementation decisions.",
    workflowResponsibility: "Produces cited Explorer Evidence Packets and records limitations, freshness, provenance, and redaction posture.",
    capabilities: ["repo-evidence", "documentation-lookup", "source-citation", "freshness-checking"],
    defaultAgents: ["bro-explore"],
    restrictedFallback: false,
    permissionAuthority: false,
  },
  coder_build: {
    title: "Scoped implementation",
    description: "Applies approved code, config, tests, and documentation-adjacent changes within an implementation packet.",
    workflowResponsibility: "Implements the smallest approved change, preserves existing abstractions, and reports verification without approving QA or security.",
    capabilities: ["implementation", "refactor", "local-validation", "change-trace"],
    defaultAgents: ["bro-build"],
    restrictedFallback: true,
    permissionAuthority: false,
  },
  security: {
    title: "Security review",
    description: "Reviews sensitive changes, permission boundaries, secret handling, and authorization-risk surfaces.",
    workflowResponsibility: "Blocks or approves security-sensitive work through review findings; category metadata itself never grants authority.",
    capabilities: ["security-review", "secret-hygiene", "permission-boundary-review", "risk-blockers"],
    defaultAgents: ["bro-shield"],
    restrictedFallback: true,
    permissionAuthority: false,
  },
  qa_review: {
    title: "Quality assurance",
    description: "Validates tests, acceptance criteria, regressions, and implementation completeness.",
    workflowResponsibility: "Runs or reviews verification evidence and decides QA readiness separately from implementation.",
    capabilities: ["test-review", "acceptance-validation", "regression-checking", "qa-gate"],
    defaultAgents: ["bro-test"],
    restrictedFallback: true,
    permissionAuthority: false,
  },
  docs: {
    title: "Documentation",
    description: "Produces or updates public, operator, migration, and handoff documentation.",
    workflowResponsibility: "Maintains neutral project documentation and records restart, migration, and operational caveats.",
    capabilities: ["public-docs", "operator-docs", "migration-notes", "handoff-writing"],
    defaultAgents: ["bro-docs"],
    restrictedFallback: false,
    permissionAuthority: false,
  },
  architecture: {
    title: "Architecture and design constraints",
    description: "Defines architectural boundaries, invariants, data/control flow, and system-level tradeoffs.",
    workflowResponsibility: "Supplies or reviews design constraints before implementation changes that affect structure or cross-cutting behavior.",
    capabilities: ["architecture-review", "boundary-definition", "invariant-design", "tradeoff-analysis"],
    defaultAgents: ["bro-design"],
    restrictedFallback: false,
    permissionAuthority: false,
  },
  ui: {
    title: "User interface implementation",
    description: "Handles UI implementation packets, frontend behavior, accessibility, and visual interaction constraints.",
    workflowResponsibility: "Requires fresh UI implementation context or an explicit waiver before UI-affecting implementation proceeds.",
    capabilities: ["ui-implementation", "frontend-behavior", "accessibility", "visual-state"],
    defaultAgents: ["bro-ui"],
    restrictedFallback: false,
    permissionAuthority: false,
  },
  ops: {
    title: "Operations and release readiness",
    description: "Coordinates deployment, release, packaging, runtime, and operational safety gates.",
    workflowResponsibility: "Keeps release/deploy/production actions ask-gated and separates readiness review from implementation.",
    capabilities: ["ops-readiness", "release-gating", "deployment-review", "runtime-safety"],
    defaultAgents: ["bro-ops"],
    restrictedFallback: true,
    permissionAuthority: false,
  },
  vision_engineering: {
    title: "Vision and media engineering",
    description: "Routes image, video, visual inspection, and media-generation engineering work.",
    workflowResponsibility: "Marks vision/media work for specialized evidence and implementation context when present.",
    capabilities: ["vision", "media", "visual-inspection", "asset-generation"],
    defaultAgents: ["bro-explore", "bro-build"],
    restrictedFallback: false,
    permissionAuthority: false,
  },
  agent_harness: {
    title: "Agent harness engineering",
    description: "Routes agent, tool, prompt, command, skill, plugin, and harness-control-plane changes.",
    workflowResponsibility: "Requires evidence-backed harness changes that preserve role boundaries, native OpenCode semantics, and gates.",
    capabilities: ["agent-design", "tool-contracts", "plugin-config", "harness-governance"],
    defaultAgents: ["bro-explore", "bro-design", "bro-build", "bro-test"],
    restrictedFallback: false,
    permissionAuthority: false,
  },
  git_ops: {
    title: "Git operations",
    description: "Routes branch, staging, commit, push, PR, and repository history operations.",
    workflowResponsibility: "Requires explicit Git Approval Packets and protected-branch/force-push safeguards before mutation.",
    capabilities: ["git-inspection", "branch-work", "commit-gates", "pr-gates"],
    defaultAgents: ["bro-ops", "bro-build"],
    restrictedFallback: true,
    permissionAuthority: false,
  },
  package_ops: {
    title: "Package operations",
    description: "Routes package validation, dependency, dry-run, and publish-adjacent workflows.",
    workflowResponsibility: "Allows package dry-run validation while keeping dependency install and publish/release actions separately approved.",
    capabilities: ["package-validation", "dependency-change-review", "publish-gating", "dry-run"],
    defaultAgents: ["bro-ops", "bro-shield", "bro-test"],
    restrictedFallback: true,
    permissionAuthority: false,
  },
  local_runtime: {
    title: "Local runtime verification",
    description: "Routes local server, smoke, CLI, and developer-machine runtime checks.",
    workflowResponsibility: "Keeps runtime checks local, non-production, and bounded to approved commands and surfaces.",
    capabilities: ["local-smoke", "cli-validation", "runtime-diagnostics", "non-production-checks"],
    defaultAgents: ["bro-build", "bro-test"],
    restrictedFallback: false,
    permissionAuthority: false,
  },
  release_ops: {
    title: "Release operations",
    description: "Routes release, changelog, version, artifact, and deployment-readiness work.",
    workflowResponsibility: "Requires release approval and keeps publish/deploy actions blocked until explicit gates pass.",
    capabilities: ["release-review", "artifact-checks", "changelog-review", "publish-gating"],
    defaultAgents: ["bro-ops", "bro-shield", "bro-test"],
    restrictedFallback: true,
    permissionAuthority: false,
  },
  deep_review: {
    title: "Deep adversarial review",
    description: "Routes high-risk, multi-agent, conflict, production, or critical-depth review workflows.",
    workflowResponsibility: "Escalates to full governance, independent review, and conflict-resolution gates when shallow checks are insufficient.",
    capabilities: ["adversarial-review", "critical-depth", "conflict-resolution", "multi-agent-audit"],
    defaultAgents: ["mighty-bro", "bro-test", "bro-shield"],
    restrictedFallback: true,
    permissionAuthority: false,
  },
  quick_patch: {
    title: "Small safe patch",
    description: "Routes narrow local changes that fit bounded implementation and verification without full orchestration.",
    workflowResponsibility: "Limits small-patch work to safe local scope and escalates when packet, security, UI, or ops triggers appear.",
    capabilities: ["small-patch", "bounded-validation", "local-fix", "escalation-triggering"],
    defaultAgents: ["bro-build", "bro-test"],
    restrictedFallback: false,
    permissionAuthority: false,
  },
});

export const routingCategories = Object.freeze(Object.keys(routingCategoryRegistry));

export const categoryAliases = Object.freeze({
  explorer: "explorer_search",
  "explorer/search": "explorer_search",
  search: "explorer_search",
  coder: "coder_build",
  build: "coder_build",
  "coder/build": "coder_build",
  qa: "qa_review",
  review: "qa_review",
  "qa/review": "qa_review",
  release: "ops",
  reviewer: "qa_review",
});

export const agentCategories = Object.freeze({
  "mighty-bro": "planner",
  "bro-explore": "explorer_search",
  "bro-build": "coder_build",
  "bro-shield": "security",
  "bro-test": "qa_review",
  "bro-docs": "docs",
  "bro-design": "architecture",
  "bro-ui": "ui",
  "bro-ops": "ops",
});

const fallbackRestrictedCategories = new Set(
  Object.entries(routingCategoryRegistry)
    .filter(([, definition]) => definition.restrictedFallback === true)
    .map(([category]) => category),
);
export const permissionProfileNames = Object.freeze(["readonly", "review_safe", "build_limited", "trusted_ops"]);
export const routingProfileNames = Object.freeze(["quick", "standard", "deep", "critical"]);
export const approvalPackageNames = Object.freeze([
  "git_read",
  "git_branch_work",
  "git_pr_work",
  "npm_local_dev",
  "npm_dependency_change",
  "ssh_readonly_known_host",
  "docker_local",
  "release_dry_run",
]);

const allowedTopLevelKeys = new Set(["$schema", "fallback_models", "categories", "agents", "routing_profiles", "permission_profiles", "approval_packages"]);
const removedTopLevelKeys = new Set(["model_routing", "fallback_model"]);
const ignoredOpenCodePluginInputKeys = new Set(["client", "project", "directory", "$"]);
const sensitiveValuePattern = /(?:api[_-]?key|authorization|bearer|token|secret|password|credential|private[_-]?key|_auth|sk-[A-Za-z0-9]{20,})/i;
const modelEntryKeys = new Set(["model", "variant", "fallback_models"]);
const restrictedCategoryList = [...fallbackRestrictedCategories].join(", ");

const enforcedDangerousBashDenies = Object.freeze({
  "sudo*": "deny",
  "su*": "deny",
  "rm -rf*": "deny",
  "chmod -R*": "deny",
  "chmod 777*": "deny",
  "chown -R*": "deny",
  "dd*": "deny",
  "mkfs*": "deny",
  "mount*": "deny",
  "umount*": "deny",
  "git reset --hard*": "deny",
  "git clean*": "deny",
  "git push origin main*": "deny",
  "git push origin master*": "deny",
  "git push --force*": "deny",
  "git push -f*": "deny",
  "git push --force-with-lease*": "deny",
  "git push --mirror*": "deny",
  "git push --all*": "deny",
  "git push --tags*": "deny",
  "git push origin --delete *": "deny",
  "git push origin :*": "deny",
  "git commit --no-verify*": "deny",
  "git commit *--no-verify*": "deny",
  "git commit --amend*": "deny",
  "git commit *--amend*": "deny",
  "git commit -am *": "deny",
  "git branch -D*": "deny",
  "git tag -d*": "deny",
  "git update-ref*": "deny",
  "git filter-branch*": "deny",
  "git filter-repo*": "deny",
  "git config --global credential*": "deny",
  "git config --system credential*": "deny",
  "npm publish*": "deny",
  "npm dist-tag*": "deny",
  "npm unpublish *": "deny",
  "npm login": "deny",
  "npm adduser": "deny",
  "npm token *": "deny",
  "npm profile *": "deny",
  "npm owner *": "deny",
  "npm access *": "deny",
  "npm config set //*": "deny",
  "npm config set *_auth*": "deny",
  "npm config set token*": "deny",
  "npm config set registry http://*": "deny",
  "npm config set strict-ssl false": "deny",
  "docker system prune*": "deny",
  "docker volume prune*": "deny",
  "terraform apply*": "deny",
  "terraform destroy*": "deny",
  "kubectl apply*": "deny",
  "kubectl delete*": "deny",
  "helm upgrade*": "deny",
  "cat ~/.ssh*": "deny",
  "cat ~/.aws*": "deny",
  "cat ~/.npmrc": "deny",
  "cat ~/.git-credentials": "deny",
  "cat ~/.docker/config.json": "deny",
  "cat **/.env*": "deny",
  "grep * .env*": "deny",
});

const permissionProfileRules = Object.freeze({
  readonly: {
    agents: ["bro-explore"],
    permission: {
      read: "allow",
      grep: "allow",
      glob: "allow",
      skill: "allow",
      edit: "deny",
      bash: {
        "*": "deny",
        "pwd": "allow",
        "ls*": "allow",
        "find*": "allow",
        "tree*": "allow",
        "rg*": "allow",
        "grep*": "allow",
        "cat *": "allow",
        "sed -n*": "allow",
        "head*": "allow",
        "tail*": "allow",
        "wc*": "allow",
        "git status*": "allow",
        "git diff*": "allow",
        "git log*": "allow",
        "git branch": "allow",
        "git branch --list*": "allow",
        "git branch --show-current": "allow",
        "git remote*": "allow",
        "git rev-parse*": "allow",
        "git show*": "allow",
        "git ls-files*": "allow",
        "git blame*": "allow",
      },
    },
  },
  review_safe: {
    agents: ["bro-test"],
    permission: {
      read: "allow",
      grep: "allow",
      glob: "allow",
      skill: "allow",
      edit: "deny",
      bash: {
        "*": "ask",
        "npm run validate": "allow",
        "npm run verify:no-secrets": "allow",
        "npm run verify:package": "allow",
        "npm run test": "allow",
        "npm test": "allow",
        "npm run lint": "allow",
        "npm run typecheck": "allow",
        "npm run type-check": "allow",
        "npm run build": "allow",
        "node scripts/validate-assets.mjs": "allow",
        "node scripts/validate-workflow-regressions.mjs": "allow",
        "node scripts/verify-plugin-smoke.mjs": "allow",
        "node scripts/verify-no-secrets.mjs": "allow",
        "node scripts/verify-package-contents.mjs": "allow",
        "npm pack --dry-run": "allow",
      },
    },
  },
  build_limited: {
    agents: ["bro-build"],
    permission: {
      read: "allow",
      grep: "allow",
      glob: "allow",
      skill: "allow",
      edit: { "*": "ask" },
      bash: {
        "node scripts/validate-assets.mjs": "allow",
        "node scripts/validate-workflow-regressions.mjs": "allow",
        "node scripts/verify-plugin-smoke.mjs": "allow",
        "node scripts/verify-no-secrets.mjs": "allow",
        "node scripts/verify-package-contents.mjs": "allow",
        "npm run validate": "allow",
        "npm run verify:no-secrets": "allow",
        "npm run verify:package": "allow",
        "npm run test": "allow",
        "npm test": "allow",
        "npm run lint": "allow",
        "npm run typecheck": "allow",
        "npm run type-check": "allow",
        "npm run build": "allow",
        "npm run check": "allow",
        "npm pack --dry-run": "allow",
        "curl http://127.0.0.1*": "allow",
        "curl http://localhost*": "allow",
        "curl http://[::1]*": "allow",
      },
    },
  },
  trusted_ops: {
    agents: ["bro-ops"],
    permission: {
      read: "allow",
      grep: "allow",
      glob: "allow",
      skill: "allow",
      edit: { "*": "ask" },
      bash: {
        "*": "ask",
        "git status*": "allow",
        "git diff*": "allow",
        "git log*": "allow",
        "docker compose config*": "allow",
        "docker compose ps*": "allow",
        "docker compose logs*": "allow",
        "npm run validate": "allow",
        "npm run verify:no-secrets": "allow",
        "npm run verify:package": "allow",
        "npm pack --dry-run": "allow",
      },
    },
  },
});

const approvalPackagePresets = Object.freeze({
  git_read: {
    agents: ["bro-build", "bro-ops", "bro-test"],
    bash: {
      "git status*": "allow",
      "git diff*": "allow",
      "git log*": "allow",
      "git show*": "allow",
      "git branch --show-current": "allow",
      "git remote -v": "allow",
    },
  },
  git_branch_work: {
    agents: ["bro-build", "bro-ops"],
    bash: {
      "git switch -c *": "ask",
      "git checkout -b *": "ask",
      "git add *": "ask",
      "git commit -m *": "ask",
    },
  },
  git_pr_work: {
    agents: ["bro-build", "bro-ops"],
    bash: {
      "git push -u origin *": "ask",
      "gh pr create*": "ask",
      "gh pr view *": "allow",
      "gh pr status*": "allow",
    },
  },
  npm_local_dev: {
    agents: ["bro-build", "bro-test", "bro-ops"],
    bash: {
      "npm run *": "allow",
      "npm test": "allow",
      "npm pack --dry-run": "allow",
    },
  },
  npm_dependency_change: {
    agents: ["bro-build"],
    bash: {
      "npm install*": "ask",
      "npm update*": "ask",
      "npm dedupe*": "ask",
    },
  },
  ssh_readonly_known_host: {
    agents: ["bro-ops"],
    bash: {
      "ssh *": "ask",
    },
  },
  docker_local: {
    agents: ["bro-build", "bro-test", "bro-ops"],
    bash: {
      "docker compose config*": "allow",
      "docker compose ps*": "allow",
      "docker compose logs*": "allow",
      "docker compose up*": "ask",
      "docker compose down*": "ask",
      "docker compose build*": "ask",
    },
  },
  release_dry_run: {
    agents: ["bro-build", "bro-test", "bro-shield", "bro-ops"],
    bash: {
      "npm pack --dry-run": "allow",
      "npm run verify:package": "allow",
      "npm run verify:no-secrets": "allow",
    },
  },
});

function isObject(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function normalizeCategory(category) {
  return categoryAliases[category] ?? category;
}

function validateModelValue(value, path, errors) {
  if (typeof value !== "string" || value.trim() === "") {
    errors.push(`${path} must be a non-empty model id string`);
    return;
  }
  if (sensitiveValuePattern.test(value)) {
    errors.push(`${path} must be a model id, not a secret-like value`);
  }
}

function hasFallbackModels(value) {
  return isObject(value) && Object.hasOwn(value, "fallback_models");
}

function validateModelEntry(value, path, errors, options = {}) {
  if (typeof value === "string") {
    validateModelValue(value, path, errors);
    return;
  }

  if (!isObject(value)) {
    errors.push(`${path} must be a non-empty model id string or model entry object`);
    return;
  }

  // Parsed JSON is untrusted: all model entry object keys are allowlisted.
  for (const key of Object.keys(value)) {
    if (!modelEntryKeys.has(key)) errors.push(`${path}.${key} is not supported; allowed keys are model, variant, fallback_models`);
  }

  if (!Object.hasOwn(value, "model")) {
    errors.push(`${path}.model must be a non-empty model id string`);
  } else {
    validateModelValue(value.model, `${path}.model`, errors);
  }

  if (Object.hasOwn(value, "variant")) {
    if (typeof value.variant !== "string" || value.variant.trim() === "") {
      errors.push(`${path}.variant must be a non-empty string when provided`);
    } else if (sensitiveValuePattern.test(value.variant)) {
      errors.push(`${path}.variant must be a variant id, not a secret-like value`);
    }
  }

  if (!Object.hasOwn(value, "fallback_models")) return;

  if (options.fallbackModelsAllowed === false) {
    errors.push(options.restrictedFallbackError ?? `${path}.fallback_models is not allowed`);
    return;
  }

  if (!Array.isArray(value.fallback_models)) {
    errors.push(`${path}.fallback_models must be a non-empty array of model id strings`);
    return;
  }
  if (value.fallback_models.length === 0) {
    errors.push(`${path}.fallback_models must not be empty`);
  }
  const seenFallbacks = new Map();
  for (const [index, fallbackModel] of value.fallback_models.entries()) {
    const fallbackPath = `${path}.fallback_models[${index}]`;
    validateModelValue(fallbackModel, fallbackPath, errors);
    if (typeof fallbackModel !== "string") continue;
    if (seenFallbacks.has(fallbackModel)) errors.push(`${fallbackPath} duplicates an earlier model entry`);
    seenFallbacks.set(fallbackModel, index);
  }
}

function validateFallbackModelList(value, path, errors) {
  if (!Array.isArray(value)) {
    errors.push(`${path} must be a non-empty array of model id strings or model entry objects`);
    return;
  }
  if (value.length === 0) {
    errors.push(`${path} must not be empty`);
  }
  const seenFallbacks = new Map();
  for (const [index, fallbackEntry] of value.entries()) {
    const entryPath = `${path}[${index}]`;
    validateModelEntry(fallbackEntry, entryPath, errors, { fallbackModelsAllowed: false, restrictedFallbackError: `${entryPath}.fallback_models is not supported in top-level fallback_models entries` });
    let model;
    if (typeof fallbackEntry === "string") {
      model = fallbackEntry.trim();
    } else if (isObject(fallbackEntry) && typeof fallbackEntry.model === "string") {
      model = fallbackEntry.model.trim();
    }
    if (model === undefined) continue;
    if (seenFallbacks.has(model)) {
      errors.push(`${entryPath} duplicates an earlier model entry`);
    }
    seenFallbacks.set(model, index);
  }
}

function restrictedFallbackError(path, category) {
  return `${path}.fallback_models is not allowed for restricted category ${category}; restricted categories are ${restrictedCategoryList}`;
}

function validateModelMap(map, path, allowedKeys, errors, options = {}) {
  if (!isObject(map)) {
    errors.push(`${path} must be an object`);
    return;
  }

  const seen = new Set();
  for (const [rawKey, entry] of Object.entries(map)) {
    const normalizedKey = options.normalizeKeys === false ? rawKey : normalizeCategory(rawKey);
    const entryPath = `${path}.${rawKey}`;
    if (!allowedKeys.includes(rawKey) && !allowedKeys.includes(normalizedKey)) {
      errors.push(`${entryPath} is not supported; use one of ${allowedKeys.join(", ")}`);
      continue;
    }
    if (seen.has(normalizedKey)) {
      errors.push(`${path} defines duplicate category ${normalizedKey} via aliases`);
    }
    seen.add(normalizedKey);

    const restrictedCategory = options.categoryForKey?.(rawKey, normalizedKey);
    const fallbackModelsAllowed = !(restrictedCategory && fallbackRestrictedCategories.has(restrictedCategory));
    const restrictedError = restrictedCategory && hasFallbackModels(entry) ? restrictedFallbackError(entryPath, restrictedCategory) : undefined;
    validateModelEntry(entry, entryPath, errors, {
      fallbackModelsAllowed,
      restrictedFallbackError: restrictedError,
    });
  }
}

function validateCategoriesMap(map, path, errors) {
  validateModelMap(map, path, [...routingCategories, ...Object.keys(categoryAliases)], errors, {
    categoryForKey: (_rawCategory, normalizedCategory) => normalizedCategory,
  });
}

function validateRoutingProfilesMap(map, path, errors) {
  if (!isObject(map)) {
    errors.push(`${path} must be an object`);
    return;
  }

  for (const [depth, profile] of Object.entries(map)) {
    if (!routingProfileNames.includes(depth)) {
      errors.push(`${path}.${depth} is not supported; use one of ${routingProfileNames.join(", ")}`);
      continue;
    }
    validateModelMap(profile, `${path}.${depth}`, [...routingCategories, ...Object.keys(categoryAliases)], errors, {
      categoryForKey: (_rawCategory, normalizedCategory) => normalizedCategory,
    });
  }
}

function validateAgentsMap(map, path, errors) {
  validateModelMap(map, path, Object.keys(agentCategories), errors, {
    normalizeKeys: false,
    categoryForKey: (agentName) => agentCategories[agentName],
  });
}

function validatePermissionProfiles(value, path, errors) {
  if (!isObject(value)) {
    errors.push(`${path} must be an object`);
    return;
  }

  const allowedKeys = new Set(["enabled", "scope", "expires_at", "reason", "hard_review"]);
  for (const key of Object.keys(value)) {
    if (!allowedKeys.has(key)) errors.push(`${path}.${key} is not supported`);
  }

  if (!Array.isArray(value.enabled)) {
    errors.push(`${path}.enabled must be an array of profile names`);
  } else {
    const seen = new Set();
    for (const [index, profile] of value.enabled.entries()) {
      if (!permissionProfileNames.includes(profile)) {
        errors.push(`${path}.enabled[${index}] is not a supported profile; use one of ${permissionProfileNames.join(", ")}`);
        continue;
      }
      if (seen.has(profile)) errors.push(`${path}.enabled[${index}] duplicates an earlier profile`);
      seen.add(profile);
    }
    if (seen.has("trusted_ops") && value.hard_review !== true) {
      errors.push(`${path}.hard_review must be true when trusted_ops is enabled`);
    }
    if (seen.has("readonly") && seen.has("trusted_ops")) {
      errors.push(`${path}.enabled must not combine readonly and trusted_ops in one profile set`);
    }
  }

  if (value.scope !== "repo") {
    errors.push(`${path}.scope must be "repo"`);
  }
  if (typeof value.reason !== "string" || value.reason.trim().length < 8) {
    errors.push(`${path}.reason must be a non-empty approval reason of at least 8 characters`);
  } else if (sensitiveValuePattern.test(value.reason)) {
    errors.push(`${path}.reason must not contain secret-like material`);
  } else if (/\r|\n/.test(value.reason)) {
    errors.push(`${path}.reason must be a single-line approval reason`);
  }
  if (typeof value.expires_at !== "string" || Number.isNaN(Date.parse(value.expires_at))) {
    errors.push(`${path}.expires_at must be an ISO timestamp string`);
  } else if (Date.parse(value.expires_at) <= Date.now()) {
    errors.push(`${path}.expires_at must be in the future`);
  }
  if ("hard_review" in value && typeof value.hard_review !== "boolean") {
    errors.push(`${path}.hard_review must be a boolean when provided`);
  }
}

function validateApprovalPackages(value, path, errors) {
  if (!Array.isArray(value)) {
    errors.push(`${path} must be an array of approval package entries`);
    return;
  }

  const seen = new Set();
  for (const [index, entry] of value.entries()) {
    const entryPath = `${path}[${index}]`;
    if (!isObject(entry)) {
      errors.push(`${entryPath} must be an object`);
      continue;
    }
    const allowedKeys = new Set(["package_id", "trace_id", "scope", "expires", "agents", "files", "reason"]);
    for (const key of Object.keys(entry)) {
      if (!allowedKeys.has(key)) errors.push(`${entryPath}.${key} is not supported`);
    }
    if (!approvalPackageNames.includes(entry.package_id)) {
      errors.push(`${entryPath}.package_id is not supported; use one of ${approvalPackageNames.join(", ")}`);
    } else if (seen.has(entry.package_id)) {
      errors.push(`${entryPath}.package_id duplicates an earlier package`);
    } else {
      seen.add(entry.package_id);
    }
    if (typeof entry.trace_id !== "string" || !/^BROS-[A-Za-z0-9._-]+$/.test(entry.trace_id)) {
      errors.push(`${entryPath}.trace_id must be a BROS-* trace id`);
    }
    if (entry.scope !== "repo") errors.push(`${entryPath}.scope must be "repo"`);
    if (entry.expires !== "session" && (typeof entry.expires !== "string" || Number.isNaN(Date.parse(entry.expires)))) {
      errors.push(`${entryPath}.expires must be "session" or an ISO timestamp string`);
    } else if (entry.expires !== "session" && Date.parse(entry.expires) <= Date.now()) {
      errors.push(`${entryPath}.expires must be in the future when an ISO timestamp is used`);
    }
    if (!Array.isArray(entry.agents) || entry.agents.length === 0) {
      errors.push(`${entryPath}.agents must be a non-empty array of owner agent names`);
    } else {
      for (const [agentIndex, agentName] of entry.agents.entries()) {
        if (!Object.hasOwn(agentCategories, agentName)) errors.push(`${entryPath}.agents[${agentIndex}] is not a supported BROS agent`);
      }
    }
    if (!Array.isArray(entry.files) || entry.files.length === 0) {
      errors.push(`${entryPath}.files must be a non-empty array of audit-only file globs`);
    } else {
      for (const [fileIndex, filePattern] of entry.files.entries()) {
        if (typeof filePattern !== "string" || filePattern.trim() === "" || sensitiveValuePattern.test(filePattern)) {
          errors.push(`${entryPath}.files[${fileIndex}] must be a non-empty non-sensitive file glob`);
        }
      }
    }
    if (typeof entry.reason !== "string" || entry.reason.trim().length < 8) {
      errors.push(`${entryPath}.reason must be a single-line approval reason of at least 8 characters`);
    } else if (sensitiveValuePattern.test(entry.reason) || /\r|\n/.test(entry.reason)) {
      errors.push(`${entryPath}.reason must not contain secret-like material or newlines`);
    }
  }
}

export function validateBrosConfig(config, source = "BROS config") {
  const errors = [];
  if (config === undefined) return errors;
  if (!isObject(config)) return [`${source} must be a JSON object`];

  for (const key of Object.keys(config)) {
    if (!allowedTopLevelKeys.has(key)) {
      errors.push(`${source}.${key} is not supported; allowed keys are $schema, fallback_models, categories, agents, routing_profiles, permission_profiles, approval_packages`);
    }
  }

  if ("$schema" in config && typeof config.$schema !== "string") {
    errors.push(`${source}.$schema must be a string when provided`);
  }
  if ("fallback_model" in config) {
    errors.push(`${source}.fallback_model is not supported; use ordered fallback_models instead`);
  }
  if ("fallback_models" in config) validateFallbackModelList(config.fallback_models, `${source}.fallback_models`, errors);

  if ("permission_profiles" in config) {
    validatePermissionProfiles(config.permission_profiles, `${source}.permission_profiles`, errors);
  }

  if ("categories" in config) {
    validateCategoriesMap(config.categories, `${source}.categories`, errors);
  }

  if ("routing_profiles" in config) {
    validateRoutingProfilesMap(config.routing_profiles, `${source}.routing_profiles`, errors);
  }

  if ("agents" in config) {
    validateAgentsMap(config.agents, `${source}.agents`, errors);
  }

  if ("approval_packages" in config) {
    validateApprovalPackages(config.approval_packages, `${source}.approval_packages`, errors);
  }

  return errors;
}

function normalizeModelEntry(entry) {
  if (typeof entry === "string") return { model: entry.trim() };
  const normalized = { model: entry.model.trim() };
  if (typeof entry.variant === "string") normalized.variant = entry.variant.trim();
  if (Array.isArray(entry.fallback_models)) normalized.fallback_models = entry.fallback_models.map((model) => model.trim());
  return normalized;
}

function normalizeFallbackModelList(entries = []) {
  return entries.map((entry) => normalizeModelEntry(entry));
}

function normalizeModelMap(modelMap = {}, { normalizeKeys = true } = {}) {
  const normalized = {};
  const warnings = [];
  for (const [rawKey, entry] of Object.entries(modelMap)) {
    const key = normalizeKeys ? normalizeCategory(rawKey) : rawKey;
    if (normalized[key]) warnings.push(`${normalizeKeys ? "categories" : "model map"} defines duplicate category ${key} via aliases; later source wins`);
    normalized[key] = normalizeModelEntry(entry);
  }
  return { normalized, warnings };
}

function normalizeRoutingProfiles(profiles = {}) {
  const normalized = {};
  const warnings = [];
  for (const [depth, profile] of Object.entries(profiles)) {
    const result = normalizeModelMap(profile ?? {});
    normalized[depth] = result.normalized;
    warnings.push(...result.warnings.map((warning) => `routing_profiles.${depth}: ${warning}`));
  }
  return { normalized, warnings };
}

function normalizeApprovalPackages(packages = []) {
  return packages.map((entry) => ({
    package_id: entry.package_id,
    trace_id: entry.trace_id.trim(),
    scope: entry.scope,
    expires: entry.expires,
    agents: [...entry.agents],
    files: entry.files.map((filePattern) => filePattern.trim()),
    reason: entry.reason.trim(),
  }));
}

function mergeConfig(base, override) {
  const next = {
    ...base,
    ...override,
    categories: {
      ...(base.categories ?? {}),
      ...(override.categories ?? {}),
    },
    agents: {
      ...(base.agents ?? {}),
      ...(override.agents ?? {}),
    },
    routing_profiles: {
      ...(base.routing_profiles ?? {}),
      ...(override.routing_profiles ?? {}),
    },
    permission_profiles: override.permission_profiles ?? base.permission_profiles,
    approval_packages: override.approval_packages ?? base.approval_packages,
  };
  if (!base.categories && !override.categories) delete next.categories;
  if (!base.agents && !override.agents) delete next.agents;
  if (!base.routing_profiles && !override.routing_profiles) delete next.routing_profiles;
  if (!base.permission_profiles && !override.permission_profiles) delete next.permission_profiles;
  if (!base.approval_packages && !override.approval_packages) delete next.approval_packages;
  return next;
}

function extractPluginBrosConfig(input) {
  if (!isObject(input)) return undefined;

  if (input.bros_harness !== undefined) return input.bros_harness;
  if (input.brosHarness !== undefined) return input.brosHarness;

  const hasUnwrappedBrosConfig = Object.keys(input).some((key) => allowedTopLevelKeys.has(key) || removedTopLevelKeys.has(key));
  if (!hasUnwrappedBrosConfig) return undefined;

  const config = {};
  for (const key of Object.keys(input)) {
    if (!ignoredOpenCodePluginInputKeys.has(key)) config[key] = input[key];
  }

  return Object.keys(config).length > 0 ? config : undefined;
}

async function readJsonIfPresent(path, label) {
  try {
    await access(path);
  } catch {
    return { config: undefined, source: label, path };
  }

  try {
    return { config: JSON.parse(await readFile(path, "utf8")), source: label, path };
  } catch (error) {
    throw new Error(`Invalid ${label} at ${path}: ${error instanceof Error ? error.message : String(error)}`);
  }
}

export async function loadBrosConfigSources({ cwd = process.cwd(), input = {}, includeFiles = true } = {}) {
  const sources = [];
  if (includeFiles) {
    sources.push(await readJsonIfPresent(globalConfigPath, "global BROS config"));
    sources.push(await readJsonIfPresent(resolve(cwd, configFileName), "repo BROS config"));
  }
  const pluginConfig = extractPluginBrosConfig(input);
  if (pluginConfig !== undefined) {
    sources.push({ config: pluginConfig, source: "OpenCode plugin input", path: "plugin input" });
  }
  return sources.filter((entry) => entry.config !== undefined);
}

export function resolveBrosConfig(sources = []) {
  const errors = [];
  const warnings = [];
  let resolved = {};

  for (const { config, source, path } of sources) {
    const sourceLabel = path ? `${source} (${path})` : source;
    const sourceErrors = validateBrosConfig(config, sourceLabel);
    errors.push(...sourceErrors);
    if (sourceErrors.length === 0) resolved = mergeConfig(resolved, config);
  }

  if (errors.length > 0) {
    return { config: undefined, errors, warnings, categories: {}, agents: {}, fallbackModels: [] };
  }

  const fallbackModels = normalizeFallbackModelList(resolved.fallback_models ?? []);
  const { normalized: categories, warnings: categoryWarnings } = normalizeModelMap(resolved.categories ?? {});
  const { normalized: routingProfiles, warnings: routingProfileWarnings } = normalizeRoutingProfiles(resolved.routing_profiles ?? {});
  for (const rawKey of Object.keys(resolved.categories ?? {})) {
    const normalizedKey = normalizeCategory(rawKey);
    if (rawKey !== normalizedKey && categories[normalizedKey] && !Object.hasOwn(categories, rawKey)) {
      Object.defineProperty(categories, rawKey, {
        value: categories[normalizedKey],
        enumerable: false,
      });
    }
  }
  const { normalized: agentRouting } = normalizeModelMap(resolved.agents ?? {}, { normalizeKeys: false });
  warnings.push(...categoryWarnings, ...routingProfileWarnings);
  if (Object.keys(routingProfiles).length > 0) {
    warnings.push("routing_profiles are validated resolver inputs; default OpenCode plugin startup does not infer per-message workflow depth, so use agents or base categories for startup model propagation unless a caller passes an explicit depth");
  }
  const permissionProfiles = resolved.permission_profiles
    ? {
        enabled: [...resolved.permission_profiles.enabled],
        scope: resolved.permission_profiles.scope,
        expires_at: resolved.permission_profiles.expires_at,
        reason: resolved.permission_profiles.reason.trim(),
        hard_review: resolved.permission_profiles.hard_review === true,
      }
    : undefined;
  const approvalPackages = normalizeApprovalPackages(resolved.approval_packages ?? []);
  if (fallbackModels.length > 0) {
    for (const category of fallbackRestrictedCategories) {
      if (!categories[category]) {
        warnings.push(`fallback_models will not be applied to ${category}; set categories.${category} explicitly to change that category`);
      }
    }
  }

  return {
    config: resolved,
    errors,
    warnings,
    fallbackModels,
    categories,
    routingProfiles,
    agents: agentRouting,
    permissionProfiles,
    approvalPackages,
  };
}

export async function loadResolvedBrosConfig(options = {}) {
  return resolveBrosConfig(await loadBrosConfigSources(options));
}

export function resolveModelRouteForAgent(agentName, resolvedConfig, { allowFallback = true, depth } = {}) {
  const category = agentCategories[agentName];
  if (!category) return undefined;

  const categoryRouting = resolvedConfig?.categories ?? {};
  const depthRouting = depth ? resolvedConfig?.routingProfiles?.[depth] ?? {} : {};
  const agentRouting = resolvedConfig?.agents ?? {};
  const globalFallbackModels = resolvedConfig?.fallbackModels ?? [];
  const primaryFallbackEntry = globalFallbackModels[0];
  const primaryFallbackModel = primaryFallbackEntry?.model;

  let route;
  let source;
  if (agentRouting[agentName]) {
    route = agentRouting[agentName];
    source = "agents";
  } else if (depthRouting[category]) {
    route = depthRouting[category];
    source = `routing_profiles.${depth}`;
  } else if (categoryRouting[category]) {
    route = categoryRouting[category];
    source = "categories";
  }

  const explicitModel = typeof route === "string" ? route : route?.model;
  if (explicitModel) {
    return {
      agent: agentName,
      category,
      model: explicitModel,
      variant: typeof route === "object" ? route.variant : undefined,
      source,
      fallback_count: typeof route === "object" ? route.fallback_models?.length ?? 0 : 0,
    };
  }

  const canUseFallback = allowFallback && !fallbackRestrictedCategories.has(category);
  if (canUseFallback && primaryFallbackModel) {
    return {
      agent: agentName,
      category,
      model: primaryFallbackModel,
      variant: primaryFallbackEntry?.variant,
      source: "fallback_models",
      fallback_count: globalFallbackModels.length,
    };
  }

  return undefined;
}

export function applyModelRoutingToAgents(agents, resolvedConfig, options = {}) {
  const routedAgents = {};
  const events = [];

  for (const [agentName, agent] of Object.entries(agents)) {
    const route = resolveModelRouteForAgent(agentName, resolvedConfig, options);
    const selectedModel = route?.model ?? agent.model;
    const finalAgent = selectedModel ? { ...agent, model: selectedModel } : { ...agent };
    if (route?.variant && !finalAgent.variant) finalAgent.variant = route.variant;
    routedAgents[agentName] = finalAgent;

    if (route && route.model !== agent.model) {
      events.push(route);
    }
  }

  return { agents: routedAgents, events };
}

function packagePermissionForAgent(agentName, packageEntry) {
  const preset = approvalPackagePresets[packageEntry.package_id];
  if (!preset || !preset.agents.includes(agentName) || !packageEntry.agents.includes(agentName)) return undefined;
  return { bash: preset.bash };
}

function mergePermission(basePermission = {}, profilePermission = {}) {
  const next = { ...basePermission };
  for (const [key, value] of Object.entries(profilePermission)) {
    if (key === "bash" && isObject(value)) {
      const baseBash = isObject(next.bash) ? next.bash : { "*": next.bash ?? "ask" };
      next.bash = {
        ...baseBash,
        ...value,
        ...enforcedDangerousBashDenies,
      };
    } else if (key === "external_directory") {
      next.external_directory = value === "allow" ? "ask" : value;
    } else {
      next[key] = value;
    }
  }
  if (isObject(next.bash)) {
    next.bash = { ...next.bash, ...enforcedDangerousBashDenies };
  }
  return next;
}

export function applyPermissionProfilesToAgents(agents, resolvedConfig) {
  const activeProfiles = resolvedConfig?.permissionProfiles?.enabled ?? [];
  const activePackages = resolvedConfig?.approvalPackages ?? [];
  if (activeProfiles.length === 0 && activePackages.length === 0) return { agents, events: [] };

  const profiledAgents = Object.fromEntries(
    Object.entries(agents).map(([name, agent]) => [name, { ...agent, permission: { ...(agent.permission ?? {}) } }]),
  );
  const events = [];

  for (const profileName of activeProfiles) {
    const profile = permissionProfileRules[profileName];
    if (!profile) continue;
    for (const agentName of profile.agents) {
      if (!profiledAgents[agentName]) continue;
      profiledAgents[agentName] = {
        ...profiledAgents[agentName],
        permission: mergePermission(profiledAgents[agentName].permission, profile.permission),
      };
      events.push({
        agent: agentName,
        profile: profileName,
        scope: resolvedConfig.permissionProfiles.scope,
        expires_at: resolvedConfig.permissionProfiles.expires_at,
        reason: resolvedConfig.permissionProfiles.reason,
      });
    }
  }

  for (const packageEntry of activePackages) {
    for (const agentName of packageEntry.agents) {
      const packagePermission = packagePermissionForAgent(agentName, packageEntry);
      if (!profiledAgents[agentName] || !packagePermission) continue;
      profiledAgents[agentName] = {
        ...profiledAgents[agentName],
        permission: mergePermission(profiledAgents[agentName].permission, packagePermission),
      };
      events.push({
        agent: agentName,
        approval_package: packageEntry.package_id,
        trace_id: packageEntry.trace_id,
        scope: packageEntry.scope,
        expires: packageEntry.expires,
        files: packageEntry.files,
        reason: packageEntry.reason,
      });
    }
  }

  return { agents: profiledAgents, events };
}

export const brosConfigDefaults = Object.freeze({
  fileName: configFileName,
  globalConfigPath,
  repoConfigPath: `./${configFileName}`,
  categories: routingCategories,
  categoryRegistry: routingCategoryRegistry,
  categoryAliases,
  agentCategories,
  modelEntryShape: "string or object with model, optional variant, and optional fallback_models array",
  modelEntryAliases: Object.keys(categoryAliases),
  agentNames: Object.keys(agentCategories),
  routingProfiles: routingProfileNames,
  approvalPackages: approvalPackageNames,
  restrictedCategoryMessage: `fallback_models is not allowed for restricted category <category>; restricted categories are ${restrictedCategoryList}`,
  fallbackRestrictedCategories: [...fallbackRestrictedCategories],
  permissionProfiles: permissionProfileNames,
});
