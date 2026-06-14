export type RealRepoEvidenceKind =
  | "none"
  | "skipped"
  | "preflight-only"
  | "readiness-only"
  | "blocked"
  | "manual-codex-execution"
  | "automated-codex-execution"
  | "manual-no-codex-execution";

export type HookTrustStatus =
  | "unproven"
  | "manual-diagnostic-only"
  | "blocked"
  | "partially-proven";

export type ProductionProofStatus = "not-production-proof";

export type ProofSeverity = "pass" | "warn" | "blocked" | "fail";

export interface DogfoodProofInput {
  schema?: string | undefined;
  status?: string | undefined;
  outcomeKind?: string | undefined;
  executionKind?: string | undefined;
  validationStatus?: string | undefined;
  forbiddenTouchedFiles?: unknown[] | undefined;
  committedTargetRepo?: boolean | undefined;
  pushedTargetRepo?: boolean | undefined;
  hookTrustStatus?: string | undefined;
  productionProof?: boolean | undefined;
  path?: string | undefined;
}

export interface HookTrustInput {
  hookReceivedCount?: number | undefined;
  trustedHookCount?: number | undefined;
  diagnosticHookCount?: number | undefined;
  hookTrustStatus?: string | undefined;
}

export interface ProofClassification {
  kind: RealRepoEvidenceKind;
  severity: ProofSeverity;
  label: string;
  nextAction?: string | undefined;
  productionProof: false;
  productionProofStatus: ProductionProofStatus;
}

function hasForbiddenTouchedFiles(input: DogfoodProofInput): boolean {
  return Array.isArray(input.forbiddenTouchedFiles) && input.forbiddenTouchedFiles.length > 0;
}

function isExecutionResult(input: DogfoodProofInput): boolean {
  return (
    input.schema === "krn-real-repo-execution-result-v1" ||
    input.path?.includes("/real-repo-execution/") === true
  );
}

function executionKindToEvidenceKind(executionKind: string): RealRepoEvidenceKind {
  if (executionKind === "manual-codex") return "manual-codex-execution";
  if (executionKind === "automated-codex") return "automated-codex-execution";
  if (executionKind === "manual-no-codex") return "manual-no-codex-execution";
  if (executionKind === "skipped") return "skipped";
  if (executionKind === "blocked") return "blocked";
  return "blocked";
}

export function isProductionProofClaimAllowed(): false {
  return false;
}

export function classifyHookTrust(input: HookTrustInput): HookTrustStatus {
  if (input.hookTrustStatus === "partially-proven") return "partially-proven";
  if (input.hookTrustStatus === "manual-diagnostic-only") return "manual-diagnostic-only";
  if (input.hookTrustStatus === "blocked") return "blocked";

  const trustedHookCount = input.trustedHookCount ?? 0;
  const diagnosticHookCount = input.diagnosticHookCount ?? 0;
  const hookReceivedCount = input.hookReceivedCount ?? 0;

  if (trustedHookCount > 0) return "partially-proven";
  if (hookReceivedCount > 0 && diagnosticHookCount > 0) return "manual-diagnostic-only";
  return "unproven";
}

export function isHookTrustSufficient(status: HookTrustStatus | string | undefined): boolean {
  return status === "partially-proven";
}

