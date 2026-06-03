export const cliCommands = [
  "help",
  "doctor",
  "install-opencode",
  "list-assets"
] as const;

export type CliCommand = (typeof cliCommands)[number];

export function getHelpText(): string {
  return [
    "BROS Harness CLI",
    "",
    "Usage: bros <command>",
    "",
    "Commands:",
    "  help              Show available commands.",
    "  doctor            Future local validation checks.",
    "  install-opencode  Future OpenCode asset installation flow.",
    "  list-assets       Future manifest asset listing.",
    "",
    "Current scaffold is read-only and does not mutate local configuration."
  ].join("\n");
}
