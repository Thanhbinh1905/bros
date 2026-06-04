import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { homedir } from "node:os";
import { join } from "node:path";

import {
  applyModelRoutingToAgents,
  brosConfigDefaults,
  resolveBrosConfig,
  validateBrosConfig,
} from "../src/config.mjs";
import { brosHarnessServer } from "../src/plugin.mjs";

const secretLikeValue = "sk-AAAAAAAAAAAAAAAAAAAAAA";
const futurePermissionProfiles = {
  enabled: ["readonly"],
  scope: "repo",
  expires_at: "2999-01-01T00:00:00.000Z",
  reason: "approved unit test reason",
};

function assertNoValidationErrors(config) {
  assert.deepStrictEqual(validateBrosConfig(config), []);
}

function assertHasError(errors, expectedText) {
  assert.ok(
    errors.some((error) => error.includes(expectedText)),
    `expected one error to include ${JSON.stringify(expectedText)}; got ${JSON.stringify(errors)}`,
  );
}

describe("validateBrosConfig", () => {
  it("empty config returns no errors", () => {
    assert.deepStrictEqual(validateBrosConfig({}), []);
  });

  it("unknown top-level key produces error listing 6 allowed keys", () => {
    const errors = validateBrosConfig({ unexpected: true });

    assert.equal(errors.length, 1);
    assertHasError(errors, "allowed keys are $schema, fallback_model, model_routing, categories, agents, permission_profiles");
    assert.equal(errors[0].split("allowed keys are ")[1].split(", ").length, 6);
  });

  it("string model value accepted", () => {
    assertNoValidationErrors({ fallback_model: "anthropic/claude-sonnet-4.5" });
  });

  it("empty string model value rejected", () => {
    const errors = validateBrosConfig({ fallback_model: "" });

    assertHasError(errors, "fallback_model must be a non-empty model id string");
  });

  it("rich model entry with model+variant accepted", () => {
    assertNoValidationErrors({ model_routing: { planner: { model: "test-model", variant: "fast" } } });
  });

  it("rich model entry with model+variant+fallback_models accepted", () => {
    assertNoValidationErrors({
      model_routing: {
        planner: {
          model: "test-model",
          variant: "fast",
          fallback_models: ["fallback-one", "fallback-two"],
        },
      },
    });
  });

  it("empty variant rejected", () => {
    const errors = validateBrosConfig({ model_routing: { planner: { model: "test-model", variant: "" } } });

    assertHasError(errors, "model_routing.planner.variant must be a non-empty string when provided");
  });

  it("secret-like variant rejected", () => {
    const errors = validateBrosConfig({
      model_routing: { planner: { model: "test-model", variant: secretLikeValue } },
    });

    assertHasError(errors, "model_routing.planner.variant must be a variant id, not a secret-like value");
  });

  it("secret-like model rejected", () => {
    const errors = validateBrosConfig({ model_routing: { planner: { model: secretLikeValue } } });

    assertHasError(errors, "model_routing.planner.model must be a model id, not a secret-like value");
  });

  it("unknown keys in model entry rejected", () => {
    const config = JSON.parse('{"model_routing":{"planner":{"model":"test","__proto__":"x"}}}');
    const errors = validateBrosConfig(config);

    assertHasError(errors, "model_routing.planner.__proto__ is not supported");
  });

  it("empty fallback_models array rejected", () => {
    const errors = validateBrosConfig({ model_routing: { planner: { model: "test", fallback_models: [] } } });

    assertHasError(errors, "model_routing.planner.fallback_models must not be empty");
  });

  it("duplicate fallback_models entries error", () => {
    const errors = validateBrosConfig({
      model_routing: { planner: { model: "test", fallback_models: ["fallback", "fallback"] } },
    });

    assertHasError(errors, "model_routing.planner.fallback_models contains duplicate model fallback");
  });

  it("restricted category rejects fallback_models in model_routing", () => {
    for (const category of ["security", "coder_build", "qa_review", "ops"]) {
      const errors = validateBrosConfig({
        model_routing: { [category]: { model: `${category}-model`, fallback_models: ["fallback"] } },
      });

      assertHasError(errors, `model_routing.${category}.fallback_models is not allowed for restricted category ${category}`);
    }
  });

  it("restricted category rejects fallback_models in categories", () => {
    for (const category of ["security", "coder_build", "qa_review", "ops"]) {
      const errors = validateBrosConfig({
        categories: { [category]: { model: `${category}-model`, fallback_models: ["fallback"] } },
      });

      assertHasError(errors, `categories.${category}.fallback_models is not allowed for restricted category ${category}`);
    }
  });

  it("restricted agent rejects fallback_models in agents", () => {
    const restrictedAgents = {
      "bro-build": "coder_build",
      "bro-shield": "security",
      "bro-test": "qa_review",
      "bro-ops": "ops",
    };

    for (const [agentName, category] of Object.entries(restrictedAgents)) {
      const errors = validateBrosConfig({
        agents: { [agentName]: { model: `${agentName}-model`, fallback_models: ["fallback"] } },
      });

      assertHasError(errors, `agents.${agentName}.fallback_models is not allowed for restricted category ${category}`);
    }
  });

  it("unrestricted agent accepts fallback_models in agents", () => {
    assertNoValidationErrors({
      agents: {
        "bro-explore": { model: "explore-model", fallback_models: ["explore-fallback"] },
        "bro-docs": { model: "docs-model", fallback_models: ["docs-fallback"] },
      },
    });
  });

  it("runtime aliases accepted in model_routing", () => {
    assertNoValidationErrors({
      model_routing: {
        coder: "coder-model",
        "qa/review": "qa-model",
        "explorer/search": "explorer-model",
      },
    });
  });

  it("duplicate alias/canonical conflict detected", () => {
    const errors = validateBrosConfig({ model_routing: { coder: "alias-model", coder_build: "canonical-model" } });

    assertHasError(errors, "model_routing defines duplicate category coder_build via aliases");
  });

  it("$schema string accepted", () => {
    assertNoValidationErrors({ $schema: "https://example.test/bros.schema.json" });
  });

  it("$schema non-string rejected", () => {
    const errors = validateBrosConfig({ $schema: 1 });

    assertHasError(errors, "$schema must be a string when provided");
  });

  it("all 6 top-level keys accepted together", () => {
    assertNoValidationErrors({
      $schema: "https://example.test/bros.schema.json",
      fallback_model: "fallback-model",
      model_routing: { planner: "planner-model" },
      categories: { docs: "docs-category-model" },
      agents: { "bro-explore": "explore-agent-model" },
      permission_profiles: futurePermissionProfiles,
    });
  });
});

