import type { AssetManifest, AssetManifestEntry } from "./types";

const validAreas = ["agents", "commands", "skills", "templates", "docs"] as const;
const validAreaSet = new Set<string>(validAreas);
const pathPrefixes: Record<AssetManifestEntry["area"], string> = {
  agents: "assets/opencode/agents/",
  commands: "assets/opencode/commands/",
  skills: "assets/opencode/skills/",
  templates: "assets/opencode/templates/",
  docs: "assets/opencode/docs/"
};

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export function validateManifest(manifest: unknown): string[] {
  const errors: string[] = [];

  if (!isObject(manifest)) return ["manifest must be an object"];

  if (manifest.name !== "bros-harness") errors.push("manifest.name must be bros-harness");
  if (typeof manifest.generatedAt !== "string" || Number.isNaN(Date.parse(manifest.generatedAt))) {
    errors.push("manifest.generatedAt must be an ISO-compatible timestamp string");
  }
  if (typeof manifest.importPolicy !== "string" || manifest.importPolicy.trim() === "") {
    errors.push("manifest.importPolicy must be a non-empty string");
  }
  if (!isObject(manifest.counts)) errors.push("manifest.counts must be an object");
  if (!Array.isArray(manifest.entries)) {
    errors.push("manifest.entries must be an array");
    return errors;
  }

  const countsByArea = new Map<string, number>();
  const paths = new Set<string>();

  manifest.entries.forEach((entry, index) => {
    const label = `manifest.entries[${index}]`;
    if (!isObject(entry)) {
      errors.push(`${label} must be an object`);
      return;
    }

    if ("source" in entry) errors.push(`${label}.source is deprecated; use sourceRef`);
    if (typeof entry.sourceRef !== "string" || entry.sourceRef.trim() === "") {
      errors.push(`${label}.sourceRef must be a non-empty string`);
    }
    if (typeof entry.path !== "string" || entry.path.trim() === "") {
      errors.push(`${label}.path must be a non-empty string`);
    } else {
      if (entry.path.startsWith("/") || entry.path.includes("..")) {
        errors.push(`${label}.path must be a repository-relative asset path`);
      }
      if (paths.has(entry.path)) errors.push(`${label}.path duplicates another manifest entry`);
      paths.add(entry.path);
    }

    if (typeof entry.area !== "string" || !validAreaSet.has(entry.area)) {
      errors.push(`${label}.area must be one of ${validAreas.join(", ")}`);
      return;
    }

    countsByArea.set(entry.area, (countsByArea.get(entry.area) ?? 0) + 1);
    const expectedPrefix = pathPrefixes[entry.area as AssetManifestEntry["area"]];
    if (typeof entry.path === "string" && !entry.path.startsWith(expectedPrefix)) {
      errors.push(`${label}.path must start with ${expectedPrefix}`);
    }
  });

  if (isObject(manifest.counts)) {
    for (const area of validAreas) {
      const count = manifest.counts[area];
      if (!isObject(count)) {
        errors.push(`manifest.counts.${area} must be an object`);
        continue;
      }
      for (const field of ["candidates", "imported", "skipped"] as const) {
        if (!Number.isInteger(count[field]) || (count[field] as number) < 0) {
          errors.push(`manifest.counts.${area}.${field} must be a non-negative integer`);
        }
      }
      if (Number.isInteger(count.imported) && count.imported !== (countsByArea.get(area) ?? 0)) {
        errors.push(`manifest.counts.${area}.imported must equal entries for ${area}`);
      }
    }
  }

  return errors;
}
