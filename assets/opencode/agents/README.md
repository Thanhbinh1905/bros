# Agents

Curated sanitized OpenCode agent assets imported from the approved local agent directory. Additional role agents should be reviewed and imported in follow-up security/QA passes before publication.

Executor agents that allow or ask-gate feature-branch Git mutations require an explicit Git Approval Packet in the active task context. Remote push and PR creation commands remain ask-gated even when the packet approves them; protected-branch pushes, force pushes, tag/refspec pushes, auth/credential commands, and release/publish commands remain denied.
