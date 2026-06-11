import { describeFixture } from "./index.ts";

if (describeFixture() !== "fixture:downstream-basic") {
  throw new Error("unexpected fixture description");
}