describe("resolveBrosConfig", () => {
  it("multi-source deep merge for model_routing", () => {
    const resolved = resolveBrosConfig([
      { config: { model_routing: { planner: "planner-one", docs: "docs-one" } }, source: "one" },
      { config: { model_routing: { planner: "planner-two", design: "design-two" } }, source: "two" },
    ]);

    assert.deepStrictEqual(resolved.errors, []);
    assert.deepStrictEqual(resolved.modelRouting, {
      planner: { model: "planner-two" },
      docs: { model: "docs-one" },
      design: { model: "design-two" },
    });
  });

  it("multi-source deep merge for categories", () => {
    const resolved = resolveBrosConfig([
      { config: { categories: { planner: "planner-one", docs: "docs-one" } }, source: "one" },
      { config: { categories: { planner: "planner-two", design: "design-two" } }, source: "two" },
    ]);

    assert.deepStrictEqual(resolved.errors, []);
    assert.deepStrictEqual(resolved.categories, {
      planner: { model: "planner-two" },
      docs: { model: "docs-one" },
      design: { model: "design-two" },
    });
  });

  it("multi-source deep merge for agents", () => {
    const resolved = resolveBrosConfig([
      { config: { agents: { "bro-explore": "explore-one", "bro-docs": "docs-one" } }, source: "one" },
      { config: { agents: { "bro-explore": "explore-two", "bro-ui": "ui-two" } }, source: "two" },
    ]);

    assert.deepStrictEqual(resolved.errors, []);
    assert.deepStrictEqual(resolved.agents, {
      "bro-explore": { model: "explore-two" },
      "bro-docs": { model: "docs-one" },
      "bro-ui": { model: "ui-two" },
    });
  });

  it("permission_profiles override instead of merging", () => {
    const laterPermissionProfiles = {
      enabled: ["review_safe"],
      scope: "repo",
      expires_at: "2999-02-01T00:00:00.000Z",
      reason: "later approval reason",
    };
    const resolved = resolveBrosConfig([
      { config: { permission_profiles: futurePermissionProfiles }, source: "one" },
      { config: { permission_profiles: laterPermissionProfiles }, source: "two" },
    ]);

    assert.deepStrictEqual(resolved.errors, []);
    assert.deepStrictEqual(resolved.permissionProfiles, { ...laterPermissionProfiles, hard_review: false });
  });

  it("source with errors is not merged", () => {
    const resolved = resolveBrosConfig([
      { config: { model_routing: { planner: "planner-one" } }, source: "valid" },
      { config: { model_routing: { planner: "" } }, source: "invalid" },
    ]);

    assert.equal(resolved.config, undefined);
    assert.deepStrictEqual(resolved.modelRouting, {});
    assertHasError(resolved.errors, "invalid.model_routing.planner must be a non-empty model id string");
  });
});

