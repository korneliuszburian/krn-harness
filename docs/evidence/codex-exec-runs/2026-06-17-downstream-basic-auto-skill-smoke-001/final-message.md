Updated [docs/overview.md](<tmp>:4) with the requested concise sentence:

`This fixture verifies with node src/index.test.ts.`

Verification completed through the pinned KRN workflow:

- Command: `./.krn/bin/krn verify --execute`
- Result: pass
- Profile: `unit`
- Executed: `node src/index.test.ts`
- `.krn/current/verify-result.json` status: `pass`
- Handoff: `.krn/current/handoff.md`

Production proof remains local-only, and hook trust remains unproven because no real non-bypass Codex `hook.received` evidence was produced.
