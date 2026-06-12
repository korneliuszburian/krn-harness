# Explicit KRN WordPress ACF Probe

Use `$krn-harness` explicitly.

Task:
Update the synthetic WordPress/ACF theme fixture according to the selected `fixtures/dogfood/tasks/wp-*.json` task.

Before editing, run or report the KRN commands you used:

- `krn status`
- `krn start "<task>"`
- `krn graph`
- `krn context`
- `krn verify --execute`
- `krn handoff` when the task requires handoff

Final response must list touched files, forbidden files avoided, `.krn/current/` artifacts, verify status/mode, handoff status, and whether `hook.received` appeared in trace. Self-report is not enough.
