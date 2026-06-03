import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { buildContextPackage, renderContextPackageMarkdown } from "../../../context/src/index.js";
import type { TaskContract } from "../../../task-contract/src/index.js";
import { createTraceEvent, defaultTracePath, writeTraceEvent } from "../../../trace/src/index.js";
import type { CliRuntime } from "../runtime.js";

async function readCurrentContract(cwd: string): Promise<TaskContract | undefined> {
  try {
    const raw = await readFile(path.join(cwd, ".krn", "current", "task-contract.json"), "utf8");
    return JSON.parse(raw) as TaskContract;
  } catch {
    return undefined;
  }
}

export async function contextCommand(runtime: CliRuntime): Promise<number> {
  const contract = await readCurrentContract(runtime.cwd);
  const pkg = buildContextPackage(contract);
  const currentDir = path.join(runtime.cwd, ".krn", "current");
  await mkdir(currentDir, { recursive: true });
  await writeFile(
    path.join(currentDir, "context-package.md"),
    renderContextPackageMarkdown(pkg),
    "utf8",
  );
  await writeFile(
    path.join(currentDir, "context-package.json"),
    `${JSON.stringify(pkg, null, 2)}\n`,
    "utf8",
  );

  await writeTraceEvent(
    createTraceEvent("context.built", {
      taskId: pkg.taskId,
      now: runtime.now?.(),
      data: {
        stop: pkg.stop,
      },
    }),
    runtime.tracePath ?? defaultTracePath(runtime.cwd),
  );

  runtime.stdout(`KRN context: package written
context: .krn/current/context-package.md
stop: ${pkg.stop ? "true" : "false"}
`);

  return 0;
}
