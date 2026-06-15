import type {
  AcceptanceCriterionKind,
  NormalizedAcceptanceCriterion,
  NormalizedProofRequirement,
  ProofRequirementKind,
  TaskContract,
} from "./schema.js";

function normalizeText(value: string): string {
  return value.trim().replace(/\s+/g, " ");
}

function acceptanceKindFor(text: string): AcceptanceCriterionKind {
  const normalized = text.toLowerCase();
  if (/\b(scope|expected touched|forbidden|boundary)\b/.test(normalized)) return "scope";
  if (/\b(context|must-read|should-read|do-not-use)\b/.test(normalized)) return "context";
  if (/\b(validate|validation|verify|test|evidence|recorded)\b/.test(normalized)) {
    return "validation";
  }
  if (/\b(safe|safety|protected|secret|credential|no-push|rollback)\b/.test(normalized)) {
    return "safety";
  }
  if (/\b(doc|docs|documentation|handoff|readme)\b/.test(normalized)) return "documentation";
  return "unknown";
}

function proofKindFor(text: string): ProofRequirementKind {
  const normalized = text.toLowerCase();
  if (/\b(verify|test|lint|typecheck|validation)\b/.test(normalized)) return "verify";
  if (/\b(handoff|summary)\b/.test(normalized)) return "handoff";
  if (/\b(artifact|bundle|trace|context|task contract|run-result)\b/.test(normalized)) {
    return "artifact";
  }
  if (/\b(review|report|release-check)\b/.test(normalized)) return "review";
  if (/\b(command|shell|execute|pnpm|npm|node|python)\b/.test(normalized)) return "command";
  return "unknown";
}

export function normalizeAcceptanceCriteria(
  contract: Pick<TaskContract, "acceptance">,
): NormalizedAcceptanceCriterion[] {
  return contract.acceptance
    .map(normalizeText)
    .filter(Boolean)
    .map((text, index) => ({
      id: `acceptance-${index + 1}`,
      text,
      kind: acceptanceKindFor(text),
      required: true,
    }));
}

export function normalizeProofRequirements(
  contract: Pick<TaskContract, "proof">,
): NormalizedProofRequirement[] {
  return contract.proof
    .map(normalizeText)
    .filter(Boolean)
    .map((text, index) => ({
      id: `proof-${index + 1}`,
      text,
      kind: proofKindFor(text),
      required: true,
    }));
}