export function classifyExecutionResult(input: DogfoodProofInput): ProofClassification {
  const executionKind = typeof input.executionKind === "string" ? input.executionKind : "blocked";
  const kind = executionKindToEvidenceKind(executionKind);
  const unsafe =
    hasForbiddenTouchedFiles(input) ||
    input.committedTargetRepo === true ||
    input.pushedTargetRepo === true ||
    input.productionProof === true;

  if (unsafe) {
    return {
      kind,
      severity: "fail",
      label: "unsafe execution evidence",
      nextAction: "Inspect the execution-result artifact and discard unsafe target changes.",
      productionProof: false,
      productionProofStatus: "not-production-proof",
    };
  }

  if (kind === "skipped") {
    return {
      kind,
      severity: "warn",
      label: "skipped execution evidence",
      nextAction: "Rerun the approved manual protocol when execution is allowed.",
      productionProof: false,
      productionProofStatus: "not-production-proof",
    };
  }

  if (kind === "blocked") {
    return {
      kind,
      severity: "blocked",
      label: "blocked execution evidence",
      nextAction: "Resolve execution blockers, then rerun the manual protocol.",
      productionProof: false,
      productionProofStatus: "not-production-proof",
    };
  }

  if (input.validationStatus === "pass") {
    return {
      kind,
      severity: kind === "manual-no-codex-execution" ? "warn" : "pass",
      label: "local execution evidence",
      nextAction: isHookTrustSufficient(input.hookTrustStatus)
        ? undefined
        : "Run a non-bypass Codex hook trust probe before claiming hook validation.",
      productionProof: false,
      productionProofStatus: "not-production-proof",
    };
  }

  return {
    kind,
    severity: "warn",
    label: "execution evidence without passing validation",
    nextAction: "Run or repair target validation before claiming execution evidence.",
    productionProof: false,
    productionProofStatus: "not-production-proof",
  };
}

export function classifyDogfoodSummary(input: DogfoodProofInput | undefined): ProofClassification {
  if (!input) {
    return {
      kind: "none",
      severity: "warn",
      label: "no real-repo evidence",
      nextAction: "Run real-repo dogfood on an approved non-protected repository.",
      productionProof: false,
      productionProofStatus: "not-production-proof",
    };
  }

  if (isExecutionResult(input)) {
    return classifyExecutionResult(input);
  }

  if (
    input.schema === "krn-real-repo-preflight-v1" ||
    input.path?.includes("/real-repo-preflight/")
  ) {
    return {
      kind: "preflight-only",
      severity: "warn",
      label: "preflight-only evidence",
      nextAction:
        "Run scripts/krn-real-repo-dogfood.sh with approved env to produce readiness or execution state.",
      productionProof: false,
      productionProofStatus: "not-production-proof",
    };
  }

  if (input.status === "readiness" || input.outcomeKind === "readiness-only") {
    return {
      kind: "readiness-only",
      severity: "warn",
      label: "readiness-only evidence",
      nextAction:
        "Review readiness-only real-repo dogfood report before approving paid/manual execution.",
      productionProof: false,
      productionProofStatus: "not-production-proof",
    };
  }

  if (input.status === "skipped") {
    return {
      kind: "skipped",
      severity: "warn",
      label: "skipped evidence",
      nextAction: "Rerun the approved protocol when required environment and approval are present.",
      productionProof: false,
      productionProofStatus: "not-production-proof",
    };
  }

  if (input.status === "blocked") {
    return {
      kind: "blocked",
      severity: "blocked",
      label: "blocked evidence",
      nextAction: "Resolve blockers before claiming real-repo evidence.",
      productionProof: false,
      productionProofStatus: "not-production-proof",
    };
  }

  return {
    kind: "none",
    severity: "warn",
    label: "unclassified local evidence",
    nextAction: "Review the local dogfood artifact before claiming execution proof.",
    productionProof: false,
    productionProofStatus: "not-production-proof",
  };
}

export function deriveReportVerdict(severities: ProofSeverity[]): ProofSeverity {
  if (severities.includes("fail")) return "fail";
  if (severities.includes("blocked")) return "blocked";
  if (severities.includes("warn")) return "warn";
  return "pass";
}

export function deriveProofLabel(classification: ProofClassification): string {
  return classification.label;
}

export function deriveProofNextAction(classification: ProofClassification): string | undefined {
  return classification.nextAction;
}

export function isExecutionEvidence(kind: RealRepoEvidenceKind): boolean {
  return (
    kind === "manual-codex-execution" ||
    kind === "automated-codex-execution" ||
    kind === "manual-no-codex-execution"
  );
}
