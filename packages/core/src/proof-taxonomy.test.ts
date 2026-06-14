import { describe, expect, it } from "vitest";
import {
  classifyDogfoodSummary,
  classifyExecutionResult,
  classifyHookTrust,
  deriveReportVerdict,
  isExecutionEvidence,
  isHookTrustSufficient,
  isProductionProofClaimAllowed,
} from "./proof-taxonomy.js";

describe("proof taxonomy", () => {
  it("classifies skipped dogfood as warning evidence", () => {
    expect(classifyDogfoodSummary({ status: "skipped" })).toMatchObject({
      kind: "skipped",
      severity: "warn",
      productionProof: false,
    });
  });

  it("classifies readiness-only dogfood as warning evidence", () => {
    expect(
      classifyDogfoodSummary({ schema: "krn-real-repo-dogfood-v1", outcomeKind: "readiness-only" }),
    ).toMatchObject({
      kind: "readiness-only",
      severity: "warn",
    });
  });

  it("classifies preflight-only dogfood as warning evidence", () => {
    expect(classifyDogfoodSummary({ schema: "krn-real-repo-preflight-v1" })).toMatchObject({
      kind: "preflight-only",
      severity: "warn",
    });
  });

  it("classifies blocked execution as blocked evidence", () => {
    expect(
      classifyExecutionResult({
        schema: "krn-real-repo-execution-result-v1",
        executionKind: "blocked",
        productionProof: false,
      }),
    ).toMatchObject({
      kind: "blocked",
      severity: "blocked",
    });
  });

  it("classifies passing manual Codex execution as local execution evidence", () => {
    const result = classifyExecutionResult({
      schema: "krn-real-repo-execution-result-v1",
      executionKind: "manual-codex",
      validationStatus: "pass",
      hookTrustStatus: "unproven",
      productionProof: false,
    });

    expect(result).toMatchObject({
      kind: "manual-codex-execution",
      severity: "pass",
      productionProof: false,
      productionProofStatus: "not-production-proof",
    });
    expect(isExecutionEvidence(result.kind)).toBe(true);
  });

  it("fails unsafe production-proof overclaims", () => {
    expect(
      classifyExecutionResult({
        schema: "krn-real-repo-execution-result-v1",
        executionKind: "manual-codex",
        validationStatus: "pass",
        productionProof: true,
      }),
    ).toMatchObject({
      severity: "fail",
      productionProof: false,
    });
    expect(isProductionProofClaimAllowed()).toBe(false);
  });

  it("separates manual hook diagnostics from scoped trusted hook markers", () => {
    expect(classifyHookTrust({ hookReceivedCount: 1, diagnosticHookCount: 1 })).toBe(
      "manual-diagnostic-only",
    );
    expect(classifyHookTrust({ hookReceivedCount: 1, trustedHookCount: 1 })).toBe(
      "partially-proven",
    );
    expect(isHookTrustSufficient("manual-diagnostic-only")).toBe(false);
    expect(isHookTrustSufficient("partially-proven")).toBe(true);
  });

  it("derives report verdict from strongest severity", () => {
    expect(deriveReportVerdict(["pass", "warn"])).toBe("warn");
    expect(deriveReportVerdict(["pass", "blocked", "warn"])).toBe("blocked");
    expect(deriveReportVerdict(["pass", "fail", "blocked"])).toBe("fail");
  });
});
