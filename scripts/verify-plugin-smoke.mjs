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
  "bro-docs": { model: "openai/gpt-5.5" },
  "bro-build": { model: "openai/gpt-5.5" },
}, fallbackConfig);
if (routedFallback.agents["bro-docs"].model !== "openai/gpt-5-mini") {
  throw new Error("Plugin smoke failed: fallback_model was not applied to unrestricted docs category");
}
if (routedFallback.agents["bro-build"].model !== "openai/gpt-5.5") {
  throw new Error("Plugin smoke failed: fallback_model silently changed restricted coder/build category");
}

const explicitConfig = resolveBrosConfig([{ source: "test", path: "test", config: { model_routing: { coder_build: "openai/gpt-5.5-coder" } } }]);
const routedExplicit = applyModelRoutingToAgents({ "bro-build": { model: "openai/gpt-5.5" } }, explicitConfig);
if (routedExplicit.agents["bro-build"].model !== "openai/gpt-5.5-coder") {
  throw new Error("Plugin smoke failed: explicit coder/build model route was not applied");
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

console.log("Plugin smoke passed: permission deny keys accepted, secret-like agent config rejected, model routing guards verified, and permission profiles fail closed.");
