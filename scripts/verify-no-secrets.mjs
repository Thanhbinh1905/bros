#!/usr/bin/env node
import { readdir, readFile } from "node:fs/promises";
import { join, relative } from "node:path";

const root = process.cwd();
const ignored = new Set([".git", "node_modules", "dist", "coverage"]);
const secretPatterns = [
  /api[_-]?key\s*[:=]\s*['\"][^'\"]{8,}/i,
  /authorization\s*[:=]\s*['\"]?bearer\s+[a-z0-9._-]{8,}/i,
  /-----BEGIN (?:RSA |OPENSSH |EC |DSA )?PRIVATE KEY-----/,
  /(?:token|secret|password)\s*[:=]\s*['\"][^'\"]{8,}/i
];

async function* walk(dir) {
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    if (ignored.has(entry.name)) continue;
    const path = join(dir, entry.name);
    if (entry.isDirectory()) yield* walk(path);
    else yield path;
  }
}

const findings = [];
for await (const file of walk(root)) {
  const rel = relative(root, file);
  const text = await readFile(file, "utf8").catch(() => "");
  for (const pattern of secretPatterns) {
    if (pattern.test(text)) findings.push(rel);
  }
}

if (findings.length > 0) {
  console.error("Potential secret-like content found in files:");
  for (const file of findings) console.error(`- ${file}`);
  process.exit(1);
}

console.log("No secret-like content detected by scaffold patterns.");
