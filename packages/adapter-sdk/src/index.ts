export type AdapterTarget = "opencode" | "claude" | "codex" | "ide";

export interface HarnessAdapter {
  readonly target: AdapterTarget;
  readonly status: "supported" | "roadmap";
  describe(): string;
}

export const opencodeAdapter: HarnessAdapter = {
  target: "opencode",
  status: "supported",
  describe: () => "OpenCode-first BROS Harness asset integration."
};
