Done. Updated only:

- [`<tmp>`](<tmp>): appended one concise sentence: the fixture verifies with ``node src/index.test.ts``.

KRN workflow executed in order and observed STOP = false throughout:

- `./.krn/bin/krn status` -> `ready`
- `./.krn/bin/krn start "<full user intent>"` -> task accepted
- `./.krn/bin/krn graph`
- `./.krn/bin/krn context`
- Read: `<tmp>`, `<tmp>`
- `./.krn/bin/krn verify --execute` -> `pass` (profile: `unit`, mode: `execute`)
- `./.krn/bin/krn handoff` -> handoff ready

- Verification command and result: `./.krn/bin/krn verify --execute`, result file at `.krn/current/verify-result.md`
- Handoff: `.krn/current/handoff.md`
- Production-proof status: `false` (no external production proof run requested)
- Hook-trust status: unproven (no `hook.received` output observed)
