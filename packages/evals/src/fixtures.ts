export interface EvalFixture {
  name: string;
  taskPath: string;
  repoPath: string;
}

export const harnessFixtures: EvalFixture[] = [
  {
    name: "missing-context-stop",
    taskPath: "fixtures/tasks/missing-context-stop.json",
    repoPath: "fixtures/repos/missing-context-stop",
  },
];