describe("applyModelRoutingToAgents", () => {
  it("routing precedence: agents > categories > model_routing > fallback_model", () => {
    const baseAgents = {
      "mighty-bro": { model: "base-planner" },
      "bro-explore": { model: "base-explore" },
      "bro-docs": { model: "base-docs" },
      "bro-design": { model: "base-design" },
    };
    const resolvedConfig = {
      fallbackModel: "fallback-model",
      modelRouting: {
        planner: { model: "routing-planner" },
        explorer_search: { model: "routing-explore" },
        docs: { model: "routing-docs" },
      },
      categories: {
        explorer_search: { model: "category-explore" },
        docs: { model: "category-docs" },
      },
      agents: {
        "bro-docs": { model: "agent-docs" },
      },
    };

    const { agents } = applyModelRoutingToAgents(baseAgents, resolvedConfig);

    assert.equal(agents["mighty-bro"].model, "routing-planner");
    assert.equal(agents["bro-explore"].model, "category-explore");
    assert.equal(agents["bro-docs"].model, "agent-docs");
    assert.equal(agents["bro-design"].model, "fallback-model");
  });

  it("restricted category does not get fallback_model", () => {
    const { agents, events } = applyModelRoutingToAgents(
      { "bro-build": { model: "base-build" } },
      { fallbackModel: "fallback-model", modelRouting: {}, categories: {}, agents: {} },
    );

    assert.equal(agents["bro-build"].model, "base-build");
    assert.deepStrictEqual(events, []);
  });

  it("unrestricted category gets fallback_model", () => {
    const { agents, events } = applyModelRoutingToAgents(
      { "bro-explore": { model: "base-explore" } },
      { fallbackModel: "fallback-model", modelRouting: {}, categories: {}, agents: {} },
    );

    assert.equal(agents["bro-explore"].model, "fallback-model");
    assert.deepStrictEqual(events, [
      { agent: "bro-explore", category: "explorer_search", model: "fallback-model", source: "fallback_model" },
    ]);
  });

  it("variant propagated to agent", () => {
    const { agents } = applyModelRoutingToAgents(
      { "mighty-bro": { model: "base-planner" } },
      { modelRouting: { planner: { model: "planner-model", variant: "fast" } }, categories: {}, agents: {} },
    );

    assert.equal(agents["mighty-bro"].model, "planner-model");
    assert.equal(agents["mighty-bro"].variant, "fast");
  });

  it("events generated for model override", () => {
    const { events } = applyModelRoutingToAgents(
      { "mighty-bro": { model: "base-planner" } },
      {
        modelRouting: { planner: { model: "planner-model", variant: "fast", fallback_models: ["backup"] } },
        categories: {},
        agents: {},
      },
    );

    assert.deepStrictEqual(events, [
      {
        agent: "mighty-bro",
        category: "planner",
        model: "planner-model",
        variant: "fast",
        source: "model_routing",
        fallback_count: 1,
      },
    ]);
  });

  it("no event when no override", () => {
    const { agents, events } = applyModelRoutingToAgents(
      { "mighty-bro": { model: "base-planner" } },
      { modelRouting: {}, categories: {}, agents: {} },
    );

    assert.equal(agents["mighty-bro"].model, "base-planner");
    assert.deepStrictEqual(events, []);
  });
});

