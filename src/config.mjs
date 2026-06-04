import { access, readFile } from "node:fs/promises";
import { homedir } from "node:os";
import { join, resolve } from "node:path";

const configFileName = "bros.config.json";
const globalConfigPath = join(homedir(), ".config", "bros-harness", configFileName);

export const modelRoutingCategories = Object.freeze([
  "planner",
  "explorer_search",
  "coder_build",
  "security",
  "qa_review",
  "docs",
  "design",
  "ops",
]);

const categoryAliases = Object.freeze({
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
  designer: "design",
  reviewer: "qa_review",
});

const agentCategories = Object.freeze({
  "mighty-bro": "planner",
  "bro-explore": "explorer_search",
  "bro-build": "coder_build",
  "bro-shield": "security",
  "bro-test": "qa_review",
  "bro-docs": "docs",
  "bro-design": "design",
  "bro-ui": "design",
  "bro-ops": "ops",
});

const fallbackRestrictedCategories = new Set(["coder_build", "security", "qa_review", "ops"]);
export const permissionProfileNames = Object.freeze(["readonly", "review_safe", "build_limited", "trusted_ops"]);

const allowedTopLevelKeys = new Set(["$schema", "fallback_model", "model_routing", "categories", "agents", "permission_profiles"]);
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
        "npm pack --dry-run": "allow",
      },
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
  const seenFallbacks = new Set();
  for (const [index, fallbackModel] of value.fallback_models.entries()) {
    const fallbackPath = `${path}.fallback_models[${index}]`;
    validateModelValue(fallbackModel, fallbackPath, errors);
    if (typeof fallbackModel !== "string") continue;
    if (seenFallbacks.has(fallbackModel)) errors.push(`${path}.fallback_models contains duplicate model ${fallbackModel}`);
    seenFallbacks.add(fallbackModel);
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
  validateModelMap(map, path, [...modelRoutingCategories, ...Object.keys(categoryAliases)], errors, {
    categoryForKey: (_rawCategory, normalizedCategory) => normalizedCategory,
  });
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
    for (const profile of value.enabled) {
      if (!permissionProfileNames.includes(profile)) {
        errors.push(`${path}.enabled contains unsupported profile ${JSON.stringify(profile)}; use one of ${permissionProfileNames.join(", ")}`);
        continue;
      }
      if (seen.has(profile)) errors.push(`${path}.enabled contains duplicate profile ${profile}`);
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

export function validateBrosConfig(config, source = "BROS config") {
  const errors = [];
  if (config === undefined) return errors;
  if (!isObject(config)) return [`${source} must be a JSON object`];

  for (const key of Object.keys(config)) {
    if (!allowedTopLevelKeys.has(key)) {
      errors.push(`${source}.${key} is not supported; allowed keys are $schema, fallback_model, model_routing, categories, agents, permission_profiles`);
    }
  }

  if ("$schema" in config && typeof config.$schema !== "string") {
    errors.push(`${source}.$schema must be a string when provided`);
  }
  if ("fallback_model" in config) validateModelValue(config.fallback_model, `${source}.fallback_model`, errors);

  if ("permission_profiles" in config) {
    validatePermissionProfiles(config.permission_profiles, `${source}.permission_profiles`, errors);
  }

  if ("model_routing" in config) {
    validateModelMap(config.model_routing, `${source}.model_routing`, [...modelRoutingCategories, ...Object.keys(categoryAliases)], errors, {
      categoryForKey: (_rawCategory, category) => category,
    });
  }

  if ("categories" in config) {
    validateCategoriesMap(config.categories, `${source}.categories`, errors);
  }

  if ("agents" in config) {
    validateAgentsMap(config.agents, `${source}.agents`, errors);
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

function normalizeModelMap(modelMap = {}, { normalizeKeys = true } = {}) {
  const normalized = {};
  const warnings = [];
  for (const [rawKey, entry] of Object.entries(modelMap)) {
    const key = normalizeKeys ? normalizeCategory(rawKey) : rawKey;
    if (normalized[key]) warnings.push(`${normalizeKeys ? "model_routing" : "model map"} defines duplicate category ${key} via aliases; later source wins`);
    normalized[key] = normalizeModelEntry(entry);
  }
  return { normalized, warnings };
}

function mergeConfig(base, override) {
  const next = {
    ...base,
    ...override,
    model_routing: {
      ...(base.model_routing ?? {}),
      ...(override.model_routing ?? {}),
    },
    categories: {
      ...(base.categories ?? {}),
      ...(override.categories ?? {}),
    },
    agents: {
      ...(base.agents ?? {}),
      ...(override.agents ?? {}),
    },
    permission_profiles: override.permission_profiles ?? base.permission_profiles,
  };
  if (!base.model_routing && !override.model_routing) delete next.model_routing;
  if (!base.categories && !override.categories) delete next.categories;
  if (!base.agents && !override.agents) delete next.agents;
  if (!base.permission_profiles && !override.permission_profiles) delete next.permission_profiles;
  return next;
}

function extractPluginBrosConfig(input) {
  if (!isObject(input)) return undefined;

  if (input.bros_harness !== undefined) return input.bros_harness;
  if (input.brosHarness !== undefined) return input.brosHarness;

  const config = {};
  for (const key of allowedTopLevelKeys) {
    if (key in input) config[key] = input[key];
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
    return { config: undefined, errors, warnings, modelRouting: {} };
  }

  const fallbackModel = resolved.fallback_model?.trim();
  const { normalized: modelRouting, warnings: routingWarnings } = normalizeModelMap(resolved.model_routing ?? {});
  const { normalized: categories, warnings: categoryWarnings } = normalizeModelMap(resolved.categories ?? {});
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
  warnings.push(...routingWarnings);
  warnings.push(...categoryWarnings);
  const permissionProfiles = resolved.permission_profiles
    ? {
        enabled: [...resolved.permission_profiles.enabled],
        scope: resolved.permission_profiles.scope,
        expires_at: resolved.permission_profiles.expires_at,
        reason: resolved.permission_profiles.reason.trim(),
        hard_review: resolved.permission_profiles.hard_review === true,
      }
    : undefined;
  if (fallbackModel) {
    for (const category of fallbackRestrictedCategories) {
      if (!modelRouting[category]) {
        warnings.push(`fallback_model will not be applied to ${category}; set model_routing.${category} explicitly to change that category`);
      }
    }
  }

  return {
    config: resolved,
    errors,
    warnings,
    fallbackModel,
    modelRouting,
    categories,
    agents: agentRouting,
    permissionProfiles,
  };
}

export async function loadResolvedBrosConfig(options = {}) {
  return resolveBrosConfig(await loadBrosConfigSources(options));
}

export function applyModelRoutingToAgents(agents, resolvedConfig) {
  const routedAgents = {};
  const events = [];
  const routing = resolvedConfig?.modelRouting ?? {};
  const categoryRouting = resolvedConfig?.categories ?? {};
  const agentRouting = resolvedConfig?.agents ?? {};
  const fallbackModel = resolvedConfig?.fallbackModel;

  for (const [agentName, agent] of Object.entries(agents)) {
    const category = agentCategories[agentName];
    let route;
    let source;
    if (agentRouting[agentName]) {
      route = agentRouting[agentName];
      source = "agents";
    } else if (category && categoryRouting[category]) {
      route = categoryRouting[category];
      source = "categories";
    } else if (category && routing[category]) {
      route = routing[category];
      source = "model_routing";
    }
    const explicitModel = typeof route === "string" ? route : route?.model;
    const variant = typeof route === "object" ? route.variant : undefined;
    const fallbackList = typeof route === "object" ? route.fallback_models ?? [] : [];
    const canUseFallback = category && !fallbackRestrictedCategories.has(category);
    const fallbackApplied = !explicitModel && canUseFallback && fallbackModel;
    const selectedModel = explicitModel ?? (fallbackApplied ? fallbackModel : agent.model);
    const finalAgent = selectedModel ? { ...agent, model: selectedModel } : { ...agent };
    if (variant && !finalAgent.variant) finalAgent.variant = variant;
    routedAgents[agentName] = finalAgent;

    if (explicitModel && explicitModel !== agent.model) {
      events.push({ agent: agentName, category, model: explicitModel, variant, source, fallback_count: fallbackList.length });
    } else if (fallbackApplied && fallbackModel !== agent.model) {
      events.push({ agent: agentName, category, model: fallbackModel, source: "fallback_model" });
    }
  }

  return { agents: routedAgents, events };
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
  if (activeProfiles.length === 0) return { agents, events: [] };

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

  return { agents: profiledAgents, events };
}

export const brosConfigDefaults = Object.freeze({
  fileName: configFileName,
  globalConfigPath,
  repoConfigPath: `./${configFileName}`,
  categories: modelRoutingCategories,
  modelEntryShape: "string or object with model, optional variant, and optional fallback_models array",
  modelEntryAliases: Object.keys(categoryAliases),
  agentNames: Object.keys(agentCategories),
  restrictedCategoryMessage: `fallback_models is not allowed for restricted category <category>; restricted categories are ${restrictedCategoryList}`,
  fallbackRestrictedCategories: [...fallbackRestrictedCategories],
  permissionProfiles: permissionProfileNames,
});
