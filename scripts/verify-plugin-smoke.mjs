#!/usr/bin/env node
import { assertNoForbiddenConfigMutation, snapshotForbiddenConfig } from "../src/security-invariants.mjs";
import { brosHarnessServer, formatBrosHarnessPackageSpec, loadBrosHarnessPackageInfo } from "../src/plugin.mjs";
import { applyModelRoutingToAgents, applyPermissionProfilesToAgents, resolveBrosConfig, resolveModelRouteForAgent, routingCategoryRegistry } from "../src/config.mjs";

const packageInfo = await loadBrosHarnessPackageInfo();
const smokeOptions = { includeFiles: false, configLogging: false };
const server = await brosHarnessServer({}, smokeOptions);
const cfg = {
  permission: {
    bash: {
      "git config --global credential*": "deny",
      "npm token *": "deny",
      "gh auth token*": "deny",
    },
  },
};

server.config(cfg);

const openCodeRuntimeServer = await brosHarnessServer({
  client: {},
  project: {},
  worktree: {},
  directory: process.cwd(),
  experimental_workspace: false,
  serverUrl: "http://127.0.0.1:0",
  $: {},
}, smokeOptions);
const openCodeRuntimeCfg = {};
openCodeRuntimeServer.config(openCodeRuntimeCfg);
if (!openCodeRuntimeCfg.agent?.["mighty-bro"]) {
  throw new Error("Plugin smoke failed: OpenCode runtime input prevented BROS agent registration");
}

const namespacedInputServer = await brosHarnessServer({
  client: {},
  bros_harness: { fallback_models: ["openai/gpt-5.4-mini-fast"] },
}, smokeOptions);
const namespacedInputCfg = {};
namespacedInputServer.config(namespacedInputCfg);
if (namespacedInputCfg.agent?.["bro-docs"]?.model !== "openai/gpt-5.4-mini-fast") {
  throw new Error("Plugin smoke failed: namespaced OpenCode plugin input was not applied");
}

const preexistingAgentServer = await brosHarnessServer({
  bros_harness: {
    agents: { "bro-build": "test-provider/preexisting-build-model" },
    categories: {
      security: "test-provider/preexisting-security-model",
      qa_review: "test-provider/preexisting-qa-model",
    },
  },
}, smokeOptions);
const preexistingPermission = { bash: { "*": "deny" } };
const preexistingCfg = {
  agent: {
    "bro-build": {
      model: "test-provider/original-build-model",
      prompt: "preexisting build prompt",
      permission: preexistingPermission,
      mode: "subagent",
      tools: { read: true },
    },
    "bro-shield": {
      prompt: "preexisting shield prompt",
      permission: preexistingPermission,
    },
    "bro-test": {
      model: "test-provider/original-qa-model",
      prompt: "preexisting qa prompt",
    },
    "not-a-bro": {
      model: "test-provider/original-unknown-model",
      prompt: "unknown prompt",
    },
  },
};
preexistingAgentServer.config(preexistingCfg);
if (preexistingCfg.agent["bro-build"].model !== "test-provider/preexisting-build-model") {
  throw new Error("Plugin smoke failed: preexisting bro-build model was not patched from explicit agent routing");
}
if (preexistingCfg.agent["bro-build"].prompt !== "preexisting build prompt"
  || preexistingCfg.agent["bro-build"].permission !== preexistingPermission
  || preexistingCfg.agent["bro-build"].mode !== "subagent"
  || preexistingCfg.agent["bro-build"].tools.read !== true) {
  throw new Error("Plugin smoke failed: preexisting bro-build non-model fields were overwritten");
}
if (preexistingCfg.agent["bro-shield"].model !== "test-provider/preexisting-security-model") {
  throw new Error("Plugin smoke failed: preexisting bro-shield model was not patched from explicit category routing");
}
if (preexistingCfg.agent["bro-shield"].prompt !== "preexisting shield prompt"
  || preexistingCfg.agent["bro-shield"].permission !== preexistingPermission) {
  throw new Error("Plugin smoke failed: preexisting bro-shield prompt or permission was overwritten");
}
if (preexistingCfg.agent["bro-test"].model !== "test-provider/preexisting-qa-model"
  || preexistingCfg.agent["bro-test"].prompt !== "preexisting qa prompt") {
  throw new Error("Plugin smoke failed: preexisting bro-test category routing patch failed or changed prompt");
}
if (preexistingCfg.agent["not-a-bro"].model !== "test-provider/original-unknown-model") {
  throw new Error("Plugin smoke failed: unknown preexisting agent model was patched");
}

