# Stage 10 Raw Codex vs Codex+KRN Comparison

Status: completed as local comparison evidence.

## Comparison Packet

- comparisonId: `stage10-marketing-brief-template-metadata-20260618-204345`
- approvalRef: `operator-2026-06-18-stage10-raw-vs-krn-sibling-tasks`
- targetRepo: `korneliuszburian/marketing-intelligence-studio`
- baseCommit: `24197d255adaf8493887b2f6cb345990d1cc268d`
- rawBaselinePath: `/tmp/krn-20260618-stage10-204345/raw-codex`
- krnComparisonPath: `/tmp/krn-20260618-stage10-204345/krn-codex`
- taskClass: non-UI product-code/test-code, brief-template metadata hardening
- validationAuthority: target-owned
- rawValidationCommand:
  `python3 -m ruff format --check . && python3 -m ruff check . && python3 -m pytest -q tests/test_brief_templates.py`
- krnValidationCommand:
  `python3 tools/stage10_krn_quality_gate.py`
- validationCoverage: fast-quality-gate for the touched module/test family

## Pre-Registration

Both sibling tasks, expected touched files, forbidden touched files, validation
authority, outcome dimensions, and contamination risk were recorded in this
file before target edits.

Raw baseline task:

- add deterministic `template_content_type` metadata to briefs created from
  brief templates.
- expected touched files:
  - `src/marketing_intelligence/core/brief_templates.py`
  - `tests/test_brief_templates.py`
- no KRN task-spec, context package, review, report, bundle, memory, or `.krn`
  artifact pipeline.

Codex+KRN task:

- add deterministic `template_recommended_action` metadata to briefs created
  from brief templates.
- expected touched files:
  - `src/marketing_intelligence/core/brief_templates.py`
  - `tests/test_brief_templates.py`
  - `tools/stage10_krn_quality_gate.py`
  - `krn.config.json`
- task spec:
  `.krn/local/stage10-brief-template-recommended-action.task.json`
- The wrapper/config files are KRN adoption overhead required by the current
  verify policy. They are not counted as product-feature value and were not
  pushed to target main.

## Raw Baseline Result

- start: `2026-06-18T20:45:28Z`
- end: `2026-06-18T20:46:07Z`
- result: pass
- changed files:
  - `src/marketing_intelligence/core/brief_templates.py`
  - `tests/test_brief_templates.py`
- diff size: 2 files changed, 2 insertions
- validation:
  - `python3 -m ruff format --check .`: pass, `192 files already formatted`
  - `python3 -m ruff check .`: pass, `All checks passed!`
  - `python3 -m pytest -q tests/test_brief_templates.py`: pass, 5 tests
- retries: 0
- operator interventions after execution start: 0
- scope violations: 0
- protected-path incidents: 0
- false-done or overclaim events: 0
- KRN artifacts: none; `find . -path './.krn*'` returned no output
- forbidden-path check: no matches for `.env`, `.env.*`, `.local/`, `out/`,
  `materials/`, `data/evidence/`, `scripts/`, `docs/`, `.git/`, or `.krn/`

## Codex+KRN Result

- pre-context:
  - `krn start --task-spec .krn/local/stage10-brief-template-recommended-action.task.json`: pass
  - `krn graph`: pass, 419 nodes, 368 edges
  - `krn context`: pass, `stop: false`
- direct wrapper validation start: `2026-06-18T20:51:30Z`
- first wrapper validation result: fail on wrapper style, `I001 import block is un-sorted or un-formatted`
- correction: removed the extra blank lines in `tools/stage10_krn_quality_gate.py`
- direct wrapper validation retry start: `2026-06-18T20:52:03Z`
- direct wrapper validation retry end: `2026-06-18T20:52:09Z`
- direct wrapper validation result: pass
- final KRN run start: `2026-06-18T20:52:18Z`
- final KRN run end: `2026-06-18T20:52:26Z`
- run command:
  `krn run --task-spec .krn/local/stage10-brief-template-recommended-action.task.json --execute-verify --bundle`
