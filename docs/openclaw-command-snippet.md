# OpenClaw Command Registration (Snippet)

Add the following command mapping in your OpenClaw config (conceptual example):

```json
{
  "commands": {
    "excalicode": {
      "description": "OpenSpec-style workflow commands",
      "actions": {
        "propose": "excalicode propose",
        "approve": "excalicode approve",
        "apply": "excalicode apply --policy $EXCALICODE_POLICY_PATH",
        "status": "excalicode status"
      }
    }
  }
}
```

Notes:
- Bind `EXCALICODE_POLICY_PATH` and `EXCALICODE_STATE_PATH` in the OpenClaw runtime env.
- Keep `apply` behind exec‑policy (see `examples/policy.example.json`).
