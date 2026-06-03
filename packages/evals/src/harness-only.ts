import { harnessFixtures } from "./fixtures.js";

export function listHarnessOnlyFixtures(): string[] {
  return harnessFixtures.map((fixture) => fixture.name);
}
