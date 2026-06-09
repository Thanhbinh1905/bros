#!/usr/bin/env node
import { readFile } from "node:fs/promises";
import { classifyRoutingScenario, workflowDepths, workflowModes } from "../src/routing-policy.mjs";

const scenarios = JSON.parse(await readFile("scripts/fixtures/routing-scenarios.json", "utf8"));
const errors = [];

for (const scenario of scenarios) {
  const actual = classifyRoutingScenario(scenario);
  if (!workflowModes.includes(actual.mode)) errors.push(`${scenario.id}: unknown mode ${actual.mode}`);
  if (!workflowDepths.includes(actual.depth)) errors.push(`${scenario.id}: unknown depth ${actual.depth}`);

  const expected = scenario.expected ?? {};
  for (const key of ["mode", "depth", "governance"]) {
    if (expected[key] && actual[key] !== expected[key]) errors.push(`${scenario.id}: expected ${key} ${expected[key]}, got ${actual[key]}`);
  }
  for (const agent of expected.agents ?? []) {
    if (!actual.agents.includes(agent)) errors.push(`${scenario.id}: missing expected agent ${agent}`);
  }
  for (const blocked of expected.blocked ?? []) {
    if (!actual.blocked.includes(blocked)) errors.push(`${scenario.id}: missing expected blocker ${blocked}`);
  }
  if (actual.blocked.includes("hard_denied_command") && actual.mode === "INFO_ONLY") {
    errors.push(`${scenario.id}: hard-denied command must not stay in INFO_ONLY`);
  }
}

if (errors.length > 0) {
  console.error(errors.join("\n"));
  process.exit(1);
}

console.log(`Routing scenarios passed: ${scenarios.length} scenarios validated.`);
