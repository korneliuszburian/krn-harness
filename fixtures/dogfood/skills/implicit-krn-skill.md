# Implicit KRN Runtime Skill Probe

Task:
You are in a downstream repository with KRN Harness installed. Make a tiny scoped source/test change, avoid stale docs, verify the result, and hand off concisely.

Use the pinned repo-local KRN command provided by the benchmark harness, such as `./krn`, `./.krn/bin/krn`, or an absolute temp `.../bin/krn` path. Do not fall back to global `krn`; if no pinned command is available, stop and report the run invalid. Run `<pinned-krn> doctor cli` before relying on KRN.

Do not mention any skill name in the prompt. In the final response, report the exact pinned KRN command path, `doctor cli` identity output, which instruction sources or skills you actually used, and concrete `.krn/current/` artifacts if they exist.
