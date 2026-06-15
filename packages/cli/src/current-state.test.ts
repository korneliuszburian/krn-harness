import { mkdir, mkdtemp, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { buildTaskContract } from "../../task-contract/src/index.js";
import { readCurrentTaskContract, writeCurrentJson } from "./current-state.js";

describe("current state", () => {
  it("validates current task contracts when reading JSON artifacts", async () => {
    const cwd = await mkdtemp(path.join(os.tmpdir(), "krn-current-state-"));
    const contract = buildTaskContract("Validate current task contract artifact");

    await writeCurrentJson(cwd, "task-contract.json", contract);

    await expect(readCurrentTaskContract(cwd)).resolves.toEqual(contract);
  });

  it("treats malformed current task contracts as missing", async () => {
    const cwd = await mkdtemp(path.join(os.tmpdir(), "krn-current-state-"));
    await mkdir(path.join(cwd, ".krn", "current"), { recursive: true });
    await writeFile(
      path.join(cwd, ".krn", "current", "task-contract.json"),
      `${JSON.stringify({ id: "task-bad", stop: false })}\n`,
      "utf8",
    );

    await expect(readCurrentTaskContract(cwd)).resolves.toBeUndefined();
  });
});
