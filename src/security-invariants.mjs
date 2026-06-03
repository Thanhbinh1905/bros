const forbiddenConfigKeys = new Set([
  "provider",
  "mcp",
  "telemetry",
  "permission",
  "auth",
  "enabled_providers",
  "disabled_providers",
]);

const forbiddenFrontmatterKeys = new Set([
  "provider",
  "mcp",
  "telemetry",
  "auth",
  "enabled_providers",
  "disabled_providers",
]);

const sensitiveKeyPattern = /(?:api[_-]?key|authorization|bearer|token|secret|password|credential|private[_-]?key|_auth)/i;
const secretValuePatterns = [
  /api[_-]?key\s*[:=]\s*['"][^'"]{8,}/i,
  /authorization\s*[:=]\s*['"]?bearer\s+[a-z0-9._-]{8,}/i,
  /-----BEGIN (?:RSA |OPENSSH |EC |DSA )?PRIVATE KEY-----/,
  /(?:token|secret|password)\s*[:=]\s*['"][^'"]{8,}/i,
  /sk-[A-Za-z0-9]{20,}/,
];

const injectionGuardPatterns = [
  /do not override higher-priority instructions/i,
  /treat(?:ed)?\b.*\bas untrusted/i,
  /trusted\/untrusted|trusted and untrusted|untrusted context/i,
];

const reportOnlyMutatingAllowedBashPatterns = [
  /^gofmt\b|^gofmt\*/,
  /^dotnet\s+format\b|^dotnet\s+format\*/,
  /^dart\s+format\b|^dart\s+format\*/,
  /^git\s+(?:add|commit|checkout|switch|merge|rebase|stash|cherry-pick|revert|restore|reset|clean|tag|push)\b/,
  /^mkdir\b|^mkdir\*/,
  /^touch\b|^touch\*/,
  /^rm\b|^rm\*/,
  /^cp\b|^cp\*/,
  /^mv\b|^mv\*/,
  /^chmod\b|^chmod\*/,
  /^chown\b|^chown\*/,
];

const buildMutatingBashPatternsRequiringAsk = [
  /^git\s+checkout\s+-b\b/,
  /^git\s+switch\s+(?:-c|--create)\b/,
  /^git\s+add\b/,
  /^git\s+commit\b/,
  /^mkdir\b|^mkdir\*/,
  /^touch\b|^touch\*/,
];

const gitMutationAllowedBashPatternsRequiringAsk = [
  /^git\s+(?:add|commit|checkout|switch|merge|rebase|stash|cherry-pick|revert|restore|reset|clean|tag|push)\b/,
];

const gitMutationAllowExemptAgentNames = new Set([]);

function stableStringify(value) {
  if (value === undefined) return "__BROS_UNDEFINED__";
  if (value === null || typeof value !== "object") return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map((item) => stableStringify(item)).join(",")}]`;
  return `{${Object.keys(value).sort().map((key) => `${JSON.stringify(key)}:${stableStringify(value[key])}`).join(",")}}`;
}

function isPermissionRuleKey(path, value) {
  const parent = path.at(-1);
  const grandparent = path.at(-2);
  return grandparent === "permission"
    && ["bash", "external_directory"].includes(parent)
    && ["deny", "ask"].includes(value);
}

function hasSecretLikeValue(value, path = []) {
  if (typeof value === "string") return secretValuePatterns.some((pattern) => pattern.test(value));
  if (Array.isArray(value)) return value.some((item, index) => hasSecretLikeValue(item, [...path, String(index)]));
  if (value && typeof value === "object") {
    return Object.entries(value).some(([key, child]) => {
      const childPath = [...path, key];
      const secretLikeKey = sensitiveKeyPattern.test(key) && !isPermissionRuleKey(path, child);
      return secretLikeKey || hasSecretLikeValue(child, childPath);
    });
  }
  return false;
}

export function snapshotForbiddenConfig(cfg) {
  const snapshot = {};
  for (const key of forbiddenConfigKeys) snapshot[key] = stableStringify(cfg?.[key]);
  return snapshot;
}

export function assertNoForbiddenConfigMutation(before, cfg) {
  const after = snapshotForbiddenConfig(cfg);
  const changed = Object.keys(after).filter((key) => before[key] !== after[key]);
  if (changed.length > 0) {
    throw new Error(`BROS security invariant violation: plugin config hook changed forbidden config keys: ${changed.join(", ")}`);
  }
  if (hasSecretLikeValue(cfg?.agent) || hasSecretLikeValue(cfg?.command) || hasSecretLikeValue(cfg?.skills)) {
    throw new Error("BROS security invariant violation: plugin merge produced secret-like agent, command, or skills configuration");
  }
}

export function validateAgentAsset({ path, frontmatter, prompt }) {
  const errors = [];
  for (const key of Object.keys(frontmatter ?? {})) {
    if (forbiddenFrontmatterKeys.has(key)) errors.push(`${path}: forbidden frontmatter key ${key}`);
    if (sensitiveKeyPattern.test(key)) errors.push(`${path}: secret-like frontmatter key ${key}`);
  }

  const permission = frontmatter?.permission;
  if (permission === "allow") errors.push(`${path}: top-level permission must not be broad allow`);
  if (permission?.bash === "allow") errors.push(`${path}: bash permission must not be broad allow`);
  if (permission?.bash && typeof permission.bash === "object" && permission.bash["*"] === "allow") {
    errors.push(`${path}: bash wildcard must not be allow`);
  }
  if (permission?.external_directory === "allow") errors.push(`${path}: external_directory must not be broad allow`);
  if (permission?.external_directory && typeof permission.external_directory === "object" && permission.external_directory["*"] === "allow") {
    errors.push(`${path}: external_directory wildcard must not be allow`);
  }

  if (permission?.bash && typeof permission.bash === "object") {
    const combined = `${stableStringify(frontmatter)}\n${prompt ?? ""}`;
    const reportOnly = /\breport-only\b/i.test(combined);
    for (const [commandPattern, action] of Object.entries(permission.bash)) {
      if (action !== "allow") continue;
      if (reportOnly && reportOnlyMutatingAllowedBashPatterns.some((pattern) => pattern.test(commandPattern))) {
        errors.push(`${path}: report-only agent must not allow mutating bash command ${commandPattern}`);
      }
      if (!gitMutationAllowExemptAgentNames.has(frontmatter?.name)
        && gitMutationAllowedBashPatternsRequiringAsk.some((pattern) => pattern.test(commandPattern))) {
        errors.push(`${path}: git mutation bash command must be ask-gated, not allow: ${commandPattern}`);
      }
      if (frontmatter?.name === "bro-build" && buildMutatingBashPatternsRequiringAsk.some((pattern) => pattern.test(commandPattern))) {
        errors.push(`${path}: bro-build mutating bash command must be ask-gated, not allow: ${commandPattern}`);
      }
    }
  }

  const combined = `${stableStringify(frontmatter)}\n${prompt ?? ""}`;
  if (secretValuePatterns.some((pattern) => pattern.test(combined))) errors.push(`${path}: secret-like value detected`);
  if (!injectionGuardPatterns.some((pattern) => pattern.test(prompt ?? ""))) {
    errors.push(`${path}: missing prompt-injection/trusted-untrusted guardrail language`);
  }
  return errors;
}

export function validateCommandAsset({ path, markdown }) {
  const errors = [];
  if (secretValuePatterns.some((pattern) => pattern.test(markdown ?? ""))) errors.push(`${path}: secret-like value detected`);
  if (!injectionGuardPatterns.some((pattern) => pattern.test(markdown ?? ""))) {
    errors.push(`${path}: missing prompt-injection/trusted-untrusted guardrail language`);
  }
  if (/^\s*bash\s*:\s*allow\s*$/im.test(markdown ?? "")) errors.push(`${path}: broad bash allow text is not permitted`);
  if (/^\s*permission\s*:\s*allow\s*$/im.test(markdown ?? "")) errors.push(`${path}: broad permission allow text is not permitted`);
  return errors;
}

export function assertNoPackagedAssetInvariantErrors(errors) {
  if (errors.length > 0) {
    throw new Error(`BROS packaged asset security invariant validation failed:\n- ${errors.join("\n- ")}`);
  }
}