const fallbackPreexistingServer = await brosHarnessServer({
  bros_harness: { fallback_models: ["test-provider/fallback-model"] },
}, smokeOptions);
const fallbackPreexistingCfg = {
  agent: {
    "bro-build": { model: "test-provider/original-build-model" },
    "bro-shield": { model: "test-provider/original-shield-model" },
    "bro-test": { model: "test-provider/original-test-model" },
    "bro-ops": { model: "test-provider/original-ops-model" },
  },
};
fallbackPreexistingServer.config(fallbackPreexistingCfg);
if (fallbackPreexistingCfg.agent["bro-build"].model !== "test-provider/original-build-model"
  || fallbackPreexistingCfg.agent["bro-shield"].model !== "test-provider/original-shield-model"
  || fallbackPreexistingCfg.agent["bro-test"].model !== "test-provider/original-test-model"
  || fallbackPreexistingCfg.agent["bro-ops"].model !== "test-provider/original-ops-model") {
  throw new Error("Plugin smoke failed: fallback_models changed a restricted preexisting BROS agent");
}

const forbiddenBefore = snapshotForbiddenConfig({});
assertNoForbiddenConfigMutation(forbiddenBefore, {
  agent: {
    smoke: {
      permission: {
        bash: {
          "git config --global credential*": "deny",
          "npm token *": "deny",
          "gh auth token*": "deny",
        },
      },
    },
  },
});

let rejectedSecretLikeAgent = false;
try {
  assertNoForbiddenConfigMutation(forbiddenBefore, {
    agent: {
      unsafe: {
        ["api" + "Key"]: "1234567890abcdef",
      },
    },
  });
} catch (error) {
  rejectedSecretLikeAgent = /secret-like agent/.test(error.message);
}

if (!rejectedSecretLikeAgent) {
  throw new Error("Plugin smoke failed: secret-like agent config was not rejected");
}

const invalidConfig = resolveBrosConfig([{ source: "test", path: "test", config: { categories: { security: "" } } }]);
if (!invalidConfig.errors.some((error) => error.includes("categories.security"))) {
  throw new Error("Plugin smoke failed: invalid category routing did not produce an actionable error");
}

const fallbackConfig = resolveBrosConfig([{ source: "test", path: "test", config: { fallback_models: [{ model: "openai/gpt-5.4", variant: "medium" }, "openai/gpt-5.4-mini-fast"] } }]);
const routedFallback = applyModelRoutingToAgents({
  "bro-docs": {},
  "bro-build": {},
}, fallbackConfig);
if (routedFallback.agents["bro-docs"].model !== "openai/gpt-5.4" || routedFallback.agents["bro-docs"].variant !== "medium") {
  throw new Error("Plugin smoke failed: fallback_models first object was not applied to unrestricted docs category");
}
if ("model" in routedFallback.agents["bro-build"]) {
  throw new Error("Plugin smoke failed: fallback_models forced a model onto restricted coder/build category");
}

const explicitConfig = resolveBrosConfig([{ source: "test", path: "test", config: { categories: { coder_build: "test-provider/coder-build-model" } } }]);
const routedExplicit = applyModelRoutingToAgents({ "bro-build": {} }, explicitConfig);
if (routedExplicit.agents["bro-build"].model !== "test-provider/coder-build-model") {
  throw new Error("Plugin smoke failed: explicit coder/build model route was not applied");
}

const legacyRoute = resolveModelRouteForAgent("bro-shield", {
  modelRouting: { security: { model: "test-provider/legacy-security-model" } },
  categories: {},
  agents: {},
  fallbackModels: [],
});
if (legacyRoute !== undefined) {
  throw new Error("Plugin smoke failed: removed modelRouting branch still affects routing");
}

for (const [category, definition] of Object.entries(routingCategoryRegistry)) {
  if (!definition.description || !definition.workflowResponsibility || definition.capabilities.length === 0) {
    throw new Error(`Plugin smoke failed: category ${category} lacks semantic registry metadata`);
  }
  if (definition.permissionAuthority !== false || Object.hasOwn(definition, "permission")) {
    throw new Error(`Plugin smoke failed: category ${category} metadata became permission authority`);
  }
}

