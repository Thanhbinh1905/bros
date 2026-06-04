import { randomUUID } from "node:crypto";
import { copyFile, lstat, mkdir, open, readFile, realpath, rename, rm, unlink, writeFile } from "node:fs/promises";
import { createRequire } from "node:module";
import { homedir } from "node:os";
import { dirname, isAbsolute, join, relative, resolve } from "node:path";

import { validateBrosConfig } from "./config.mjs";

const OPENCODE_SCHEMA = "https://opencode.ai/config.json";
const BROS_CONFIG_SCHEMA = "https://raw.githubusercontent.com/Thanhbinh1905/bros/main/examples/bros.config.schema.json";
const require = createRequire(import.meta.url);
const packageJson = require("../package.json");
const BROS_PACKAGE_NAME = "bros-harness";
const BROS_PLUGIN_SPEC_CURRENT = `${BROS_PACKAGE_NAME}@${packageJson.version}`;
const BROS_PLUGIN_SPEC_LATEST = `${BROS_PACKAGE_NAME}@latest`;
const BROS_CONFIG_FILE = "bros.config.json";
const OPENCODE_CONFIG_JSON_FILE = "opencode.json";
const OPENCODE_CONFIG_JSONC_FILE = "opencode.jsonc";
const SENSITIVE_PATTERN = /(?:api[_-]?key|authorization|bearer|token|secret|password|credential|private[_-]?key|_auth|sk-[A-Za-z0-9]{20,}|SECRET_VALUE)/gi;

