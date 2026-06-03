import { renderDoctorResultMarkdown, runDoctor } from "../../../doctor/src/index.js";
import { createTraceEvent, defaultTracePath, writeTraceEvent } from "../../../trace/src/index.js";
import { writeCurrentJson, writeCurrentMarkdown } from "../current-state.js";
import type { CliRuntime } from "../runtime.js";

export async function doctorCommand(runtime: CliRuntime): Promise<number> {
  const result = await runDoctor(runtime.cwd);
  await writeCurrentJson(runtime.cwd, "doctor-result.json", result);
  await writeCurrentMarkdown(runtime.cwd, "doctor-result.md", renderDoctorResultMarkdown(result));

  await writeTraceEvent(
    createTraceEvent("doctor.ran", {
      now: runtime.now?.(),
      data: {
        status: result.status,
        checks: result.checks.length,
        warnings: result.checks.filter((check) => check.status === "warn").length,
        failures: result.checks.filter((check) => check.status === "fail").length,
      },
    }),
    runtime.tracePath ?? defaultTracePath(runtime.cwd),
  );

  runtime.stdout(`KRN doctor: ${result.status}
checks: ${result.checks.length}
result: .krn/current/doctor-result.md
`);

  return 0;
}
