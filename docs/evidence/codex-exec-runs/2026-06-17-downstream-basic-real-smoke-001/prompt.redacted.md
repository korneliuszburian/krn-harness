Use the KRN Harness workflow from `.agents/skills/krn-harness/SKILL.md`.

Read `.agents/skills/krn-harness/references/workflow.md` because verification clarity and handoff quality matter.

Use `./.krn/bin/krn` unless a pinned KRN command path is provided.

Do not edit before:
1. running KRN status;
2. running KRN start with the full user intent;
3. running KRN graph/context;
4. reading `.krn/current/task-contract.md`;
5. reading `.krn/current/context-package.md`.

Respect STOP.
After edits, run the configured verify path and create handoff.

Task:
Update `docs/overview.md` with one concise sentence that tells future operators this fixture verifies with `node src/index.test.ts`. Do not edit source code, tests, config, hooks, runtime skill files, `.krn/bin/krn`, or protected data. Run the configured KRN verify path and create a handoff.
