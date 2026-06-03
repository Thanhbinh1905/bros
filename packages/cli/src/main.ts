export const cliCommands = [
  "help",
  "snippet",
  "doctor",
  "status",
  "list-assets",
  "agent-install-prompt"
] as const;

export type CliCommand = (typeof cliCommands)[number];

export function getHelpText(): string {
  return [
    "BROS Harness CLI",
    "",
    "Usage: bros <command>",
    "",
    "Commands:",
    "  help                    Show available BROS Harness commands.",
    "  snippet                 Print OpenCode installer commands and resulting plugin entry.",
    "  doctor                  Validate package asset directories and manifest shape without mutation.",
    "  status                  Print local package status without reading configs, env, or credentials.",
    "  list-assets             Summarize packaged OpenCode agent, command, skill, doc, and template counts.",
    "  agent-install-prompt    Print a safe prompt an AI agent can follow to install the plugin.",
    "",
    "All commands are read-only. This CLI does not edit live OpenCode config."
  ].join("\n");
}
