# Explicit KRN WordPress ACF Probe

Use `$krn-harness` explicitly.

Use the pinned repo-local KRN command provided by the benchmark harness, such as `./krn`, `./.krn/bin/krn`, or an absolute temp `.../bin/krn` path. Do not fall back to global `krn`; if no pinned command is available, stop and report the run invalid.

Task:
Update the synthetic WordPress/ACF theme fixture according to the selected `fixtures/dogfood/tasks/wp-*.json` task.

Before editing, run or report the KRN commands you used:

Run `<pinned-krn> graph` before `<pinned-krn> context`.

- `<pinned-krn> doctor cli`
- `<pinned-krn> status`
- `<pinned-krn> start "<full user intent>"`
- `<pinned-krn> graph`
- `<pinned-krn> context`
- `<pinned-krn> verify --execute`
- `<pinned-krn> handoff` when the task requires handoff

Do not use only the selected task id or slug in `krn start`. Include the task prompt, expected files, forbidden files, do-not-use evidence, and verification requirement.
If the selected task JSON is present locally, prefer `krn start --task-spec <json>` because it loads the full prompt and required do-not-use metadata.

Final response must list the exact pinned KRN command path, `doctor cli` identity output, exact `krn start` command used, touched files, forbidden files avoided, `.krn/current/` artifacts, verify status/mode, handoff status, and whether `hook.received` appeared in trace. Self-report is not enough.
