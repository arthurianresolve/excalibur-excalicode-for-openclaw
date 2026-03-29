# OpenClaw Command Integration

This prototype is designed to be called from OpenClaw’s command system.

## Example mapping (conceptual)

Map a command to the `excalicode` CLI:

```bash
excalicode propose /path/to/spec.json
excalicode approve
excalicode apply --policy /path/to/execpolicy.json
excalicode status
```

## Notes
- Use `EXCALICODE_STATE_PATH` to bind state to an agent or workspace.
- For `apply`, set `EXCALICODE_POLICY_PATH` or pass `--policy` to enforce exec‑policy.