function isObject(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function redact(value) {
  return String(value).replace(SENSITIVE_PATTERN, "[REDACTED]");
}

function prettyJson(value) {
  return `${JSON.stringify(value, null, 2)}\n`;
}

function assertContained(path, root) {
  const resolvedPath = resolve(path);
  const resolvedRoot = resolve(root);
  const rel = relative(resolvedRoot, resolvedPath);
  if (rel === "" || (!rel.startsWith("..") && !isAbsolute(rel))) return resolvedPath;
  throw new InstallUpdateError("UNSAFE_PATH", `Resolved path escapes allowed scope: ${resolvedPath}`);
}

function assertRealContained(path, root, label) {
  const resolvedPath = resolve(path);
  const resolvedRoot = resolve(root);
  const rel = relative(resolvedRoot, resolvedPath);
  if (rel === "" || (!rel.startsWith("..") && !isAbsolute(rel))) return resolvedPath;
  throw new InstallUpdateError("UNSAFE_CACHE_TARGET", `${label} escapes the real OpenCode cache root.`);
}

class InstallUpdateError extends Error {
  constructor(code, message) {
    super(redact(message));
    this.name = "InstallUpdateError";
    this.code = code;
  }
}

function stripJsoncComments(text) {
  let output = "";
  let inString = false;
  let escaped = false;

  for (let index = 0; index < text.length; index += 1) {
    const char = text[index];
    const next = text[index + 1];

    if (inString) {
      output += char;
      if (escaped) {
        escaped = false;
      } else if (char === "\\") {
        escaped = true;
      } else if (char === "\"") {
        inString = false;
      }
      continue;
    }

    if (char === "\"") {
      inString = true;
      output += char;
      continue;
    }

    if (char === "/" && next === "/") {
      while (index < text.length && text[index] !== "\n" && text[index] !== "\r") index += 1;
      index -= 1;
      continue;
    }

    if (char === "/" && next === "*") {
      index += 2;
      while (index < text.length && !(text[index] === "*" && text[index + 1] === "/")) index += 1;
      if (index >= text.length) throw new InstallUpdateError("MALFORMED_JSON", "Malformed JSON/JSONC: unterminated block comment.");
      index += 1;
      continue;
    }

    output += char;
  }

  return output;
}

function stripJsoncTrailingCommas(text) {
  let output = "";
  let inString = false;
  let escaped = false;

  for (let index = 0; index < text.length; index += 1) {
    const char = text[index];

    if (inString) {
      output += char;
      if (escaped) {
        escaped = false;
      } else if (char === "\\") {
        escaped = true;
      } else if (char === "\"") {
        inString = false;
      }
      continue;
    }

    if (char === "\"") {
      inString = true;
      output += char;
      continue;
    }

    if (char === ",") {
      let lookahead = index + 1;
      while (/\s/.test(text[lookahead] ?? "")) lookahead += 1;
      if (text[lookahead] === "}" || text[lookahead] === "]") continue;
    }

    output += char;
  }

  return output;
}

function parseJsonOrJsonc(text, label) {
  try {
    return JSON.parse(text);
  } catch (jsonError) {
    try {
      return JSON.parse(stripJsoncTrailingCommas(stripJsoncComments(text)));
    } catch (jsoncError) {
      throw new InstallUpdateError("MALFORMED_JSON", `Malformed JSON/JSONC in ${label}: ${jsoncError.message || jsonError.message}`);
    }
  }
}

async function readJsonFile(path, label) {
  let text;
  try {
    text = await readFile(path, "utf8");
  } catch (error) {
    if (error?.code === "ENOENT") return { exists: false, value: undefined };
    throw new InstallUpdateError("READ_FAILED", `Unable to read ${label}: ${error.message}`);
  }

  return { exists: true, value: parseJsonOrJsonc(text, label) };
}

async function rejectExistingSymlink(path, label) {
  try {
    const stats = await lstat(path);
    if (stats.isSymbolicLink()) {
      throw new InstallUpdateError("SYMLINK_TARGET", `Refusing to mutate symlink at ${label}; edit the real file manually after confirming its target.`);
    }
  } catch (error) {
    if (error?.code === "ENOENT") return;
    throw error;
  }
}

function isBrosPluginSpec(spec) {
  return typeof spec === "string" && /^bros-harness(?:@.+)?$/.test(spec);
}

function resolvePluginSpec(channel = "version") {
  if (channel === "latest") return BROS_PLUGIN_SPEC_LATEST;
  if (channel === "version") return BROS_PLUGIN_SPEC_CURRENT;
  throw new InstallUpdateError("INVALID_CHANNEL", "--channel must be version or latest.");
}

function normalizePluginEntries(entries, pluginSpec) {
  const next = [];
  let hasBrosEntry = false;

  for (const entry of entries) {
    if (isBrosPluginSpec(entry)) {
      if (!hasBrosEntry) next.push(pluginSpec);
      hasBrosEntry = true;
      continue;
    }

    if (Array.isArray(entry) && isBrosPluginSpec(entry[0])) {
      if (!hasBrosEntry) next.push([pluginSpec, entry[1]]);
      hasBrosEntry = true;
      continue;
    }

    next.push(entry);
  }

  if (!hasBrosEntry) next.push(pluginSpec);
  return next;
}

function buildOpenCodeConfig(existing, { pluginSpec = BROS_PLUGIN_SPEC_CURRENT } = {}) {
  if (existing === undefined) {
    return {
      $schema: OPENCODE_SCHEMA,
      plugin: [pluginSpec],
    };
  }
  if (!isObject(existing)) throw new InstallUpdateError("INVALID_CONFIG", "OpenCode config must be a JSON object.");
  if (Object.hasOwn(existing, "plugin") && !Array.isArray(existing.plugin)) {
    throw new InstallUpdateError("INVALID_PLUGIN_FIELD", "OpenCode config plugin must be an array before BROS can update it safely.");
  }
  return {
    $schema: typeof existing.$schema === "string" ? existing.$schema : OPENCODE_SCHEMA,
    ...existing,
    plugin: normalizePluginEntries(existing.plugin ?? [], pluginSpec),
  };
}

function buildBrosConfig(existing, sourceLabel) {
  if (existing === undefined) {
    return { $schema: BROS_CONFIG_SCHEMA };
  }
  if (!isObject(existing)) throw new InstallUpdateError("INVALID_CONFIG", `${sourceLabel} must be a JSON object.`);
  const errors = validateBrosConfig(existing, sourceLabel);
  if (errors.length > 0) {
    throw new InstallUpdateError("INVALID_BROS_CONFIG", `${sourceLabel} failed validation; no migration was attempted. ${errors.join("; ")}`);
  }
  return existing;
}

let backupCounter = 0;

async function writeExclusiveTempFile(directory, label, content) {
  const safeLabel = label.replace(/[^a-z0-9._-]/gi, "-");
  const tempPath = join(directory, `.${safeLabel}.${process.pid}.${randomUUID()}.tmp`);
  let handle;
  let tempCreated = false;

  try {
    handle = await open(tempPath, "wx", 0o600);
    tempCreated = true;
    await handle.writeFile(content, "utf8");
    await handle.close();
    handle = undefined;
    return tempPath;
  } catch (error) {
    if (handle) {
      try {
        await handle.close();
      } catch {
        // Preserve the original write/open error.
      }
    }
    if (tempCreated) {
      try {
        await unlink(tempPath);
      } catch (cleanupError) {
        if (cleanupError?.code !== "ENOENT") {
          throw new InstallUpdateError("TEMP_WRITE_FAILED", `Unable to write ${label} safely; temp cleanup also failed: ${cleanupError.message}`);
        }
      }
    }
    throw error;
  }
}

async function writeJsonSafely({ path, label, allowedRoot, value, existed, dryRun }) {
  const resolvedPath = assertContained(path, allowedRoot);
  await rejectExistingSymlink(resolvedPath, label);

  const content = prettyJson(value);
  let current;
  if (existed) current = await readFile(resolvedPath, "utf8");
  const changed = !existed || current !== content;
  const action = !existed ? "create" : changed ? "update" : "unchanged";
  const record = {
    path: resolvedPath,
    action,
    changed,
    dry_run: dryRun === true,
    backup_created: false,
  };

  if (!changed || dryRun) return record;

  await mkdir(dirname(resolvedPath), { recursive: true });

  if (existed) {
    const backupPath = `${resolvedPath}.bros-backup-${new Date().toISOString().replace(/[:.]/g, "-")}-${process.pid}-${backupCounter++}`;
    await copyFile(resolvedPath, backupPath);
    record.backup_created = true;
    record.backup_path = backupPath;
  }

  const tempPath = await writeExclusiveTempFile(dirname(resolvedPath), label, content);
  try {
    await rename(tempPath, resolvedPath);
  } catch (error) {
    try {
      await unlink(tempPath);
    } catch (cleanupError) {
      if (cleanupError?.code !== "ENOENT") {
        throw new InstallUpdateError("RENAME_FAILED", `Unable to replace ${label} safely; temp cleanup also failed: ${cleanupError.message}`);
      }
    }
    throw error;
  }
  return record;
}

async function pathExists(path) {
  try {
    await lstat(path);
    return true;
  } catch (error) {
    if (error?.code === "ENOENT") return false;
    throw error;
  }
}

async function lstatIfExists(path) {
  try {
    return await lstat(path);
  } catch (error) {
    if (error?.code === "ENOENT") return undefined;
    throw error;
  }
}

function defaultOpenCodeCacheRoot() {
  return join(homedir(), ".cache", "opencode");
}

function makeCacheRecord({ type, path, action, changed, dryRun, note }) {
  return {
    type,
    path,
    action,
    changed: changed === true,
    dry_run: dryRun === true,
    ...(note ? { note } : {}),
  };
}

function isBrosLockPackageKey(key) {
  return key === BROS_PACKAGE_NAME || key.startsWith(`${BROS_PACKAGE_NAME}@`);
}

function removeBrosPackageFromJsonLock(text) {
  const lock = JSON.parse(text);
  let changed = false;
  if (isObject(lock.packages)) {
    for (const key of Object.keys(lock.packages)) {
      if (isBrosLockPackageKey(key)) {
        delete lock.packages[key];
        changed = true;
      }
    }
  }
  return { changed, text: changed ? prettyJson(lock) : text };
}

function removeBrosPackageFromTomlLikeLock(text) {
  const lines = text.split(/(?<=\n)/);
  const kept = [];
  let changed = false;
  let inPackagesSection = false;
  let skippingBrosPackageSection = false;

  for (const line of lines) {
    const trimmed = line.trim();
    const isSectionHeader = /^\[.+\]$/.test(trimmed);

    if (skippingBrosPackageSection) {
      if (!isSectionHeader) continue;
      skippingBrosPackageSection = false;
    }

    if (/^\[packages\]$/.test(trimmed)) {
      inPackagesSection = true;
      kept.push(line);
      continue;
    }
    if (/^\[packages(?:\.|\[)?["']?bros-harness(?:@[^"'\]\s]+)?["']?\]?\]$/.test(trimmed)) {
      changed = true;
      inPackagesSection = false;
      skippingBrosPackageSection = true;
      continue;
    }
    if (isSectionHeader && !/^\[packages\]$/.test(trimmed)) {
      inPackagesSection = false;
    }

    if (inPackagesSection && /^["']?bros-harness(?:@[^"'\]\s:=]+)?["']?\s*[:=]/.test(trimmed)) {
      changed = true;
      continue;
    }
    kept.push(line);
  }

  return { changed, text: changed ? kept.join("") : text };
}

function removeBrosPackageFromBunLock(text) {
  try {
    return removeBrosPackageFromJsonLock(text);
  } catch {
    return removeBrosPackageFromTomlLikeLock(text);
  }
}

function resolveCacheTargets(cacheRoot) {
  const root = resolve(cacheRoot ?? defaultOpenCodeCacheRoot());
  const nodeModulesPath = assertContained(join(root, "node_modules"), root);
  const packagePath = assertContained(join(nodeModulesPath, BROS_PACKAGE_NAME), nodeModulesPath);
  const bunLockPath = assertContained(join(root, "bun.lock"), root);
  const bunLockbPath = assertContained(join(root, "bun.lockb"), root);

  if (packagePath === root || packagePath === nodeModulesPath) {
    throw new InstallUpdateError("UNSAFE_CACHE_TARGET", "Refusing to target the OpenCode cache root or node_modules directory.");
  }
  if (relative(nodeModulesPath, packagePath) !== BROS_PACKAGE_NAME) {
    throw new InstallUpdateError("UNSAFE_CACHE_TARGET", "Refusing to target anything other than node_modules/bros-harness.");
  }

  return { root, nodeModulesPath, packagePath, bunLockPath, bunLockbPath };
}

async function rejectExistingCacheSymlink(path, label) {
  const stats = await lstatIfExists(path);
  if (stats?.isSymbolicLink()) throw new InstallUpdateError("SYMLINK_TARGET", `Refusing to mutate symlinked ${label}.`);
  return stats;
}

async function validateExistingCachePath({ path, label, realRoot, expectedRelative }) {
  const stats = await rejectExistingCacheSymlink(path, label);
  if (!stats) return { stats, realPath: undefined };

  const realPath = assertRealContained(await realpath(path), realRoot, label);
  if (expectedRelative !== undefined && relative(realRoot, realPath) !== expectedRelative) {
    throw new InstallUpdateError("UNSAFE_CACHE_TARGET", `Refusing to target anything other than ${expectedRelative}.`);
  }
  return { stats, realPath };
}

async function validateCacheTargetsForRefresh(cacheRoot) {
  const targets = resolveCacheTargets(cacheRoot);
  const rootStats = await rejectExistingCacheSymlink(targets.root, "OpenCode cache root");
  if (!rootStats) return { ...targets, rootStats, nodeModulesStats: undefined, packageStats: undefined, bunLockStats: undefined, bunLockbStats: undefined };

  const realRoot = await realpath(targets.root);
  const nodeModulesStats = await rejectExistingCacheSymlink(targets.nodeModulesPath, "OpenCode node_modules cache directory");
  let realNodeModules;
  if (nodeModulesStats) {
    realNodeModules = assertRealContained(await realpath(targets.nodeModulesPath), realRoot, "OpenCode node_modules cache directory");
    if (relative(realRoot, realNodeModules) !== "node_modules") {
      throw new InstallUpdateError("UNSAFE_CACHE_TARGET", "Refusing to target anything other than the OpenCode cache node_modules directory.");
    }
  }

  const packageTarget = await validateExistingCachePath({
    path: targets.packagePath,
    label: "OpenCode BROS package cache path",
    realRoot: realNodeModules ?? realRoot,
    expectedRelative: realNodeModules ? BROS_PACKAGE_NAME : undefined,
  });
  if (packageTarget.realPath && !realNodeModules) {
    throw new InstallUpdateError("UNSAFE_CACHE_TARGET", "Refusing to target BROS package cache without a valid real node_modules directory.");
  }

  const bunLockTarget = await validateExistingCachePath({ path: targets.bunLockPath, label: "OpenCode bun.lock path", realRoot, expectedRelative: "bun.lock" });
  const bunLockbTarget = await validateExistingCachePath({ path: targets.bunLockbPath, label: "OpenCode bun.lockb path", realRoot, expectedRelative: "bun.lockb" });

  return {
    ...targets,
    rootStats,
    nodeModulesStats,
    packageStats: packageTarget.stats,
    bunLockStats: bunLockTarget.stats,
    bunLockbStats: bunLockbTarget.stats,
  };
}

async function refreshOpenCodeCache({ cacheRoot, dryRun = false } = {}) {
  const targets = await validateCacheTargetsForRefresh(cacheRoot);
  const records = [];

  const packageStats = targets.packageStats;
  if (!packageStats) {
    records.push(makeCacheRecord({ type: "cache-package", path: targets.packagePath, action: "missing", changed: false, dryRun }));
  } else if (packageStats.isSymbolicLink()) {
    throw new InstallUpdateError("SYMLINK_TARGET", "Refusing to mutate symlink at OpenCode BROS package cache path.");
  } else {
    records.push(makeCacheRecord({ type: "cache-package", path: targets.packagePath, action: "delete", changed: true, dryRun, note: "scoped to node_modules/bros-harness" }));
    if (!dryRun) await rm(targets.packagePath, { recursive: true, force: true });
  }

  const bunLockStats = targets.bunLockStats;
  if (!bunLockStats) {
    records.push(makeCacheRecord({ type: "bun-lock", path: targets.bunLockPath, action: "missing", changed: false, dryRun }));
  } else if (bunLockStats.isSymbolicLink()) {
    throw new InstallUpdateError("SYMLINK_TARGET", "Refusing to mutate symlink at OpenCode bun.lock path.");
  } else {
    const lockText = await readFile(targets.bunLockPath, "utf8");
    const nextLock = removeBrosPackageFromBunLock(lockText);
    records.push(makeCacheRecord({
      type: "bun-lock",
      path: targets.bunLockPath,
      action: nextLock.changed ? "remove-bros-package-entry" : "unchanged",
      changed: nextLock.changed,
      dryRun,
      note: "dependency declarations are preserved",
    }));
    if (nextLock.changed && !dryRun) await writeFile(targets.bunLockPath, nextLock.text, "utf8");
  }

  const bunLockbStats = targets.bunLockbStats;
  if (!bunLockbStats) {
    records.push(makeCacheRecord({ type: "bun-lockb", path: targets.bunLockbPath, action: "missing", changed: false, dryRun }));
  } else if (bunLockbStats.isSymbolicLink()) {
    throw new InstallUpdateError("SYMLINK_TARGET", "Refusing to mutate symlink at OpenCode bun.lockb path.");
  } else {
    records.push(makeCacheRecord({ type: "bun-lockb", path: targets.bunLockbPath, action: "delete", changed: true, dryRun, note: "explicit refresh-cache only" }));
    if (!dryRun) await unlink(targets.bunLockbPath);
  }

  return records;
}

async function preflightOpenCodeCacheRefresh({ cacheRoot } = {}) {
  await validateCacheTargetsForRefresh(cacheRoot);
}

async function selectOpenCodeConfigPath(root) {
  const jsoncPath = join(root, OPENCODE_CONFIG_JSONC_FILE);
  if (await pathExists(jsoncPath)) return { path: jsoncPath, label: OPENCODE_CONFIG_JSONC_FILE };

  const jsonPath = join(root, OPENCODE_CONFIG_JSON_FILE);
  if (await pathExists(jsonPath)) return { path: jsonPath, label: OPENCODE_CONFIG_JSON_FILE };

  return { path: jsoncPath, label: OPENCODE_CONFIG_JSONC_FILE };
}

async function resolveTargets({ cwd = process.cwd(), scope = "project", configHome } = {}) {
  if (scope !== "project" && scope !== "global") {
    throw new InstallUpdateError("INVALID_SCOPE", "Scope must be project or global.");
  }

  if (scope === "project") {
    const root = resolve(cwd);
    const opencodeConfig = await selectOpenCodeConfigPath(root);
    return {
      scope,
      allowedRoot: root,
      opencodeConfigPath: opencodeConfig.path,
      opencodeConfigLabel: opencodeConfig.label,
      brosConfigPath: join(root, BROS_CONFIG_FILE),
    };
  }

  const homeConfigRoot = resolve(configHome ?? join(homedir(), ".config"));
  const opencodeRoot = join(homeConfigRoot, "opencode");
  const opencodeConfig = await selectOpenCodeConfigPath(opencodeRoot);
  return {
    scope,
    allowedRoot: opencodeRoot,
    opencodeConfigPath: opencodeConfig.path,
    opencodeConfigLabel: opencodeConfig.label,
    brosConfigPath: join(opencodeRoot, BROS_CONFIG_FILE),
  };
}

function makeSuccessOutput({ command, scope, dryRun, files, json, pluginSpec, channel, refreshCache, cacheRecords = [] }) {
  const changed = files.some((file) => file.changed);
  const cacheChanged = cacheRecords.some((record) => record.changed);
  const safeCacheRecords = cacheRecords.map((record) => ({ ...record, path: redact(record.path) }));
  const containsCacheDeletion = refreshCache === true && dryRun !== true && safeCacheRecords.some((record) => record.changed && (record.action === "delete" || record.action === "remove-bros-package-entry"));
  const safeFiles = files.map((file) => ({ ...file, path: redact(file.path), backup_path: file.backup_path ? redact(file.backup_path) : undefined }));
  const payload = {
    ok: true,
    command,
    scope,
    dry_run: dryRun === true,
    changed: changed || (refreshCache === true && cacheChanged),
    config_changed: changed,
    cache_changed: refreshCache === true ? cacheChanged : false,
    plugin_spec: pluginSpec,
    channel,
    refresh_cache: refreshCache === true,
    contains_cache_deletion: containsCacheDeletion,
    executes_package_manager: false,
    files: safeFiles,
    cache: safeCacheRecords,
    warnings: [
      "Restart OpenCode after config changes so plugin registration is reloaded.",
      refreshCache === true
        ? "Cache refresh was explicit and scoped to OpenCode node_modules/bros-harness plus BROS lock entries only. No package-manager commands were executed."
        : "This command does not install dependencies, execute package managers, delete caches, or collect provider credentials.",
    ],
  };

  if (json) return `${JSON.stringify(payload, null, 2)}\n`;

  const lines = [
    `BROS Harness ${command}: ${payload.changed ? "updated" : "already current"}`,
    `Scope: ${scope}`,
    `Dry run: ${dryRun ? "yes" : "no"}`,
    `Plugin spec: ${pluginSpec}`,
    "Files:",
    ...safeFiles.map((file) => `- ${file.action}: ${file.path}${file.backup_created ? " (backup created)" : ""}`),
    ...(refreshCache ? ["Cache refresh:", ...safeCacheRecords.map((record) => `- ${record.action}: ${record.path}`)] : []),
    refreshCache
      ? "No package-manager commands were executed. Cache refresh was scoped; no full cache or node_modules directory was deleted. No provider credentials were requested."
      : "No package-manager commands were executed. No cache folders were deleted. No provider credentials were requested.",
    "Restart OpenCode before verifying BROS agents.",
  ];
  return `${lines.join("\n")}\n`;
}

function makeErrorOutput({ command, scope, dryRun, error, json, refreshCache = false }) {
  const payload = {
    ok: false,
    command,
    scope,
    dry_run: dryRun === true,
    changed: false,
    refresh_cache: refreshCache === true,
    contains_cache_deletion: false,
    executes_package_manager: false,
    files: [],
    cache: [],
    error: {
      code: error?.code ?? "ERROR",
      message: redact(error instanceof Error ? error.message : String(error)),
    },
  };
  if (json) return `${JSON.stringify(payload, null, 2)}\n`;
  return `BROS Harness ${command}: failed\n${payload.error.message}\n`;
}

export async function runInstallUpdate({ command, cwd = process.cwd(), scope = "project", dryRun = false, json = false, configHome, channel = "version", refreshCache = false, cacheRoot } = {}) {
  try {
    if (command !== "install" && command !== "update") {
      throw new InstallUpdateError("INVALID_COMMAND", "Command must be install or update.");
    }
    const pluginSpec = resolvePluginSpec(channel);
    if (refreshCache) await preflightOpenCodeCacheRefresh({ cacheRoot });
    const targets = await resolveTargets({ cwd, scope, configHome });
    assertContained(targets.opencodeConfigPath, targets.allowedRoot);
    assertContained(targets.brosConfigPath, targets.allowedRoot);
    await rejectExistingSymlink(targets.opencodeConfigPath, targets.opencodeConfigLabel);
    await rejectExistingSymlink(targets.brosConfigPath, "bros.config.json");

    const openCodeRead = await readJsonFile(targets.opencodeConfigPath, "OpenCode config");
    const brosConfigRead = await readJsonFile(targets.brosConfigPath, "BROS config");
    const opencodeConfig = buildOpenCodeConfig(openCodeRead.value, { pluginSpec });
    const brosConfig = buildBrosConfig(brosConfigRead.value, "BROS config");

    const files = [];
    files.push(await writeJsonSafely({
      path: targets.opencodeConfigPath,
      label: targets.opencodeConfigLabel,
      allowedRoot: targets.allowedRoot,
      value: opencodeConfig,
      existed: openCodeRead.exists,
      dryRun,
    }));
    files.push(await writeJsonSafely({
      path: targets.brosConfigPath,
      label: "bros.config.json",
      allowedRoot: targets.allowedRoot,
      value: brosConfig,
      existed: brosConfigRead.exists,
      dryRun,
    }));

    const cacheRecords = refreshCache ? await refreshOpenCodeCache({ cacheRoot, dryRun }) : [];

    return {
      status: 0,
      output: makeSuccessOutput({ command, scope, dryRun, files, json, pluginSpec, channel, refreshCache, cacheRecords }),
      files,
      cacheRecords,
    };
  } catch (error) {
    return {
      status: 1,
      output: makeErrorOutput({ command, scope, dryRun, error, json, refreshCache }),
      files: [],
      error,
    };
  }
}

export function parseInstallUpdateArgs(argv = []) {
  const options = { dryRun: false, json: false, scope: "project", channel: "version", refreshCache: false };
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === "--dry-run") {
      options.dryRun = true;
    } else if (arg === "--json") {
      options.json = true;
    } else if (arg === "--refresh-cache") {
      options.refreshCache = true;
    } else if (arg === "--channel") {
      const value = argv[index + 1];
      if (value !== "version" && value !== "latest") throw new InstallUpdateError("INVALID_CHANNEL", "--channel must be version or latest.");
      options.channel = value;
      index += 1;
    } else if (arg.startsWith("--channel=")) {
      const value = arg.slice("--channel=".length);
      if (value !== "version" && value !== "latest") throw new InstallUpdateError("INVALID_CHANNEL", "--channel must be version or latest.");
      options.channel = value;
    } else if (arg === "--scope") {
      const value = argv[index + 1];
      if (value !== "project" && value !== "global") throw new InstallUpdateError("INVALID_SCOPE", "--scope must be project or global.");
      options.scope = value;
      index += 1;
    } else if (arg.startsWith("--scope=")) {
      const value = arg.slice("--scope=".length);
      if (value !== "project" && value !== "global") throw new InstallUpdateError("INVALID_SCOPE", "--scope must be project or global.");
      options.scope = value;
    } else {
      throw new InstallUpdateError("INVALID_OPTION", `Unsupported option for install/update: ${arg}`);
    }
  }
  return options;
}
