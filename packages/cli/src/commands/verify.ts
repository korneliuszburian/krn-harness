import { createTraceEvent, defaultTracePath, writeTraceEvent } from "../../../trace/src/index.js";
import { runVerify } from "../../../verify/src/index.js";
import type { CliRuntime } from "../runtime.js";

export async function verifyCommand(runtime: CliRuntime): Promise<number> {
  const result = await runVerify();
  await writeTraceEvent(
    createTraceEvent("verify.ran", {
      now: runtime.now?.(),
      data: {
        profile: result.profile,
      },
    }),
    runtime.tracePath ?? defaultTracePath(runtime.cwd),
  );

  runtime.stdout(`KRN verify: ${result.checks[0]?.status ?? "pass"}
profile: ${result.profile}
`);

  return 0;
}