- run status: `verified`
- coreStatus: `verified`
- verify: `pass` / `execute`
- verify profile: `stage10`
- configured command: `python3 tools/stage10_krn_quality_gate.py`
- executed command: `python3 tools/stage10_krn_quality_gate.py`
- executed command duration: 4026 ms
- run-result path:
  `/tmp/krn-20260618-stage10-204345/krn-codex/.krn/current/run-result.json`
- run-bundle manifest path:
  `/tmp/krn-20260618-stage10-204345/krn-codex/.krn/current/run-bundle/manifest.json`
- review-summary path:
  `/tmp/krn-20260618-stage10-204345/krn-codex/.krn/current/review-summary.json`
- changed product/test files:
  - `src/marketing_intelligence/core/brief_templates.py`
  - `tests/test_brief_templates.py`
- local KRN adoption files:
  - `krn.config.json`
  - `tools/stage10_krn_quality_gate.py`
  - `.krn/local/stage10-brief-template-recommended-action.task.json`
- validation:
  - `ruff format --check`: pass, `193 files already formatted`
  - `ruff check`: pass, `All checks passed!`
  - focused pytest: pass, 5 tests
- retries: 1 wrapper/style retry before final KRN run
- operator interventions after execution start: 0
- scope violations: 0
- protected-path incidents: 0
- false-done or overclaim events: 0
- forbidden-path check: no matches for `.env`, `.env.*`, `.local/`, `out/`,
  `materials/`, `data/evidence/`, `scripts/`, `docs/`, `.git/`
- memory reuse: none in the generated target context package; `memoryItems: 0`
- productionProof: `false`
- hookTrustStatus: `unproven`
- proof scope: config `verified-local`, productCode `verified-local`, fixture
  `not-indicated`

## Review And Caveats

KRN review status: `warn`, with no blockers.

Useful warnings:

- `target validation coverage is fast-quality-gate, not full-suite`
- `context over-inclusion risk is high`

Noisy or target-run-specific warnings:

- `missing artifact: .krn/dogfood/**/summary.json`
- `missing package.json scripts.verify:local`
- release-check failed as a non-blocking target run because it expects KRN
  source-repo release files and package scripts that this Python target does
  not own.

These warnings are evidence. They must not be hidden or upgraded into blockers
for this local comparison.

## Comparison Decision

meaningfulDelta: `true`

Narrow meaning: KRN added meaningful auditability and proof-discipline value for
this task class. It did not prove faster delivery, better code quality, broad
adoption, production readiness, hook trust, CI trust, memory outcome impact, or
market superiority.

Where KRN helped:

- Pre-registered target boundaries made no-push, no-merge, isolation,
  protected-data exclusion, expected files, forbidden paths, rollback, and
  approval reference explicit.
- Run-result separated `coreStatus`, verify status, production proof, hook
  trust, config proof scope, and product-code proof scope.
- Review surfaced the fast-quality-gate caveat and context over-inclusion risk.
- Bundle manifest created a compact artifact index for later review.
- Release-check noise exposed that target runs need target-aware release-check
  classification; the failure was non-blocking but useful friction evidence.

Where KRN hurt or added noise:

- Required local wrapper/config setup because current verify policy correctly
  rejects broad Python module commands and shell chains.
- Added one wrapper-style retry before final validation.
- Added `.krn` artifact overhead and review/release warnings that raw baseline
  did not produce.
- Did not improve code outcome in this tiny sibling task; both sides passed the
  same effective validation.

Where the result is inconclusive:

- Code quality/productivity delta is unclear from one tiny task.
- Memory outcome impact is unmeasured because no governed memory item appeared
  in the target context package.
- Context quality needs follow-up because review flagged over-inclusion risk.

## Contamination Risk

The same operator, target repo, module family, and sequential execution can
transfer learning from the raw baseline into the KRN comparison. Mitigation:
both sibling tasks, expected touched files, forbidden touched files, validation
authority, and outcome dimensions were pre-registered before target edits.

## Proof Boundary

This is local Stage 10 comparison evidence only. It is not production proof,
hook trust proof, CI proof, target-main approval, protected-data approval,
full-suite validation, memory outcome proof, or a general market/product
superiority claim.