const inheritConfig = resolveBrosConfig([{ source: "test", path: "test", config: {} }]);
const routedInherit = applyModelRoutingToAgents({ "bro-docs": {}, "bro-build": {} }, inheritConfig);
if ("model" in routedInherit.agents["bro-docs"] || "model" in routedInherit.agents["bro-build"]) {
  throw new Error("Plugin smoke failed: agents without configured routing did not inherit OpenCode default model");
}

const futureExpiry = new Date(Date.now() + 60 * 60 * 1000).toISOString();
const profileConfig = resolveBrosConfig([{ source: "test", path: "test", config: {
    routing_profiles: {
      quick: { docs: "test/quick-docs" },
      critical: { security: "test/critical-security" },
    },
    permission_profiles: {
      enabled: ["build_limited", "trusted_ops"],
      scope: "repo",
      expires_at: futureExpiry,
      reason: "approved local validation smoke test",
      hard_review: true,
    },
    approval_packages: [
      {
        package_id: "release_dry_run",
        trace_id: "BROS-SMOKE-001",
        scope: "repo",
        expires: "session",
        agents: ["bro-build", "bro-shield"],
        files: ["src/**", "assets/**", "docs/**"],
        reason: "approved package dry run smoke",
      },
    ],
} }]);
if (profileConfig.errors.length > 0) {
  throw new Error(`Plugin smoke failed: valid permission profile config was rejected: ${profileConfig.errors.join("; ")}`);
}
const profiled = applyPermissionProfilesToAgents({
  "bro-build": { permission: { bash: { "*": "ask" } } },
  "bro-shield": { permission: { bash: { "*": "deny" } } },
  "bro-ops": { permission: { bash: { "*": "ask" } } },
}, profileConfig);
if (profiled.agents["bro-build"].permission.bash["npm run validate"] !== "allow") {
  throw new Error("Plugin smoke failed: build_limited did not allow scoped local validation");
}
if (profiled.agents["bro-build"].permission.bash["npm run verify:no-secrets"] !== "allow"
  || profiled.agents["bro-build"].permission.bash["npm run verify:package"] !== "allow") {
  throw new Error("Plugin smoke failed: build_limited did not allow exact release validation aliases");
}
if (profiled.agents["bro-build"].permission.bash["npm publish*"] !== "deny") {
  throw new Error("Plugin smoke failed: dangerous npm publish was not denied after profile merge");
}
if (profiled.agents["bro-ops"].permission.bash["git push --force*"] !== "deny") {
  throw new Error("Plugin smoke failed: force push was not denied after trusted_ops merge");
}
if (profiled.agents["bro-shield"].permission.bash["npm pack --dry-run"] !== "allow") {
  throw new Error("Plugin smoke failed: release_dry_run approval package did not allow scoped dry-run for bro-shield");
}
if (Object.hasOwn(profiled.agents["bro-shield"].permission, "external_directory")
  || Object.keys(profiled.agents["bro-shield"].permission.bash).some((pattern) => pattern.includes("src/**") || pattern.includes("assets/**"))) {
  throw new Error("Plugin smoke failed: approval package files were treated as runtime file-scope enforcement instead of audit metadata");
}
if (profiled.agents["bro-build"].permission.bash["npm publish*"] !== "deny") {
  throw new Error("Plugin smoke failed: approval package reopened publish");
}

const unsafeProfileConfig = resolveBrosConfig([{ source: "test", path: "test", config: {
  permission_profiles: {
    enabled: ["readonly", "trusted_ops"],
    scope: "repo",
    expires_at: futureExpiry,
    reason: "unsafe combination smoke test",
  },
} }]);
if (!unsafeProfileConfig.errors.some((error) => error.includes("hard_review"))
  || !unsafeProfileConfig.errors.some((error) => error.includes("must not combine readonly and trusted_ops"))) {
  throw new Error("Plugin smoke failed: unsafe permission profile combination was not rejected");
}

