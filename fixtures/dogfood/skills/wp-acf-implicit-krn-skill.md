# Implicit KRN WordPress ACF Probe

Task:
You are in a downstream repository with KRN Harness installed. Make the selected synthetic WordPress/ACF fixture change, avoid stale docs and legacy ACF config, verify with the executable profile, and hand off when required.

Use the pinned repo-local KRN command provided by the benchmark harness, such as `./krn`, `./.krn/bin/krn`, or an absolute temp `.../bin/krn` path. Do not fall back to global `krn`; if no pinned command is available, stop and report the run invalid. Run `<pinned-krn> doctor cli` before relying on KRN.

Do not mention any skill name in the prompt. In the final response, report the exact pinned KRN command path, `doctor cli` identity output, which instruction sources or skills you actually used and cite concrete `.krn/current/` artifacts if they exist.
