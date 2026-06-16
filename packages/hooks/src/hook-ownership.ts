import { isBroadProofPathHint, normalizeHookPath, uniqueSortedPaths } from "./hook-payload.js";
import {
  type HookCurrentState,
  type HookGuardrailFinding,
  maxOwnedProofPathHints,
} from "./hook-types.js";

interface ProofPathOwnershipRule {
  anyTerms?: string[] | undefined;
  allTerms?: string[] | undefined;
  hints: string[];
}

const p0ProofPathOwnershipRules: ProofPathOwnershipRule[] = [
  {
    anyTerms: ["adapter", "onboarding", "install"],
    hints: ["docs/specs/onboarding.md", "docs/specs/runtime-skill-adapter.md"],
  },
  {
    anyTerms: ["config", "configuration"],
    hints: ["docs/specs/krn-config.schema.md"],
  },
  {
    anyTerms: ["biome", "formatter", "formatting", "lint", "linter"],
    hints: ["biome.json"],
  },
  {
    anyTerms: ["typescript", "tsconfig", "typecheck"],
    hints: ["tsconfig.json"],
  },
  {
    anyTerms: ["vitest", "test runner"],
    hints: ["vitest.config.ts"],
  },
  {
    anyTerms: ["package", "pnpm", "workspace", "dependency", "dependencies", "scripts"],
    hints: ["package.json", "pnpm-workspace.yaml"],
  },
  {
    anyTerms: ["ci", "workflow", "workflows", "github action", "github actions"],
    hints: [".github/workflows/verify.yml"],
  },
  {
    anyTerms: ["context", "ranking"],
    hints: ["docs/specs/context-package.schema.md"],
  },
  {
    anyTerms: ["doctor", "health"],
    hints: ["docs/specs/doctor-result.schema.md"],
  },
  {
    anyTerms: ["eval", "evals", "grader", "graders", "matrix"],
    hints: ["docs/specs/eval-result.schema.md", "fixtures/hooks"],
  },
  {
    anyTerms: ["graph"],
    hints: ["docs/specs/graph-lite.md"],
  },
  {
    anyTerms: ["hook", "hooks", "guardrail", "guardrails", "codex"],
    hints: ["docs/specs/hooks-pack.md", "fixtures/hooks"],
  },
  {
    anyTerms: ["memory"],
    hints: ["docs/specs/memory.schema.md"],
  },
  {
    allTerms: ["task", "contract"],
    hints: ["docs/specs/task-contract.schema.md"],
  },
  {
    anyTerms: ["trace", "traces", "finding", "findings"],
    hints: ["docs/specs/trace.schema.md"],
  },
  {
    anyTerms: ["verify", "verification"],
    hints: ["docs/specs/verify-result.schema.md"],
  },
  {
    anyTerms: ["handoff"],
    hints: ["docs/specs/handoff.md"],
  },
];

function packageProofHintForPath(filePath: string): string | undefined {
  const match = /^packages\/([^/]+)\//.exec(normalizeHookPath(filePath));
  return match?.[1] ? `packages/${match[1]}` : undefined;
}

function ownershipSignalText(state: HookCurrentState): string {
  return [
    state.taskText,
    ...(state.writablePaths ?? []),
    ...(state.doNotUsePaths ?? []),
    ...(state.missingContextPaths ?? []),
    ...(state.ownedProofPaths ?? []),
  ]
    .filter((value): value is string => typeof value === "string" && value.length > 0)
    .join(" ")
    .toLowerCase();
}

function signalMatches(text: string, terms: string[]): boolean {
  return terms.some((term) => new RegExp(`(^|[^a-z0-9])${term}([^a-z0-9]|$)`, "u").test(text));
}

function ownershipRuleMatches(text: string, rule: ProofPathOwnershipRule): boolean {
  if (rule.allTerms?.every((term) => signalMatches(text, [term]))) {
    return true;
  }

  return rule.anyTerms ? signalMatches(text, rule.anyTerms) : false;
}

export function ownedProofPathHintsForState(state: HookCurrentState): string[] {
  const signalText = ownershipSignalText(state);
  const hints = [
    ...(state.ownedProofPaths ?? []),
    ...(state.writablePaths ?? []).flatMap((item) => packageProofHintForPath(item) ?? []),
  ];

  for (const rule of p0ProofPathOwnershipRules) {
    if (ownershipRuleMatches(signalText, rule)) {
      hints.push(...rule.hints);
    }
  }

  return uniqueSortedPaths(hints).filter((hint) => !isBroadProofPathHint(hint));
}

export function compactOwnedProofPathHints(findings: HookGuardrailFinding[]): string[] {
  return uniqueSortedPaths(
    findings
      .filter((finding) => finding.code === "proof-path-exception")
      .map((finding) => finding.ownershipHint)
      .filter((hint): hint is string => typeof hint === "string"),
  ).slice(0, maxOwnedProofPathHints);
}