const buildBash = cfg.agent?.["bro-build"]?.permission?.bash;
if (!buildBash || buildBash["*"] !== "ask") {
  throw new Error("Plugin smoke failed: bro-build default did not ask-gate unmatched local bash");
}
if (buildBash["git status*"] !== "allow" || buildBash["git grep*"] !== "allow" || buildBash["git worktree list*"] !== "allow") {
  throw new Error("Plugin smoke failed: bro-build default did not allow harmless git inspection");
}
if (buildBash["npm run *"] !== "ask" || buildBash["docker compose logs*"] !== "allow" || buildBash["gh pr diff *"] !== "allow") {
  throw new Error("Plugin smoke failed: bro-build default did not keep broad npm scripts ask-gated while allowing Docker/GitHub inspection");
}
if (buildBash["npm run validate"] !== "allow" || buildBash["npm run validate:*"] !== "allow" || buildBash["npm run verify:*"] !== "allow" || buildBash["node bin/bros.mjs doctor"] !== "allow") {
  throw new Error("Plugin smoke failed: bro-build default did not allow explicit local validation and helper commands");
}
if (buildBash["git remote *"] !== "ask" || buildBash["git checkout*"] !== "ask" || buildBash["git switch*"] !== "ask"
  || buildBash["git add *"] !== "ask" || buildBash["git commit -m *"] !== "ask" || buildBash["git push -u origin *"] !== "ask"
  || buildBash["git restore*"] !== "ask" || buildBash["git reset*"] !== "ask" || buildBash["git branch -d*"] !== "ask") {
  throw new Error("Plugin smoke failed: bro-build default did not preserve ask gates for git mutation");
}
if (buildBash["npm install*"] !== "ask" || buildBash["pnpm add*"] !== "ask" || buildBash["yarn add*"] !== "ask" || buildBash["bun add*"] !== "ask"
  || buildBash["docker compose up*"] !== "ask" || buildBash["docker run*"] !== "ask" || buildBash["docker volume *"] !== "ask"
  || buildBash["rm *"] !== "ask") {
  throw new Error("Plugin smoke failed: bro-build default did not preserve ask gates for local mutation");
}
if (buildBash["git reset --hard*"] !== "deny" || buildBash["git push --force*"] !== "deny" || buildBash["npm publish*"] !== "deny" || buildBash["npm version *"] !== "deny") {
  throw new Error("Plugin smoke failed: bro-build default reopened destructive, force-push, publish, or release-version commands");
}
if (buildBash["cat **/.env*"] !== "deny" || buildBash["gh auth token*"] !== "deny" || buildBash["printenv*"] !== "deny" || buildBash["env*"] !== "deny") {
  throw new Error("Plugin smoke failed: bro-build default reopened secret or environment inspection commands");
}

const buildOrder = Object.keys(buildBash);
const wildcardIndex = buildOrder.indexOf("*");
const gitAddIndex = buildOrder.indexOf("git add *");
const hardDenyIndex = buildOrder.indexOf("git reset --hard*");
if (!(wildcardIndex >= 0 && wildcardIndex < gitAddIndex && gitAddIndex < hardDenyIndex)) {
  throw new Error("Plugin smoke failed: bro-build default permission order does not keep ask/deny rules after wildcard ask fallback");
}

const testBash = cfg.agent?.["bro-test"]?.permission?.bash;
if (!testBash || testBash["gh pr diff *"] !== "allow" || testBash["npx playwright test*"] !== "allow" || testBash["docker compose logs*"] !== "allow") {
  throw new Error("Plugin smoke failed: bro-test did not allow expected QA inspection commands");
}
if (testBash["npm run verify:no-secrets"] !== "allow" || testBash["npm run verify:package"] !== "allow") {
  throw new Error("Plugin smoke failed: bro-test did not allow exact release validation aliases");
}
if (testBash["git add*"] !== "deny" || testBash["docker compose up*"] !== "ask" || testBash["npm install*"] !== "ask") {
  throw new Error("Plugin smoke failed: bro-test reopened mutation commands");
}

const opsBash = cfg.agent?.["bro-ops"]?.permission?.bash;
if (!opsBash || opsBash["gh run view *"] !== "allow" || opsBash["docker compose logs*"] !== "allow" || opsBash["git grep*"] !== "allow") {
  throw new Error("Plugin smoke failed: bro-ops did not allow expected ops inspection commands");
}
if (opsBash["npm run verify:no-secrets"] !== "allow" || opsBash["npm run verify:package"] !== "allow") {
  throw new Error("Plugin smoke failed: bro-ops did not allow exact release validation aliases");
}
if (opsBash["docker compose up*"] !== "ask" || opsBash["kubectl apply*"] !== "ask" || opsBash["docker system prune*"] !== "deny") {
  throw new Error("Plugin smoke failed: bro-ops reopened operational mutation commands");
}

