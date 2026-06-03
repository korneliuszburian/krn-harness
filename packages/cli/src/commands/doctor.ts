import { runDoctor } from "../../../doctor/src/index.js";
import { createTraceEvent, defaultTracePath, writeTraceEvent } from "../../../trace/src/index.js";
import type { CliRuntime } from "../runtime.js";

export async function doctorCommand(runtime: CliRuntime): Promise<number> {
  const result = await runDoctor();
  await writeTraceEvent(
    createTraceEvent("doctor.ran", {
      now: runtime.now?.(),
      data: {
        checks: result.checks.length,
      },
    }),
    runtime.tracePath ?? defaultTracePath(runtime.cwd),
  );

  runtime.stdout(`KRN doctor: ${result.checks[0]?.status ?? "pass"}
checks: ${result.checks.length}
`);

  return 0;
}
