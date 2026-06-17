Done.

- Changed file: [<tmp>](<tmp>)
  - Added one concise sentence: fixture verification runs with `node src/index.test.ts`.
- Guardrails respected:
  - Read required docs and context before edit.
  - `STOP: false` in contract/context; no protected/edit-restricted files were touched.
- Verification:
  - Ran: [./.krn/bin/krn verify --execute](<tmp>)
  - Result: `pass`, profile `unit`, output at [<tmp>](<tmp>)
- Handoff:
  - Ran: [./.krn/bin/krn handoff](<tmp>)
  - Path: [<tmp>](<tmp>)
- Production-proof status: `false` (not externally proven here).
- Hook trust status: `unproven` (no real non-bypass `hook.received` signal emitted).