const shieldBash = cfg.agent?.["bro-shield"]?.permission?.bash;
if (!shieldBash || shieldBash["npm run verify:no-secrets"] !== "allow" || shieldBash["npm run verify:package"] !== "allow" || shieldBash["npm pack --dry-run"] !== "allow") {
  throw new Error("Plugin smoke failed: bro-shield did not allow exact release/security review validation aliases");
}
if (shieldBash["npm run *"] !== "deny" || shieldBash["npm pack*"] !== "deny" || shieldBash["npm publish*"] !== "deny") {
  throw new Error("Plugin smoke failed: bro-shield reopened broad npm or publish commands");
}

function assertResolvedConfigAccepted(config, description) {
  const resolved = resolveBrosConfig([{ source: "test", path: "test", config }]);
  if (resolved.errors.length > 0) {
    throw new Error(`Plugin smoke failed: ${description} was rejected: ${resolved.errors.join("; ")}`);
  }
  return resolved;
}

function assertResolvedConfigRejected(config, description, expectedFragments) {
  const resolved = resolveBrosConfig([{ source: "test", path: "test", config }]);
  if (resolved.errors.length === 0) {
    throw new Error(`Plugin smoke failed: ${description} was accepted unexpectedly`);
  }
  const errorText = resolved.errors.join("; ");
  for (const fragment of expectedFragments) {
    if (!errorText.includes(fragment)) {
      throw new Error(`Plugin smoke failed: ${description} did not include ${JSON.stringify(fragment)} in errors: ${errorText}`);
    }
  }
  return resolved;
}

assertResolvedConfigAccepted({
  categories: { explorer: { model: "test/rich", variant: "high" } },
}, "rich model entry in categories");

assertResolvedConfigAccepted({
  categories: {
    vision_engineering: "test/vision",
    agent_harness: "test/agent-harness",
    git_ops: "test/git",
    package_ops: "test/package",
    local_runtime: "test/runtime",
    release_ops: "test/release",
    deep_review: "test/deep-review",
    quick_patch: "test/quick-patch",
  },
}, "expanded topology categories");

assertResolvedConfigAccepted({
  categories: { docs: { model: "test/docs", fallback_models: ["test/fallback1"] } },
}, "rich entry with fallback_models on unrestricted category");

assertResolvedConfigRejected({
  model_routing: { security: "test/sec" },
}, "removed model_routing top-level key", ["model_routing", "not supported"]);

assertResolvedConfigRejected({
  fallback_model: "test/legacy-fallback",
}, "removed fallback_model top-level key", ["fallback_model", "not supported"]);

assertResolvedConfigAccepted({
  categories: { explorer: "test/cat-explorer" },
}, "categories map");

assertResolvedConfigRejected({
  categories: { coder_build: { model: "test/cb", fallback_models: ["test/fb"] } },
}, "restricted category fallback_models in categories", ["restricted category"]);

assertResolvedConfigAccepted({
  agents: { "bro-explore": "test/agent-explore" },
}, "agents map");

assertResolvedConfigRejected({
  agents: { "bro-build": { model: "test/bb", fallback_models: ["test/fb"] } },
}, "restricted category fallback_models in agents", ["restricted category"]);

assertResolvedConfigRejected({
  routing_profiles: { quick: { unknown_category: "test/nope" } },
}, "unknown category in routing profile", ["unknown_category", "not supported"]);

assertResolvedConfigRejected({
  routing_profiles: { turbo: { docs: "test/nope" } },
}, "unknown routing profile depth", ["turbo", "not supported"]);

assertResolvedConfigRejected({
  approval_packages: [{
    package_id: "git_read",
    trace_id: "BROS-SMOKE-EXPIRED",
    scope: "repo",
    expires: "2000-01-01T00:00:00.000Z",
    agents: ["bro-build"],
    files: ["src/**"],
    reason: "expired package smoke",
  }],
}, "expired approval package", ["approval_packages[0].expires", "future"]);

