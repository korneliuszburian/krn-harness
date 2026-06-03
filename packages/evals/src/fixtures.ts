import { readFile } from "node:fs/promises";
import path from "node:path";

export interface EvalFixture {
  name: string;
  taskPath: string;
  repoPath: string;
}

export interface EvalFixtureExpected {
  stop?: boolean;
  mustRead?: string[];
  referenceOnly?: string[];
  doNotUse?: string[];
  missingContext?: string[];
}

export interface EvalTaskFixture {
  id: string;
  task: string;
  expected: EvalFixtureExpected;
}

export const harnessFixtures: EvalFixture[] = [
  {
    name: "frontend-section-context",
    taskPath: "fixtures/tasks/frontend-section-context.json",
    repoPath: "fixtures/repos/frontend-section-context",
  },
  {
    name: "stale-doc-trap",
    taskPath: "fixtures/tasks/stale-doc-trap.json",
    repoPath: "fixtures/repos/docs-heavy-stale",
  },
  {
    name: "missing-context-stop",
    taskPath: "fixtures/tasks/missing-context-stop.json",
    repoPath: "fixtures/repos/missing-context-stop",
  },
];

export async function loadEvalTaskFixture(
  fixture: EvalFixture,
  root = process.cwd(),
): Promise<EvalTaskFixture> {
  return JSON.parse(await readFile(path.join(root, fixture.taskPath), "utf8")) as EvalTaskFixture;
}
