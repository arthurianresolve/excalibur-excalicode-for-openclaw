# Implementation Plan

## Phase 1 — Command mapping + state machine
- Implement `propose`, `approve`, `apply`, `status` commands.
- Store state in JSON (local file) for durability.
- Validate workflow spec using JSON Schema.

## Phase 2 — OpenClaw command integration
- Add a command plugin in OpenClaw that shells out to `excalicode`.
- Map OpenClaw command inputs to spec schema.

## Phase 3 — Policy + audit
- Require exec-policy for `apply` actions.
- Emit audit entries for transitions.

## Phase 4 — Hardening
- Add concurrency control (lock file).
- Add tests for state transitions and schema validation.
