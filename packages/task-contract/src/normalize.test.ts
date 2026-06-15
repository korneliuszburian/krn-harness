import { describe, expect, it } from "vitest";
import { buildTaskContract } from "./build-contract.js";
import { normalizeAcceptanceCriteria, normalizeProofRequirements } from "./normalize.js";

describe("task contract normalization", () => {
  it("normalizes default acceptance and proof strings into typed records", () => {
    const contract = buildTaskContract("Update source and tests with validation evidence.");

    expect(normalizeAcceptanceCriteria(contract)).toEqual([
      {
        id: "acceptance-1",
        text: "Scope is explicit",
        kind: "scope",
        required: true,
      },
      {
        id: "acceptance-2",
        text: "Relevant context is gathered",
        kind: "context",
        required: true,
      },
      {
        id: "acceptance-3",
        text: "Validation evidence is recorded",
        kind: "validation",
        required: true,
      },
    ]);
    expect(normalizeProofRequirements(contract)).toEqual([
      {
        id: "proof-1",
        text: "krn verify",
        kind: "verify",
        required: true,
      },
      {
        id: "proof-2",
        text: "krn handoff",
        kind: "handoff",
        required: true,
      },
    ]);
  });

  it("keeps existing contract fields while filtering empty normalized records", () => {
    const contract = {
      acceptance: ["  no-push boundary  ", "", "docs updated"],
      proof: ["  pnpm test  ", " ", "run-result bundle"],
    };

    expect(normalizeAcceptanceCriteria(contract)).toEqual([
      {
        id: "acceptance-1",
        text: "no-push boundary",
        kind: "scope",
        required: true,
      },
      {
        id: "acceptance-2",
        text: "docs updated",
        kind: "documentation",
        required: true,
      },
    ]);
    expect(normalizeProofRequirements(contract)).toEqual([
      {
        id: "proof-1",
        text: "pnpm test",
        kind: "verify",
        required: true,
      },
      {
        id: "proof-2",
        text: "run-result bundle",
        kind: "artifact",
        required: true,
      },
    ]);
  });
});
