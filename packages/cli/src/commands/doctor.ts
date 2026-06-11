import { renderDoctorResultMarkdown, runDoctor } from "../../../doctor/src/index.js";
import { writeCurrentJson, writeCurrentMarkdown } from "../current-state.js";
import { emitCliTrace } from "../run-trace.js";
import type { CliRuntime } from "../runtime.js";

export async function doctorCommand(runtime: CliRuntime): Promise<number> {
  const result = await runDoctor(runtime.cwd);
  await writeCurrentJson(runtime.cwd, "doctor-result.json", result);
  await writeCurrentMarkdown(runtime.cwd, "doctor-result.md", renderDoctorResultMarkdown(result));

  await emitCliTrace(runtime, "doctor.ran", {
    runScoped: true,
    data: {
      status: result.status,
      checks: result.checks.length,
      warnings: result.checks.filter((check) => check.status === "warn").length,
      failures: result.checks.filter((check) => check.status === "fail").length,
    },
  });

  runtime.stdout(`KRN doctor: ${result.status}
checks: ${result.checks.length}
result: .krn/current/doctor-result.md
`);

  return 0;
}
