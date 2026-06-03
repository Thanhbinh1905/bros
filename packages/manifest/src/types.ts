export interface AssetManifestEntry {
  readonly area: "agents" | "commands" | "skills" | "templates" | "docs";
  readonly path: string;
  readonly source: string;
}

export interface AssetManifest {
  readonly name: "bros-harness";
  readonly generatedAt: string;
  readonly entries: readonly AssetManifestEntry[];
}
