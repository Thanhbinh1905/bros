#!/usr/bin/env node
import { access, readFile } from "node:fs/promises";

const requiredPaths = [
  "assets/opencode/agents",
  "assets/opencode/commands",
  "assets/opencode/skills",
  "assets/opencode/templates",
  "assets/opencode/docs",
  "assets/manifest.json"
];

for (const path of requiredPaths) {
  await access(path);
}

const manifest = JSON.parse(await readFile("assets/manifest.json", "utf8"));
if (manifest.name !== "bros-harness" || !Array.isArray(manifest.entries)) {
  throw new Error("Invalid asset manifest shape.");
}

console.log(`Validated ${manifest.entries.length} manifest entries.`);
