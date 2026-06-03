export interface AssetManifestEntry {
  readonly area: "agents" | "commands" | "skills" | "templates" | "docs";
  readonly path: string;
  /**
   * Canonical sanitized source category for the packaged asset.
   *
   * The legacy `source` alias is intentionally not part of the contract. Runtime
   * and validation code should reject manifests that use `source` instead of
   * `sourceRef` so private/local source details cannot drift back into package
   * metadata.
   */
  readonly sourceRef: string;
}

export interface AssetManifest {
  readonly name: "bros-harness";
  readonly generatedAt: string;
  readonly importPolicy: string;
  readonly counts: Readonly<Record<AssetManifestEntry["area"], AssetManifestAreaCounts>>;
  readonly entries: readonly AssetManifestEntry[];
}

export interface AssetManifestAreaCounts {
  readonly candidates: number;
  readonly imported: number;
  readonly skipped: number;
}
