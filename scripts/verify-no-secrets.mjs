#!/usr/bin/env node
import { readdir, readFile } from "node:fs/promises";
import { join, relative } from "node:path";

const root = process.cwd();
const ignoredDirectories = new Set([".git", ".bros", ".opencode", "node_modules", "dist", "coverage"]);
const ignoredFileNames = new Set([".npmrc", ".netrc"]);
const ignoredPathPatterns = [
  /(?:^|\/)(?:\.env|\.env\..*)$/,
  /(?:^|\/)(?:id_rsa|id_ed25519)$/,
  /(?:^|\/).*\.(?:pem|key|p12|pfx)$/i,
  /(?:^|\/).*(?:credential|provider-key|private-key|secret|token).*$/i,
];
const secretPatterns = [
  /api[_-]?key\s*[:=]\s*['\"][^'\"]{8,}/i,
  /authorization\s*[:=]\s*['\"]?bearer\s+[a-z0-9._-]{8,}/i,
  /-----BEGIN (?:RSA |OPENSSH |EC |DSA )?PRIVATE KEY-----/,
  /(?:token|secret|password)\s*[:=]\s*['\"][^'\"]{8,}/i
];

async function* walk(dir) {
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    const path = join(dir, entry.name);
    const rel = relative(root, path);
    if (entry.isDirectory() && ignoredDirectories.has(entry.name)) continue;
    if (!entry.isDirectory() && ignoredFileNames.has(entry.name)) continue;
    if (ignoredPathPatterns.some((pattern) => pattern.test(rel))) continue;
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
