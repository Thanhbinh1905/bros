import type { AssetManifest } from "./types";

export function validateManifest(manifest: AssetManifest): string[] {
  const errors: string[] = [];
  if (manifest.name !== "bros-harness") errors.push("manifest.name must be bros-harness");
  if (!Array.isArray(manifest.entries)) errors.push("manifest.entries must be an array");
  return errors;
}
