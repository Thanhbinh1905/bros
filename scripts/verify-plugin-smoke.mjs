#!/usr/bin/env node
import { assertNoForbiddenConfigMutation, snapshotForbiddenConfig } from "../src/security-invariants.mjs";
import { brosHarnessServer } from "../src/plugin.mjs";
import { applyModelRoutingToAgents, applyPermissionProfilesToAgents, resolveBrosConfig } from "../src/config.mjs";

const server = await brosHarnessServer({}, { includeFiles: false });
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
}, { includeFiles: false });
const openCodeRuntimeCfg = {};
openCodeRuntimeServer.config(openCodeRuntimeCfg);
if (!openCodeRuntimeCfg.agent?.["mighty-bro"]) {
  throw new Error("Plugin smoke failed: OpenCode runtime input prevented BROS agent registration");
}

const namespacedInputServer = await brosHarnessServer({
  client: {},
  bros_harness: { fallback_model: "openai/gpt-5-mini" },
}, { includeFiles: false });
const namespacedInputCfg = {};
namespacedInputServer.config(namespacedInputCfg);
if (namespacedInputCfg.agent?.["bro-docs"]?.model !== "openai/gpt-5-mini") {
  throw new Error("Plugin smoke failed: namespaced OpenCode plugin input was not applied");
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

const invalidConfig = resolveBrosConfig([{ source: "test", path: "test", config: { model_routing: { security: "" } } }]);
if (!invalidConfig.errors.some((error) => error.includes("model_routing.security"))) {
  throw new Error("Plugin smoke failed: invalid model routing did not produce an actionable error");
}

const fallbackConfig = resolveBrosConfig([{ source: "test", path: "test", config: { fallback_model: "openai/gpt-5-mini" } }]);
const routedFallback = applyModelRoutingToAgents({
  "bro-docs": {},
  "bro-build": {},
}, fallbackConfig);
if (routedFallback.agents["bro-docs"].model !== "openai/gpt-5-mini") {
  throw new Error("Plugin smoke failed: fallback_model was not applied to unrestricted docs category");
}
if ("model" in routedFallback.agents["bro-build"]) {
  throw new Error("Plugin smoke failed: fallback_model forced a model onto restricted coder/build category");
}

const explicitConfig = resolveBrosConfig([{ source: "test", path: "test", config: { model_routing: { coder_build: "test-provider/coder-build-model" } } }]);
const routedExplicit = applyModelRoutingToAgents({ "bro-build": {} }, explicitConfig);
if (routedExplicit.agents["bro-build"].model !== "test-provider/coder-build-model") {
  throw new Error("Plugin smoke failed: explicit coder/build model route was not applied");
}

const inheritConfig = resolveBrosConfig([{ source: "test", path: "test", config: {} }]);
const routedInherit = applyModelRoutingToAgents({ "bro-docs": {}, "bro-build": {} }, inheritConfig);
if ("model" in routedInherit.agents["bro-docs"] || "model" in routedInherit.agents["bro-build"]) {
  throw new Error("Plugin smoke failed: agents without configured routing did not inherit OpenCode default model");
}

const futureExpiry = new Date(Date.now() + 60 * 60 * 1000).toISOString();
const profileConfig = resolveBrosConfig([{ source: "test", path: "test", config: {
  permission_profiles: {
    enabled: ["build_limited", "trusted_ops"],
    scope: "repo",
    expires_at: futureExpiry,
    reason: "approved local validation smoke test",
    hard_review: true,
  },
} }]);
if (profileConfig.errors.length > 0) {
  throw new Error(`Plugin smoke failed: valid permission profile config was rejected: ${profileConfig.errors.join("; ")}`);
}
const profiled = applyPermissionProfilesToAgents({
  "bro-build": { permission: { bash: { "*": "ask" } } },
  "bro-ops": { permission: { bash: { "*": "ask" } } },
}, profileConfig);
if (profiled.agents["bro-build"].permission.bash["npm run validate"] !== "allow") {
  throw new Error("Plugin smoke failed: build_limited did not allow scoped local validation");
}
if (profiled.agents["bro-build"].permission.bash["npm publish*"] !== "deny") {
  throw new Error("Plugin smoke failed: dangerous npm publish was not denied after profile merge");
}
if (profiled.agents["bro-ops"].permission.bash["git push --force*"] !== "deny") {
  throw new Error("Plugin smoke failed: force push was not denied after trusted_ops merge");
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
if (!buildBash || buildBash["*"] !== "allow") {
  throw new Error("Plugin smoke failed: bro-build default did not allow routine local bash");
}
if (buildBash["git status*"] !== "allow" || buildBash["git grep*"] !== "allow" || buildBash["git worktree list*"] !== "allow") {
  throw new Error("Plugin smoke failed: bro-build default did not allow harmless git inspection");
}
if (buildBash["npm run *"] !== "allow" || buildBash["docker compose logs*"] !== "allow" || buildBash["gh pr diff *"] !== "allow") {
  throw new Error("Plugin smoke failed: bro-build default did not allow flexible local npm/docker/GitHub inspection");
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
if (buildBash["git reset --hard*"] !== "deny" || buildBash["git push --force*"] !== "deny" || buildBash["npm publish*"] !== "deny") {
  throw new Error("Plugin smoke failed: bro-build default reopened destructive, force-push, or publish commands");
}
if (buildBash["cat **/.env*"] !== "deny" || buildBash["gh auth token*"] !== "deny" || buildBash["printenv*"] !== "deny" || buildBash["env*"] !== "deny") {
  throw new Error("Plugin smoke failed: bro-build default reopened secret or environment inspection commands");
}

const buildOrder = Object.keys(buildBash);
const wildcardIndex = buildOrder.indexOf("*");
const gitAddIndex = buildOrder.indexOf("git add *");
const hardDenyIndex = buildOrder.indexOf("git reset --hard*");
if (!(wildcardIndex >= 0 && wildcardIndex < gitAddIndex && gitAddIndex < hardDenyIndex)) {
  throw new Error("Plugin smoke failed: bro-build default permission order does not keep ask/deny rules after wildcard allow");
}

const testBash = cfg.agent?.["bro-test"]?.permission?.bash;
if (!testBash || testBash["gh pr diff *"] !== "allow" || testBash["npx playwright test*"] !== "allow" || testBash["docker compose logs*"] !== "allow") {
  throw new Error("Plugin smoke failed: bro-test did not allow expected QA inspection commands");
}
if (testBash["git add*"] !== "deny" || testBash["docker compose up*"] !== "ask" || testBash["npm install*"] !== "ask") {
  throw new Error("Plugin smoke failed: bro-test reopened mutation commands");
}

const opsBash = cfg.agent?.["bro-ops"]?.permission?.bash;
if (!opsBash || opsBash["gh run view *"] !== "allow" || opsBash["docker compose logs*"] !== "allow" || opsBash["git grep*"] !== "allow") {
  throw new Error("Plugin smoke failed: bro-ops did not allow expected ops inspection commands");
}
if (opsBash["docker compose up*"] !== "ask" || opsBash["kubectl apply*"] !== "ask" || opsBash["docker system prune*"] !== "deny") {
  throw new Error("Plugin smoke failed: bro-ops reopened operational mutation commands");
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
  model_routing: { explorer: { model: "test/rich", variant: "high" } },
}, "rich model entry in model_routing");

assertResolvedConfigAccepted({
  model_routing: { docs: { model: "test/docs", fallback_models: ["test/fallback1"] } },
}, "rich entry with fallback_models on unrestricted category");

assertResolvedConfigRejected({
  model_routing: { security: { model: "test/sec", fallback_models: ["test/fb"] } },
}, "restricted category fallback_models in model_routing", ["restricted category"]);

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

assertResolvedConfigAccepted({
  agents: { "bro-docs": { model: "test/bd", fallback_models: ["test/fb"] } },
}, "unrestricted agent fallback_models");

assertResolvedConfigRejected({
  model_routing: { explorer: { model: "test/m", variant: "" } },
}, "empty variant", ["variant"]);

assertResolvedConfigRejected({
  model_routing: { explorer: { model: "test/m", variant: "sk-AAAAAAAAAAAAAAAAAAAAAA" } },
}, "secret-like variant", ["variant", "secret"]);

assertResolvedConfigRejected(JSON.parse('{"model_routing":{"explorer":{"model":"test/m","__proto__":"bad"}}}'),
  "unknown model entry key", ["not supported"]);

const precedenceConfig = assertResolvedConfigAccepted({
  model_routing: { explorer: "test/model-routing-explorer" },
  categories: { explorer: "test/category-explorer" },
  agents: { "bro-explore": "test/agent-explorer" },
}, "routing precedence config");
const routedPrecedence = applyModelRoutingToAgents({ "bro-explore": {} }, precedenceConfig);
if (routedPrecedence.agents["bro-explore"].model !== "test/agent-explorer") {
  throw new Error("Plugin smoke failed: routing precedence did not prefer agents over categories and model_routing");
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
  fallback_model: "test/fb",
  model_routing: {},
  categories: {},
  agents: {},
  permission_profiles: {
    enabled: ["readonly"],
    scope: "repo",
    expires_at: "2099-01-01T00:00:00.000Z",
    reason: "smoke test for all keys",
  },
}, "all rich config top-level keys");

assertResolvedConfigRejected({ bad_key: true }, "unknown top-level key", [
  "bad_key",
  "$schema",
  "fallback_model",
  "model_routing",
  "categories",
  "agents",
  "permission_profiles",
]);

console.log("Plugin smoke passed: permission deny keys accepted, secret-like agent config rejected, rich config model routing guards verified, routing precedence covered, and permission profiles fail closed.");