describe("brosHarnessServer runtime model propagation", () => {
  it("patches only model on a preexisting known BROS agent with explicit agent routing", async () => {
    const server = await brosHarnessServer({ bros_harness: { agents: { "bro-build": "test/explicit-build" } } }, { includeFiles: false });
    const prompt = "existing prompt stays authoritative";
    const permission = { bash: { "*": "ask" } };
    const tools = { read: true };
    const cfg = {
      agent: {
        "bro-build": {
          model: "test/old-build",
          prompt,
          permission,
          mode: "subagent",
          tools,
        },
      },
    };

    server.config(cfg);

    assert.equal(cfg.agent["bro-build"].model, "test/explicit-build");
    assert.equal(cfg.agent["bro-build"].prompt, prompt);
    assert.equal(cfg.agent["bro-build"].permission, permission);
    assert.equal(cfg.agent["bro-build"].mode, "subagent");
    assert.equal(cfg.agent["bro-build"].tools, tools);
  });

  it("patches preexisting known BROS agent model from explicit category routing without permission escalation", async () => {
    const server = await brosHarnessServer({ bros_harness: { categories: { security: "test/security-model" } } }, { includeFiles: false });
    const permission = { bash: { "*": "deny" } };
    const cfg = {
      agent: {
        "bro-shield": {
          prompt: "existing shield prompt",
          permission,
        },
      },
    };

    server.config(cfg);

    assert.equal(cfg.agent["bro-shield"].model, "test/security-model");
    assert.equal(cfg.agent["bro-shield"].permission, permission);
    assert.equal(cfg.agent["bro-shield"].prompt, "existing shield prompt");
  });

  it("patches preexisting known BROS agent model from explicit model_routing", async () => {
    const server = await brosHarnessServer({ bros_harness: { model_routing: { qa_review: "test/qa-model" } } }, { includeFiles: false });
    const cfg = {
      agent: {
        "bro-test": { model: "test/original-qa", prompt: "existing qa prompt" },
      },
    };

    server.config(cfg);

    assert.equal(cfg.agent["bro-test"].model, "test/qa-model");
    assert.equal(cfg.agent["bro-test"].prompt, "existing qa prompt");
  });

  it("does not patch unknown preexisting agents", async () => {
    const server = await brosHarnessServer({ bros_harness: { model_routing: { docs: "test/docs-model" } } }, { includeFiles: false });
    const cfg = {
      agent: {
        "not-a-bro": { model: "test/original", prompt: "unknown prompt" },
      },
    };

    server.config(cfg);

    assert.equal(cfg.agent["not-a-bro"].model, "test/original");
    assert.equal(cfg.agent["not-a-bro"].prompt, "unknown prompt");
  });

  it("does not apply fallback_model to restricted preexisting BROS agents", async () => {
    const server = await brosHarnessServer({ bros_harness: { fallback_model: "test/fallback" } }, { includeFiles: false });
    const cfg = {
      agent: {
        "bro-build": { model: "test/build-original" },
        "bro-shield": { model: "test/shield-original" },
        "bro-test": { model: "test/test-original" },
        "bro-ops": { model: "test/ops-original" },
      },
    };

    server.config(cfg);

    assert.equal(cfg.agent["bro-build"].model, "test/build-original");
    assert.equal(cfg.agent["bro-shield"].model, "test/shield-original");
    assert.equal(cfg.agent["bro-test"].model, "test/test-original");
    assert.equal(cfg.agent["bro-ops"].model, "test/ops-original");
  });
});

describe("brosConfigDefaults", () => {
  it("has expected keys", () => {
    for (const key of [
      "modelEntryShape",
      "modelEntryAliases",
      "agentNames",
      "restrictedCategoryMessage",
      "fallbackRestrictedCategories",
    ]) {
      assert.ok(Object.hasOwn(brosConfigDefaults, key), `missing ${key}`);
    }
  });

  it("uses the OpenCode config directory for the global config path", () => {
    assert.equal(brosConfigDefaults.globalConfigPath, join(homedir(), ".config", "opencode", "bros.config.json"));
  });
});
