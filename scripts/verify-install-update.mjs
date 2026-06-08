#!/usr/bin/env node
import assert from "node:assert/strict";
import { mkdir, mkdtemp, readFile, rm, stat, symlink, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { runInstallUpdate } from "../src/install.mjs";

const packageJson = JSON.parse(await readFile("package.json", "utf8"));
const currentPluginSpec = `bros-harness@${packageJson.version}`;
for (const lifecycleScript of ["preinstall", "install", "postinstall", "prepublish", "prepare", "prepack", "postpack"]) {
  assert.equal(Object.hasOwn(packageJson.scripts ?? {}, lifecycleScript), false, `package.json must not define ${lifecycleScript}`);
}

const installSource = await readFile("src/install.mjs", "utf8");
assert.equal(/child_process|execFile|spawn\(|\bnpm\s+install\b|\bbun\s+install\b|\bbunx\b|\bnpx\b/.test(installSource), false, "install/update implementation must not execute package-manager commands");
assert.equal(/rm\s+-rf|rmdir\(/i.test(installSource), false, "install/update implementation must not use broad shell-style deletion");
assert.equal(/rm\(targets\.(?:root|nodeModulesPath)/.test(installSource), false, "cache refresh must not delete the full OpenCode cache root or node_modules directory");
assert.match(installSource, /rm\(targets\.packagePath/, "cache refresh deletion must be scoped to the BROS package path");
assert.match(installSource, /randomUUID\(/, "install/update temp writes must use randomized temp file names");
assert.match(installSource, /open\(tempPath,\s*"wx"/, "install/update temp writes must use exclusive create semantics");
assert.match(installSource, /unlink\(tempPath\)/, "install/update temp writes must clean up failed temp files");

async function withTempDir(fn) {
  const dir = await mkdtemp(join(tmpdir(), "bros-install-update-"));
  try {
    await fn(dir);
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
}

async function readJson(path) {
  return JSON.parse(await readFile(path, "utf8"));
}

async function assertMissing(path, message) {
  await assert.rejects(() => stat(path), /ENOENT/, message);
}

async function assertJsonOutput(fn) {
  const result = await fn();
  const parsed = JSON.parse(result.output.trim());
  assert.equal(parsed.ok, true);
  assert.equal(typeof parsed.command, "string");
  if (parsed.refresh_cache !== true || parsed.dry_run === true) assert.equal(parsed.contains_cache_deletion, false);
  assert.equal(parsed.executes_package_manager, false);
  assert.equal(JSON.stringify(parsed).includes("SECRET_VALUE"), false);
  return parsed;
}

function parseJsonResult(result) {
  return JSON.parse(result.output.trim());
}

await withTempDir(async (dir) => {
  const opencodePath = join(dir, "opencode.jsonc");
  const legacyOpencodePath = join(dir, "opencode.json");
  const brosConfigPath = join(dir, "bros.config.json");

  const dryRun = await assertJsonOutput(() => runInstallUpdate({ command: "install", cwd: dir, scope: "project", dryRun: true, json: true }));
  assert.equal(dryRun.changed, true);
  assert.equal(dryRun.files.every((file) => file.dry_run === true), true);
  assert.equal(dryRun.files.some((file) => file.path.endsWith("opencode.jsonc")), true, "default OpenCode config target should be opencode.jsonc");
  await assertMissing(opencodePath, "dry-run must not create opencode.jsonc");
  await assertMissing(legacyOpencodePath, "dry-run must not create opencode.json");
  await assertMissing(brosConfigPath, "dry-run must not create bros.config.json");
});

await withTempDir(async (dir) => {
  const opencodePath = join(dir, "opencode.jsonc");
  const legacyOpencodePath = join(dir, "opencode.json");
  const brosConfigPath = join(dir, "bros.config.json");

  const install = await runInstallUpdate({ command: "install", cwd: dir, scope: "project", json: true });
  assert.equal(install.status, 0);
  const config = await readJson(opencodePath);
  assert.deepStrictEqual(config.plugin, [currentPluginSpec]);
  assert.equal(config.$schema, "https://opencode.ai/config.json");
  await assertMissing(legacyOpencodePath, "default install must not create sibling opencode.json");
  const brosConfig = await readJson(brosConfigPath);
  assert.equal(brosConfig.$schema, "https://raw.githubusercontent.com/Thanhbinh1905/bros/main/examples/bros.config.schema.json");

  const rerun = await runInstallUpdate({ command: "install", cwd: dir, scope: "project", json: true });
  assert.equal(rerun.status, 0);
  const parsed = JSON.parse(rerun.output.trim());
  assert.equal(parsed.changed, false, "idempotent rerun should produce unchanged state");
});

await withTempDir(async (dir) => {
  const opencodeJsoncPath = join(dir, "opencode.jsonc");
  const opencodeJsonPath = join(dir, "opencode.json");
  await writeFile(opencodeJsoncPath, `{
    // Existing JSONC config should remain the selected target.
    "plugin": ["existing-plugin", "bros-harness@latest",],
  }
`);

  const parsed = await assertJsonOutput(() => runInstallUpdate({ command: "update", cwd: dir, scope: "project", json: true }));
  assert.equal(parsed.changed, true);
  assert.equal(parsed.files.some((file) => file.path.endsWith("opencode.jsonc") && file.backup_created === true), true);
  await assertMissing(opencodeJsonPath, "updating opencode.jsonc must not create sibling opencode.json");
  const config = await readJson(opencodeJsoncPath);
  assert.deepStrictEqual(config.plugin, ["existing-plugin", currentPluginSpec], "existing @latest should normalize to the current package version by default");
});

await withTempDir(async (dir) => {
  const opencodePath = join(dir, "opencode.json");
  await writeFile(opencodePath, JSON.stringify({ plugin: ["existing-plugin", "bros-harness@0.4.2"], provider: { example: { options: { endpoint: "SECRET_VALUE" } } } }, null, 2));

  const parsed = await assertJsonOutput(() => runInstallUpdate({ command: "update", cwd: dir, scope: "project", json: true }));
  assert.equal(parsed.changed, true);
  assert.equal(parsed.files.some((file) => file.backup_created === true), true);
  const config = await readJson(opencodePath);
  assert.deepStrictEqual(config.plugin, ["existing-plugin", currentPluginSpec]);
  assert.equal(config.provider.example.options.endpoint, "SECRET_VALUE", "user-managed fields must be preserved on disk");
});

await withTempDir(async (dir) => {
  const opencodePath = join(dir, "opencode.json");
  await writeFile(opencodePath, JSON.stringify({ plugin: ["existing-plugin", "bros-harness@0.4.2"] }, null, 2));

  const parsed = await assertJsonOutput(() => runInstallUpdate({ command: "update", cwd: dir, scope: "project", channel: "latest", json: true }));
  assert.equal(parsed.channel, "latest");
  assert.equal(parsed.plugin_spec, "bros-harness@latest");
  const config = await readJson(opencodePath);
  assert.deepStrictEqual(config.plugin, ["existing-plugin", "bros-harness@latest"], "--channel latest should opt into @latest");
});

await withTempDir(async (dir) => {
  const cacheRoot = join(dir, "opencode-cache");
  const packageCachePath = join(cacheRoot, "node_modules", "bros-harness");
  const lockPath = join(cacheRoot, "bun.lock");
  const lockbPath = join(cacheRoot, "bun.lockb");
  await mkdir(packageCachePath, { recursive: true });
  await writeFile(join(packageCachePath, "package.json"), JSON.stringify({ name: "bros-harness" }, null, 2));
  await writeFile(lockPath, JSON.stringify({
    workspaces: { "": { dependencies: { "bros-harness": "0.4.2", "other-plugin": "1.0.0" } } },
    packages: {
      "bros-harness": ["bros-harness@0.4.2"],
      "other-plugin": ["other-plugin@1.0.0"],
    },
  }, null, 2));
  await writeFile(lockbPath, "fixture-binary-lock");

  const parsed = await assertJsonOutput(() => runInstallUpdate({ command: "update", cwd: dir, scope: "project", refreshCache: true, cacheRoot, dryRun: true, json: true }));
  assert.equal(parsed.refresh_cache, true);
  assert.equal(parsed.cache_changed, true);
  assert.equal(parsed.contains_cache_deletion, false, "dry-run must not report actual cache deletion");
  await stat(packageCachePath);
  await stat(join(cacheRoot, "node_modules"));
  await stat(cacheRoot);
  assert.deepStrictEqual((await readJson(lockPath)).packages["bros-harness"], ["bros-harness@0.4.2"], "dry-run must not rewrite bun.lock");
  await stat(lockbPath);
});

await withTempDir(async (dir) => {
  const cacheRoot = join(dir, "opencode-cache");
  const packageCachePath = join(cacheRoot, "node_modules", "bros-harness");
  const otherPackagePath = join(cacheRoot, "node_modules", "other-plugin");
  const lockPath = join(cacheRoot, "bun.lock");
  const lockbPath = join(cacheRoot, "bun.lockb");
  await mkdir(packageCachePath, { recursive: true });
  await mkdir(otherPackagePath, { recursive: true });
  await writeFile(join(packageCachePath, "package.json"), JSON.stringify({ name: "bros-harness" }, null, 2));
  await writeFile(join(otherPackagePath, "package.json"), JSON.stringify({ name: "other-plugin" }, null, 2));
  await writeFile(lockPath, JSON.stringify({
    workspaces: { "": { dependencies: { "bros-harness": "0.4.2", "other-plugin": "1.0.0" } } },
    packages: {
      "bros-harness": ["bros-harness@0.4.2"],
      "bros-harness@0.4.2": ["bros-harness@0.4.2"],
      "other-plugin": ["other-plugin@1.0.0"],
    },
  }, null, 2));
  await writeFile(lockbPath, "fixture-binary-lock");

  const parsed = await assertJsonOutput(() => runInstallUpdate({ command: "update", cwd: dir, scope: "project", refreshCache: true, cacheRoot, json: true }));
  assert.equal(parsed.refresh_cache, true);
  assert.equal(parsed.cache_changed, true);
  assert.equal(parsed.contains_cache_deletion, true, "non-dry-run refresh-cache should explicitly report scoped cache deletion");
  await assertMissing(packageCachePath, "refresh-cache must delete only fixture node_modules/bros-harness");
  await stat(otherPackagePath);
  await stat(join(cacheRoot, "node_modules"));
  await stat(cacheRoot);
  const lock = await readJson(lockPath);
  assert.equal(Object.hasOwn(lock.packages, "bros-harness"), false, "bun.lock package entry must be removed");
  assert.equal(Object.hasOwn(lock.packages, "bros-harness@0.4.2"), false, "bun.lock pinned package entry must be removed");
  assert.equal(lock.workspaces[""].dependencies["bros-harness"], "0.4.2", "package dependency declaration must be preserved");
  assert.deepStrictEqual(lock.packages["other-plugin"], ["other-plugin@1.0.0"]);
  await assertMissing(lockbPath, "binary bun.lockb deletion must be scoped and explicit to --refresh-cache");
});

await withTempDir(async (dir) => {
  const realCacheRoot = join(dir, "real-opencode-cache");
  const symlinkedCacheRoot = join(dir, "opencode-cache-link");
  const packageCachePath = join(realCacheRoot, "node_modules", "bros-harness");
  const lockPath = join(realCacheRoot, "bun.lock");
  const lockbPath = join(realCacheRoot, "bun.lockb");
  const lockText = JSON.stringify({ packages: { "bros-harness": ["bros-harness@0.4.2"] } }, null, 2);
  await mkdir(packageCachePath, { recursive: true });
  await writeFile(join(packageCachePath, "package.json"), JSON.stringify({ name: "bros-harness" }, null, 2));
  await writeFile(lockPath, lockText);
  await writeFile(lockbPath, "fixture-binary-lock");
  await symlink(realCacheRoot, symlinkedCacheRoot, "dir");

  const result = await runInstallUpdate({ command: "update", cwd: dir, scope: "project", refreshCache: true, cacheRoot: symlinkedCacheRoot, json: true });
  assert.equal(result.status, 1);
  const parsed = parseJsonResult(result);
  assert.equal(parsed.ok, false);
  assert.match(parsed.error.message, /symlinked OpenCode cache root/);
  assert.equal(parsed.contains_cache_deletion, false);
  await stat(packageCachePath);
  assert.equal(await readFile(lockPath, "utf8"), lockText, "symlinked cache root must not mutate bun.lock target");
  await stat(lockbPath);
  await assertMissing(join(dir, "opencode.jsonc"), "failed cache preflight must not create project config");
});

await withTempDir(async (dir) => {
  const cacheRoot = join(dir, "opencode-cache");
  const realNodeModules = join(dir, "outside-node-modules");
  const packageCachePath = join(realNodeModules, "bros-harness");
  const lockPath = join(cacheRoot, "bun.lock");
  const lockbPath = join(cacheRoot, "bun.lockb");
  const lockText = JSON.stringify({ packages: { "bros-harness": ["bros-harness@0.4.2"] } }, null, 2);
  await mkdir(cacheRoot, { recursive: true });
  await mkdir(packageCachePath, { recursive: true });
  await writeFile(join(packageCachePath, "package.json"), JSON.stringify({ name: "bros-harness" }, null, 2));
  await writeFile(lockPath, lockText);
  await writeFile(lockbPath, "fixture-binary-lock");
  await symlink(realNodeModules, join(cacheRoot, "node_modules"), "dir");

  const result = await runInstallUpdate({ command: "update", cwd: dir, scope: "project", refreshCache: true, cacheRoot, json: true });
  assert.equal(result.status, 1);
  const parsed = parseJsonResult(result);
  assert.equal(parsed.ok, false);
  assert.match(parsed.error.message, /symlinked OpenCode node_modules cache directory/);
  assert.equal(parsed.contains_cache_deletion, false);
  await stat(packageCachePath);
  assert.equal(await readFile(lockPath, "utf8"), lockText, "symlinked node_modules must not mutate bun.lock");
  await stat(lockbPath);
  await assertMissing(join(dir, "opencode.jsonc"), "failed cache preflight must not create project config");
});

await withTempDir(async (dir) => {
  const configHome = join(dir, "config-home");
  const parsed = await assertJsonOutput(() => runInstallUpdate({ command: "install", cwd: join(dir, "project"), scope: "global", configHome, json: true }));
  assert.equal(parsed.scope, "global");
  assert.equal(parsed.changed, true);
  assert.deepStrictEqual((await readJson(join(configHome, "opencode", "opencode.jsonc"))).plugin, [currentPluginSpec]);
  await assertMissing(join(configHome, "opencode", "opencode.json"), "global default install must not create sibling opencode.json");
  assert.equal((await readJson(join(configHome, "opencode", "bros.config.json"))).$schema, "https://raw.githubusercontent.com/Thanhbinh1905/bros/main/examples/bros.config.schema.json");
});

await withTempDir(async (dir) => {
  await writeFile(join(dir, "opencode.json"), "{ malformed");
  const result = await runInstallUpdate({ command: "install", cwd: dir, scope: "project", json: true });
  assert.equal(result.status, 1);
  const parsed = JSON.parse(result.output.trim());
  assert.equal(parsed.ok, false);
  assert.match(parsed.error.message, /Malformed JSON/);
  assert.equal(parsed.changed, false);
  assert.equal(parsed.files.length, 0);
});

await withTempDir(async (dir) => {
  const target = join(dir, "outside-opencode.json");
  await writeFile(target, "{}");
  await symlink(target, join(dir, "opencode.json"));
  const result = await runInstallUpdate({ command: "install", cwd: dir, scope: "project", json: true });
  assert.equal(result.status, 1);
  assert.match(JSON.parse(result.output.trim()).error.message, /Refusing to mutate symlink/);
});

await withTempDir(async (dir) => {
  await writeFile(join(dir, "opencode.json"), JSON.stringify({ plugin: "bros-harness@latest" }, null, 2));
  const result = await runInstallUpdate({ command: "install", cwd: dir, scope: "project", json: true });
  assert.equal(result.status, 1);
  assert.match(JSON.parse(result.output.trim()).error.message, /plugin must be an array/);
});

await withTempDir(async (dir) => {
  const rawModelValue = "raw-diagnostic-model-do-not-echo";
  const rawProfileValue = "raw-diagnostic-profile-do-not-echo";
  await writeFile(join(dir, "bros.config.json"), JSON.stringify({
    fallback_models: [rawModelValue, rawModelValue],
    permission_profiles: {
      enabled: [rawProfileValue],
      scope: "repo",
      expires_at: "2999-01-01T00:00:00.000Z",
      reason: "approved verification reason",
    },
  }, null, 2));
  const result = await runInstallUpdate({ command: "install", cwd: dir, scope: "project", json: true });
  assert.equal(result.status, 1);
  const message = JSON.parse(result.output.trim()).error.message;
  assert.match(message, /fallback_models\[1\] duplicates an earlier model entry/);
  assert.match(message, /permission_profiles\.enabled\[0\] is not a supported profile/);
  assert.equal(message.includes(rawModelValue), false, "invalid config diagnostics must not echo raw duplicate model values");
  assert.equal(message.includes(rawProfileValue), false, "invalid config diagnostics must not echo raw unsupported profile values");
});

console.log("Install/update validation: ok");