assertResolvedConfigRejected({
  approval_packages: [{
    package_id: "npm_publish_everything",
    trace_id: "BAD-TRACE",
    scope: "global",
    expires: "never",
    agents: ["bro-build"],
    files: ["src/**"],
    reason: "bad package smoke",
  }],
}, "invalid approval package shape", ["package_id", "trace_id", "scope", "expires"]);

assertResolvedConfigAccepted({
  agents: { "bro-docs": { model: "test/bd", fallback_models: ["test/fb"] } },
}, "unrestricted agent fallback_models");

assertResolvedConfigRejected({
  categories: { explorer: { model: "test/m", variant: "" } },
}, "empty variant", ["variant"]);

assertResolvedConfigRejected({
  categories: { explorer: { model: "test/m", variant: "fixture-secret-sentinel" } },
}, "secret-like variant", ["variant", "secret"]);

assertResolvedConfigRejected(JSON.parse('{"categories":{"explorer":{"model":"test/m","__proto__":"bad"}}}'),
  "unknown model entry key", ["not supported"]);

const precedenceConfig = assertResolvedConfigAccepted({
  categories: { explorer: "test/category-explorer" },
  routing_profiles: { quick: { explorer_search: "test/quick-explorer" } },
  agents: { "bro-explore": "test/agent-explorer" },
}, "routing precedence config");
const routedPrecedence = applyModelRoutingToAgents({ "bro-explore": {} }, precedenceConfig, { depth: "quick" });
if (routedPrecedence.agents["bro-explore"].model !== "test/agent-explorer") {
  throw new Error("Plugin smoke failed: routing precedence did not prefer agents over categories");
}

const depthPrecedenceConfig = assertResolvedConfigAccepted({
  categories: { docs: "test/category-docs" },
  routing_profiles: { quick: { docs: "test/quick-docs" } },
}, "depth routing precedence config");
const routedDepth = applyModelRoutingToAgents({ "bro-docs": {} }, depthPrecedenceConfig, { depth: "quick" });
if (routedDepth.agents["bro-docs"].model !== "test/quick-docs") {
  throw new Error("Plugin smoke failed: routing_profiles quick did not override base categories");
}

const mergedCategoriesConfig = resolveBrosConfig([
  { source: "test-a", path: "test-a", config: { categories: { explorer: "test/cat-explorer" } } },
  { source: "test-b", path: "test-b", config: { categories: { docs: "test/cat-docs" } } },
]);
if (mergedCategoriesConfig.errors.length > 0) {
  throw new Error(`Plugin smoke failed: deep merge categories config was rejected: ${mergedCategoriesConfig.errors.join("; ")}`);
}
if (mergedCategoriesConfig.categories.explorer?.model !== "test/cat-explorer" || mergedCategoriesConfig.categories.docs?.model !== "test/cat-docs") {
  throw new Error("Plugin smoke failed: deep merge for categories did not preserve keys from both sources");
}

assertResolvedConfigAccepted({
  $schema: "./test",
  fallback_models: [{ model: "test/fallback-a", variant: "backup" }, "test/fallback-b"],
  categories: {},
  routing_profiles: { standard: { docs: "test/docs-standard" } },
  agents: {},
  permission_profiles: {
    enabled: ["readonly"],
    scope: "repo",
    expires_at: "2099-01-01T00:00:00.000Z",
    reason: "smoke test for all keys",
  },
  approval_packages: [{
    package_id: "git_read",
    trace_id: "BROS-SMOKE-ALL-KEYS",
    scope: "repo",
    expires: "session",
    agents: ["bro-test"],
    files: ["docs/**"],
    reason: "smoke test read package",
  }],
}, "all rich config top-level keys");

assertResolvedConfigRejected({ bad_key: true }, "unknown top-level key", [
  "bad_key",
  "$schema",
  "fallback_models",
  "categories",
  "agents",
  "routing_profiles",
  "permission_profiles",
  "approval_packages",
]);

console.log(`Plugin smoke loaded: ${formatBrosHarnessPackageSpec(packageInfo)}`);
console.log("Plugin smoke passed: permission deny keys accepted, secret-like agent config rejected, category routing guards verified, routing precedence covered, and permission profiles fail closed.");
