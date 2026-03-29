# Excalicode for OpenClaw

Operational prototype for mapping OpenSpec-style commands into OpenClaw’s command system.

## What’s included
- **Evaluation** of whether mapping is the most effective approach (`docs/evaluation.md`).
- **Implementation plan** with phases and milestones (`docs/implementation-plan.md`).
- **Spec schema** for workflow tasks (`schemas/workflow-spec.json`).
- **CLI** commands for proposal/approval/apply/status (`bin/excalicode.js`).
- **State machine prototype** with durable JSON state (`src/state-machine.js`).
- **Exec‑policy integration** with glob scopes + conditions (`src/execpolicy.js`).
- **OpenClaw integration notes** (`docs/openclaw-integration.md`).
- **OpenClaw command snippet** (`docs/openclaw-command-snippet.md`).
- **OpenClaw config example** (`examples/openclaw-config.example.json`).

## Quickstart
```bash
pnpm install
node bin/excalicode.js propose examples/spec.example.json
node bin/excalicode.js approve
node bin/excalicode.js apply --policy examples/policy.example.json
node bin/excalicode.js status
```
