# Explicit KRN Runtime Skill Probe

Use `$krn-harness` explicitly.

Use the pinned repo-local KRN command provided by the benchmark harness, such as `./krn`, `./.krn/bin/krn`, or an absolute temp `.../bin/krn` path. Do not fall back to global `krn`; if no pinned command is available, stop and report the run invalid.

Task:
Update the tiny downstream fixture in a temp repo. Before editing, run or report the KRN commands you used:

- `<pinned-krn> doctor cli`
- `<pinned-krn> status`
- `<pinned-krn> start "<full user intent>"`
- `<pinned-krn> graph`
- `<pinned-krn> context`
- `<pinned-krn> verify --execute` when a configured executable verify profile exists
- `<pinned-krn> handoff`

Do not use only a task id, slug, or short title in `krn start`; include expected outcome, constraints, forbidden files, and required proof.

Final response must list the exact pinned KRN command path, `doctor cli` identity output, exact `krn start` command, artifact evidence from `.krn/current/`, and which instruction sources or skills were used. A self-report is not enough; mention concrete artifacts and trace events if present.
