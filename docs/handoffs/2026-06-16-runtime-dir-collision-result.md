# 2026-06-16 Runtime Dir Collision Result

## Summary

KRN now supports a configurable runtime directory for targets that already own
`.krn/`.

Default behavior remains `.krn`. A target may set:

```json
{
  "version": 1,
  "runtime": {
    "dir": ".krn-harness"
  }
}
```

## Behavior

- Default `.krn` artifact paths remain compatible.
- Custom `.krn-harness` writes current, graph, trace, memory, run, report,
  release-check, and run-bundle artifacts under `.krn-harness/`.
- `report` and `release-check` read the active runtime directory after a custom
  run.
- Unsafe runtime dirs are rejected by config validation.
- If the resolved runtime directory is tracked by git, write-producing commands
  block before writing artifacts.

## Boundaries

- No new CLI command.
- No bundle variant.
- No config inheritance.
- No runtime artifact migration.
- No environment override.
- No hook trust investigation or claim.
- No production proof claim.
- No protected data access.

## Proof

Focused tests cover default compatibility, custom `.krn-harness` behavior,
unsafe config values, tracked `.krn` collision, and tracked `.krn` bypass with
custom runtime dir.

## Real Target Proof

Target: `korneliuszburian/krn-ai-os`.

Isolated clone: `/tmp/krn-ai-os-runtime-dir-proof-20260617`.

Evidence:

- target HEAD: `d5391081c26154574b92a9dc0011c10d346e45c3`;
- tracked product-owned `.krn/` files:
  - `.krn/doc-registry.yaml`;
  - `.krn/manifest.yaml`;
  - `.krn/ownership.yaml`;
- local-only config used `runtime.dir: ".krn-harness"`;
- `krn config doctor --json`: pass;
- `krn run --task-spec .krn-harness/local/runtime-dir-collision-task.json --execute-verify --bundle`: verified;
- verify executed one command: `python3 tools/krn_check_pytest.py`;
- bundle manifest: `.krn-harness/current/run-bundle/manifest.json`;
- no `.krn/current/run-result.json` was created;
- tracked `.krn/` diff stayed empty;
- target status remained local-only untracked `.krn-harness/`, `krn.config.json`,
  and `tools/`;
- no target commit, push, PR, or merge was performed;
- `productionProof: false`;
- `hookTrustStatus: unproven`.
