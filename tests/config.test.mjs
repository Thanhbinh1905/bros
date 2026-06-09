import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import { homedir } from "node:os";
import { dirname, join } from "node:path";
import { promisify } from "node:util";
import { fileURLToPath } from "node:url";

import {
  applyModelRoutingToAgents,
  applyPermissionProfilesToAgents,
  brosConfigDefaults,
  loadResolvedBrosConfig,
  resolveBrosConfig,
  resolveModelRouteForAgent,
  routingCategoryRegistry,
  validateBrosConfig,
} from "../src/config.mjs";
import { brosHarnessServer } from "../src/plugin.mjs";
import { classifyRoutingScenario } from "../src/routing-policy.mjs";

const execFileAsync = promisify(execFile);
const packageRoot = dirname(dirname(fileURLToPath(import.meta.url)));
const secretLikeValue = "fixture-secret-sentinel";
const futurePermissionProfiles = {
  enabled: ["readonly"],
  scope: "repo",
  expires_at: "2999-01-01T00:00:00.000Z",
  reason: "approved unit test reason",
};

const futureApprovalPackage = {
  package_id: "git_read",
  trace_id: "BROS-TEST-APPROVAL",
  scope: "repo",
  expires: "2999-01-01T00:00:00.000Z",
  agents: ["bro-build"],
  files: ["src/**"],
  reason: "approved package test reason",
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

  it("unknown top-level key produces error listing supported allowed keys", () => {
    const errors = validateBrosConfig({ unexpected: true });

    assert.equal(errors.length, 1);
    assertHasError(errors, "allowed keys are $schema, fallback_models, categories, agents, routing_profiles, permission_profiles, approval_packages");
    assert.equal(errors[0].split("allowed keys are ")[1].split(", ").length, 7);
  });

  it("model_routing top-level key is rejected", () => {
    const errors = validateBrosConfig({ model_routing: { planner: "planner-model" } });

    assertHasError(errors, "model_routing is not supported");
  });

  it("fallback_model top-level key is rejected", () => {
    assertHasError(validateBrosConfig({ fallback_model: "openai/gpt-5.5" }), "fallback_model is not supported");
    assertHasError(validateBrosConfig({ fallback_model: { model: "openai/gpt-5.5", variant: "medium" } }), "fallback_model is not supported");
  });

  it("top-level fallback_models accepts ordered rich objects and strings", () => {
    assertNoValidationErrors({
      fallback_models: [
        { model: "openai/gpt-5.5", variant: "primary-backup" },
        "anthropic/claude-sonnet-4.5",
      ],
    });
  });

  it("top-level fallback_models rejects empty, duplicate, secret-like, and nested fallback entries", () => {
    assertHasError(validateBrosConfig({ fallback_models: [] }), "fallback_models must not be empty");
    assertHasError(validateBrosConfig({ fallback_models: ["test/a", "test/a"] }), "fallback_models[1] duplicates an earlier model entry");
    assertHasError(validateBrosConfig({ fallback_models: [{ model: secretLikeValue }] }), "fallback_models[0].model must be a model id, not a secret-like value");
    assertHasError(
      validateBrosConfig({ fallback_models: [{ model: "test/a", fallback_models: ["test/b"] }] }),
      "fallback_models[0].fallback_models is not supported in top-level fallback_models entries",
    );
  });

  it("category model entry with model+variant+fallback_models accepted for unrestricted categories", () => {
    assertNoValidationErrors({
      categories: {
        planner: {
          model: "test-model",
          variant: "fast",
          fallback_models: ["fallback-one", "fallback-two"],
        },
      },
    });
  });

  it("empty and secret-like category model fields are rejected", () => {
    assertHasError(
      validateBrosConfig({ categories: { planner: { model: "test-model", variant: "" } } }),
      "categories.planner.variant must be a non-empty string when provided",
    );
    assertHasError(
      validateBrosConfig({ categories: { planner: { model: "test-model", variant: secretLikeValue } } }),
      "categories.planner.variant must be a variant id, not a secret-like value",
    );
    assertHasError(
      validateBrosConfig({ categories: { planner: { model: secretLikeValue } } }),
      "categories.planner.model must be a model id, not a secret-like value",
    );
  });

  it("unknown keys in model entry rejected", () => {
    const config = JSON.parse('{"categories":{"planner":{"model":"test","__proto__":"x"}}}');
    const errors = validateBrosConfig(config);

    assertHasError(errors, "categories.planner.__proto__ is not supported");
  });

  it("model-entry fallback_models rejects empty and duplicate arrays", () => {
    assertHasError(
      validateBrosConfig({ categories: { planner: { model: "test", fallback_models: [] } } }),
      "categories.planner.fallback_models must not be empty",
    );
    assertHasError(
      validateBrosConfig({ categories: { planner: { model: "test", fallback_models: ["fallback", "fallback"] } } }),
      "categories.planner.fallback_models[1] duplicates an earlier model entry",
    );
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

  it("canonical architecture and ui categories are accepted", () => {
    assertNoValidationErrors({ categories: { architecture: "arch-model", ui: "ui-model" } });
  });

  it("category registry entries are descriptive and non-authoritative", () => {
    for (const [category, definition] of Object.entries(routingCategoryRegistry)) {
      assert.ok(definition.description.length > 20, `${category} should have a clear description`);
      assert.ok(definition.workflowResponsibility.length > 20, `${category} should have workflow responsibility text`);
      assert.ok(definition.capabilities.length > 0, `${category} should declare capabilities`);
      assert.ok(definition.defaultAgents.length > 0, `${category} should declare default routing agents`);
      assert.equal(definition.permissionAuthority, false, `${category} metadata must not grant permission authority`);
      assert.equal(Object.hasOwn(definition, "permission"), false, `${category} must not carry raw OpenCode permissions`);
    }
  });

  it("legacy design and designer category names are rejected", () => {
    assertHasError(validateBrosConfig({ categories: { design: "design-model" } }), "categories.design is not supported");
    assertHasError(validateBrosConfig({ categories: { designer: "designer-model" } }), "categories.designer is not supported");
  });

  it("runtime aliases accepted for non-ambiguous categories", () => {
    assertNoValidationErrors({
      categories: {
        coder: "coder-model",
        "qa/review": "qa-model",
        "explorer/search": "explorer-model",
      },
    });
  });

  it("duplicate alias/canonical conflict detected", () => {
    const errors = validateBrosConfig({ categories: { coder: "alias-model", coder_build: "canonical-model" } });

    assertHasError(errors, "categories defines duplicate category coder_build via aliases");
  });

  it("$schema string accepted and non-string rejected", () => {
    assertNoValidationErrors({ $schema: "https://example.test/bros.schema.json" });
    assertHasError(validateBrosConfig({ $schema: 1 }), "$schema must be a string when provided");
  });

  it("all supported top-level keys accepted together", () => {
    assertNoValidationErrors({
      $schema: "https://example.test/bros.schema.json",
      fallback_models: [{ model: "fallback-backup", variant: "backup" }],
      categories: { docs: "docs-category-model" },
      agents: { "bro-explore": "explore-agent-model" },
      permission_profiles: futurePermissionProfiles,
    });
  });

  it("approval_packages rejects expired ISO timestamps", () => {
    const errors = validateBrosConfig({
      approval_packages: [{ ...futureApprovalPackage, expires: "2000-01-01T00:00:00.000Z" }],
    });

    assertHasError(errors, "approval_packages[0].expires must be in the future");
  });

  it("approval_packages accepts session expiry and future ISO timestamps", () => {
    assertNoValidationErrors({ approval_packages: [{ ...futureApprovalPackage, expires: "session" }] });
    assertNoValidationErrors({ approval_packages: [futureApprovalPackage] });
  });

  it("singular category and agent top-level keys remain unsupported", () => {
    assertHasError(validateBrosConfig({ category: { docs: "docs" } }), "category is not supported");
    assertHasError(validateBrosConfig({ agent: { "bro-docs": "docs" } }), "agent is not supported");
  });

  it("unsupported config values are not echoed in validation errors", () => {
    const rawUnsupportedProfile = "SECRET_VALUE_UNSUPPORTED_PROFILE";
    const errors = validateBrosConfig({
      fallback_models: ["secret-model-value", "secret-model-value"],
      categories: { planner: { model: "planner-model", fallback_models: ["secret-fallback", "secret-fallback"] } },
      permission_profiles: {
        ...futurePermissionProfiles,
        enabled: [rawUnsupportedProfile],
      },
    });

    assertHasError(errors, "fallback_models[1] duplicates an earlier model entry");
    assertHasError(errors, "categories.planner.fallback_models[1] duplicates an earlier model entry");
    assertHasError(errors, "permission_profiles.enabled[0] is not a supported profile");
    assert.equal(errors.join("\n").includes(rawUnsupportedProfile), false);
    assert.equal(errors.join("\n").includes("secret-model-value"), false);
    assert.equal(errors.join("\n").includes("secret-fallback"), false);
  });
});

describe("resolveBrosConfig", () => {
  it("multi-source deep merge for categories", () => {
    const resolved = resolveBrosConfig([
      { config: { categories: { planner: "planner-one", docs: "docs-one" } }, source: "one" },
      { config: { categories: { planner: "planner-two", architecture: "architecture-two", ui: "ui-two" } }, source: "two" },
    ]);

    assert.deepStrictEqual(resolved.errors, []);
    assert.deepStrictEqual(resolved.categories, {
      planner: { model: "planner-two" },
      docs: { model: "docs-one" },
      architecture: { model: "architecture-two" },
      ui: { model: "ui-two" },
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

  it("fallback_models normalize ordered rich entries", () => {
    const resolved = resolveBrosConfig([
      {
        config: {
          fallback_models: [
            { model: "test/primary", variant: "primary" },
            "test/backup-b",
          ],
        },
        source: "test",
      },
    ]);

    assert.deepStrictEqual(resolved.errors, []);
    assert.equal(Object.hasOwn(resolved, "fallbackModel"), false);
    assert.equal(Object.hasOwn(resolved, "fallbackModelEntry"), false);
    assert.deepStrictEqual(resolved.fallbackModels, [
      { model: "test/primary", variant: "primary" },
      { model: "test/backup-b" },
    ]);
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

  it("routing_profiles warn when no explicit runtime depth is selected", () => {
    const resolved = resolveBrosConfig([
      { config: { routing_profiles: { quick: { docs: "quick-docs-model" } } }, source: "test" },
    ]);

    assert.deepStrictEqual(resolved.errors, []);
    assert.ok(resolved.warnings.some((warning) => warning.includes("default OpenCode plugin startup does not infer per-message workflow depth")));
  });

  it("source with errors is not merged", () => {
    const resolved = resolveBrosConfig([
      { config: { categories: { planner: "planner-one" } }, source: "valid" },
      { config: { categories: { planner: "" } }, source: "invalid" },
    ]);

    assert.equal(resolved.config, undefined);
    assert.deepStrictEqual(resolved.categories, {});
    assertHasError(resolved.errors, "invalid.categories.planner must be a non-empty model id string");
  });
});

describe("loadResolvedBrosConfig plugin input", () => {
  it("rejects unwrapped removed model_routing", async () => {
    const resolved = await loadResolvedBrosConfig({
      input: { model_routing: { planner: "planner-model" } },
      includeFiles: false,
    });

    assertHasError(resolved.errors, "OpenCode plugin input (plugin input).model_routing is not supported");
  });

  it("rejects unwrapped removed fallback_model", async () => {
    const resolved = await loadResolvedBrosConfig({
      input: { fallback_model: "openai/gpt-5.5" },
      includeFiles: false,
    });

    assertHasError(resolved.errors, "OpenCode plugin input (plugin input).fallback_model is not supported");
  });

  it("rejects unwrapped fallback_models with unknown sibling", async () => {
    const resolved = await loadResolvedBrosConfig({
      input: { fallback_models: ["openai/gpt-5.5"], unexpected_sibling: true },
      includeFiles: false,
    });

    assertHasError(resolved.errors, "OpenCode plugin input (plugin input).unexpected_sibling is not supported");
  });

  it("still rejects wrapped removed keys", async () => {
    const resolved = await loadResolvedBrosConfig({
      input: { bros_harness: { fallback_model: "openai/gpt-5.5", model_routing: { docs: "docs-model" } } },
      includeFiles: false,
    });

    assertHasError(resolved.errors, "OpenCode plugin input (plugin input).fallback_model is not supported");
    assertHasError(resolved.errors, "OpenCode plugin input (plugin input).model_routing is not supported");
  });

  it("accepts valid unwrapped allowed keys", async () => {
    const resolved = await loadResolvedBrosConfig({
      input: { fallback_models: ["openai/gpt-5.5"], categories: { docs: "docs-model" } },
      includeFiles: false,
    });

    assert.deepStrictEqual(resolved.errors, []);
    assert.deepStrictEqual(resolved.fallbackModels, [{ model: "openai/gpt-5.5" }]);
    assert.deepStrictEqual(resolved.categories, { docs: { model: "docs-model" } });
  });
});

describe("applyModelRoutingToAgents", () => {
  it("routing precedence: agents > categories > fallback_models", () => {
    const baseAgents = {
      "mighty-bro": { model: "base-planner" },
      "bro-explore": { model: "base-explore" },
      "bro-docs": { model: "base-docs" },
      "bro-design": { model: "base-design" },
      "bro-ui": { model: "base-ui" },
    };
    const resolvedConfig = {
      fallbackModels: [{ model: "fallback-model" }],
      categories: {
        explorer_search: { model: "category-explore" },
        docs: { model: "category-docs" },
        architecture: { model: "category-architecture" },
        ui: { model: "category-ui" },
      },
      agents: {
        "bro-docs": { model: "agent-docs" },
        "bro-ui": { model: "agent-ui" },
      },
    };

    const { agents } = applyModelRoutingToAgents(baseAgents, resolvedConfig);

    assert.equal(agents["mighty-bro"].model, "fallback-model");
    assert.equal(agents["bro-explore"].model, "category-explore");
    assert.equal(agents["bro-docs"].model, "agent-docs");
    assert.equal(agents["bro-design"].model, "category-architecture");
    assert.equal(agents["bro-ui"].model, "agent-ui");
  });

  it("removed modelRouting compatibility branch is not used as a route source", () => {
    const route = resolveModelRouteForAgent("bro-shield", {
      modelRouting: { security: { model: "legacy/security" } },
      categories: {},
      agents: {},
      fallbackModels: [],
    });

    assert.equal(route, undefined);
  });

  it("restricted category does not get fallback_models", () => {
    const { agents, events } = applyModelRoutingToAgents(
      { "bro-build": { model: "base-build" } },
      { fallbackModels: [{ model: "fallback-model" }], categories: {}, agents: {} },
    );

    assert.equal(agents["bro-build"].model, "base-build");
    assert.deepStrictEqual(events, []);
  });

  it("restricted category can still use explicit category route while ignoring global fallback_models", () => {
    const { agents, events } = applyModelRoutingToAgents(
      { "bro-build": { model: "base-build" } },
      {
        fallbackModels: [{ model: "fallback-model" }],
        categories: { coder_build: { model: "explicit-build", variant: "high" } },
        agents: {},
      },
    );

    assert.equal(agents["bro-build"].model, "explicit-build");
    assert.equal(agents["bro-build"].variant, "high");
    assert.deepStrictEqual(events, [
      { agent: "bro-build", category: "coder_build", model: "explicit-build", variant: "high", source: "categories", fallback_count: 0 },
    ]);
  });

  it("unrestricted category gets first fallback_models object variant and fallback count", () => {
    const { agents, events } = applyModelRoutingToAgents(
      { "bro-explore": { model: "base-explore" } },
      {
        fallbackModels: [{ model: "fallback-model", variant: "balanced" }, { model: "backup-two" }],
        categories: {},
        agents: {},
      },
    );

    assert.equal(agents["bro-explore"].model, "fallback-model");
    assert.equal(agents["bro-explore"].variant, "balanced");
    assert.deepStrictEqual(events, [
      { agent: "bro-explore", category: "explorer_search", model: "fallback-model", variant: "balanced", source: "fallback_models", fallback_count: 2 },
    ]);
  });

  it("fallback_models order is preserved and first entry is selected", () => {
    const resolved = resolveBrosConfig([
      {
        config: { fallback_models: ["test/first", { model: "test/second", variant: "second" }] },
        source: "test",
      },
    ]);
    const { agents } = applyModelRoutingToAgents({ "bro-docs": { model: "base-docs" } }, resolved);

    assert.deepStrictEqual(resolved.fallbackModels, [{ model: "test/first" }, { model: "test/second", variant: "second" }]);
    assert.equal(agents["bro-docs"].model, "test/first");
    assert.equal(agents["bro-docs"].variant, undefined);
  });

  it("variant propagated to agent from category", () => {
    const { agents } = applyModelRoutingToAgents(
      { "mighty-bro": { model: "base-planner" } },
      { categories: { planner: { model: "planner-model", variant: "fast" } }, agents: {} },
    );

    assert.equal(agents["mighty-bro"].model, "planner-model");
    assert.equal(agents["mighty-bro"].variant, "fast");
  });

  it("events generated for category model override", () => {
    const { events } = applyModelRoutingToAgents(
      { "mighty-bro": { model: "base-planner" } },
      {
        categories: { planner: { model: "planner-model", variant: "fast", fallback_models: ["backup"] } },
        agents: {},
      },
    );

    assert.deepStrictEqual(events, [
      {
        agent: "mighty-bro",
        category: "planner",
        model: "planner-model",
        variant: "fast",
        source: "categories",
        fallback_count: 1,
      },
    ]);
  });

  it("no event when no override", () => {
    const { agents, events } = applyModelRoutingToAgents(
      { "mighty-bro": { model: "base-planner" } },
      { categories: {}, agents: {} },
    );

    assert.equal(agents["mighty-bro"].model, "base-planner");
    assert.deepStrictEqual(events, []);
  });
});

describe("applyPermissionProfilesToAgents", () => {
  it("treats approval package files as audit metadata, not runtime command scope", () => {
    const resolved = resolveBrosConfig([{ config: { approval_packages: [futureApprovalPackage] }, source: "test" }]);
    const { agents, events } = applyPermissionProfilesToAgents({ "bro-build": { permission: { bash: { "*": "ask" } } } }, resolved);

    assert.deepStrictEqual(resolved.errors, []);
    assert.equal(agents["bro-build"].permission.bash["git status*"], "allow");
    assert.equal(agents["bro-build"].permission.bash["git reset --hard*"], "deny");
    assert.equal(Object.hasOwn(agents["bro-build"].permission, "external_directory"), false);
    assert.equal(Object.keys(agents["bro-build"].permission.bash).some((pattern) => pattern.includes("src/**")), false);
    assert.deepStrictEqual(events[0].files, ["src/**"]);
  });
});

describe("brosHarnessServer runtime model propagation", () => {
  it("summarizes fallback routing warnings instead of logging repeated category blocks", async () => {
    const server = await brosHarnessServer({ bros_harness: { fallback_models: ["test/fallback"] } }, { includeFiles: false });
    const messages = [];
    const originalWarn = console.warn;
    console.warn = (message) => messages.push(String(message));
    try {
      server.config({});
    } finally {
      console.warn = originalWarn;
    }

    assert.ok(messages.some((message) => message.includes("loaded bros-harness@0.6.7")));
    assert.equal(messages.filter((message) => message.includes("fallback_models not applied to restricted categories")).length, 1);
    assert.equal(messages.some((message) => message.includes("fallback_models will not be applied to coder_build")), false);
    assert.ok(messages.some((message) => message.includes("routing applied: 5 agent(s) via fallback_models")));
  });

  it("can suppress config log messages for smoke harness scenarios without changing applied config", async () => {
    const server = await brosHarnessServer(
      { bros_harness: { fallback_models: ["test/fallback"] } },
      { includeFiles: false, configLogging: false },
    );
    const messages = [];
    const originalWarn = console.warn;
    console.warn = (message) => messages.push(String(message));
    const cfg = {};
    try {
      server.config(cfg);
    } finally {
      console.warn = originalWarn;
    }

    assert.deepStrictEqual(messages, []);
    assert.equal(cfg.agent["bro-docs"].model, "test/fallback");
  });

  it("logs approval-package events without profile or expiry placeholders", async () => {
    const server = await brosHarnessServer({ bros_harness: { approval_packages: [futureApprovalPackage] } }, { includeFiles: false });
    const messages = [];
    const originalWarn = console.warn;
    console.warn = (message) => messages.push(String(message));
    try {
      server.config({});
    } finally {
      console.warn = originalWarn;
    }

    assert.ok(messages.some((message) => message.includes("approval package applied: bro-build uses git_read")));
    assert.ok(messages.some((message) => message.includes("trace: BROS-TEST-APPROVAL")));
    assert.ok(messages.some((message) => message.includes("files: 1 audit entries") && message.includes("files_present: true")));
    assert.ok(messages.some((message) => message.includes("reason_present: true")));
    assert.equal(messages.some((message) => message.includes(futureApprovalPackage.reason)), false);
    assert.equal(messages.some((message) => message.includes("permission profile applied") && message.includes("undefined")), false);
    assert.equal(messages.some((message) => message.includes("undefined")), false);
  });

  it("logs permission-profile events without free-form reasons", async () => {
    const server = await brosHarnessServer({ bros_harness: { permission_profiles: futurePermissionProfiles } }, { includeFiles: false });
    const messages = [];
    const originalWarn = console.warn;
    console.warn = (message) => messages.push(String(message));
    try {
      server.config({});
    } finally {
      console.warn = originalWarn;
    }

    assert.ok(messages.some((message) => message.includes("permission profile applied: bro-explore uses readonly")));
    assert.ok(messages.some((message) => message.includes("within repo scope until 2999-01-01T00:00:00.000Z")));
    assert.ok(messages.some((message) => message.includes("reason_present: true")));
    assert.equal(messages.some((message) => message.includes(futurePermissionProfiles.reason)), false);
    assert.equal(messages.some((message) => message.includes("undefined")), false);
  });

  it("patches only model on a preexisting known BROS agent with explicit agent routing", async () => {
    const server = await brosHarnessServer({ bros_harness: { agents: { "bro-build": "test/explicit-build" } } }, { includeFiles: false, configLogging: false });
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
    const server = await brosHarnessServer({ bros_harness: { categories: { security: "test/security-model" } } }, { includeFiles: false, configLogging: false });
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

  it("patches preexisting known BROS agent model from explicit category routing", async () => {
    const server = await brosHarnessServer({ bros_harness: { categories: { qa_review: "test/qa-model" } } }, { includeFiles: false, configLogging: false });
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
    const server = await brosHarnessServer({ bros_harness: { categories: { docs: "test/docs-model" } } }, { includeFiles: false, configLogging: false });
    const cfg = {
      agent: {
        "not-a-bro": { model: "test/original", prompt: "unknown prompt" },
      },
    };

    server.config(cfg);

    assert.equal(cfg.agent["not-a-bro"].model, "test/original");
    assert.equal(cfg.agent["not-a-bro"].prompt, "unknown prompt");
  });

  it("does not apply fallback_models to restricted preexisting BROS agents", async () => {
    const server = await brosHarnessServer({ bros_harness: { fallback_models: ["test/fallback"] } }, { includeFiles: false, configLogging: false });
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

describe("BROS CLI local status messaging", () => {
  it("prints the loaded package version and offline update-check notice", async () => {
    const { stdout } = await execFileAsync(process.execPath, ["bin/bros.mjs", "status"], { cwd: packageRoot });

    assert.match(stdout, /Loaded version: bros-harness@0\.6\.7/);
    assert.match(stdout, /Update check: offline\/local only/);
    assert.match(stdout, /no registry query was performed/i);
  });
});

describe("brosConfigDefaults", () => {
  it("has expected keys and canonical categories", () => {
    for (const key of [
      "modelEntryShape",
      "modelEntryAliases",
      "agentNames",
      "restrictedCategoryMessage",
      "fallbackRestrictedCategories",
      "categoryRegistry",
      "categoryAliases",
      "agentCategories",
    ]) {
      assert.ok(Object.hasOwn(brosConfigDefaults, key), `missing ${key}`);
    }
    assert.ok(brosConfigDefaults.categories.includes("architecture"));
    assert.ok(brosConfigDefaults.categories.includes("ui"));
    assert.ok(!brosConfigDefaults.categories.includes("design"));
    assert.ok(!brosConfigDefaults.modelEntryAliases.includes("designer"));
    assert.equal(brosConfigDefaults.categoryRegistry.security.restrictedFallback, true);
    assert.equal(brosConfigDefaults.categoryRegistry.security.permissionAuthority, false);
  });

  it("workflow classifier reports category-driven routing responsibility", () => {
    const securityRoute = classifyRoutingScenario({ tags: ["security"] });

    assert.equal(securityRoute.mode, "FULL_BROS");
    assert.ok(securityRoute.categories.includes("security"));
    assert.ok(securityRoute.agents.includes("bro-shield"));
    assert.ok(securityRoute.agents.includes("bro-build"));
  });

  it("uses the OpenCode config directory for the global config path", () => {
    assert.equal(brosConfigDefaults.globalConfigPath, join(homedir(), ".config", "opencode", "bros.config.json"));
  });
});
