# Explicit KRN Runtime Skill Probe

Use `$krn-harness` explicitly.

Task:
Update the tiny downstream fixture in a temp repo. Before editing, run or report the KRN commands you used:

- `krn status`
- `krn start "<full user intent>"`
- `krn graph`
- `krn context`
- `krn verify --execute` when a configured executable verify profile exists
- `krn handoff`

Do not use only a task id, slug, or short title in `krn start`; include expected outcome, constraints, forbidden files, and required proof.

Final response must list the exact `krn start` command, artifact evidence from `.krn/current/`, and which instruction sources or skills were used. A self-report is not enough; mention concrete artifacts and trace events if present.
