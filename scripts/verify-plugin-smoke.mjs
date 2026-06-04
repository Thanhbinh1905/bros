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

console.log("Plugin smoke passed: permission deny keys accepted, secret-like agent config rejected, model routing guards verified, and permission profiles fail closed.");
