import type { OperatorSummaryStatus } from "./operator-summary.js";

export function summarizeOperatorSummaryProblems(
  signals: Array<{
    label: string;
    status: OperatorSummaryStatus;
    summary: string;
    nextAction?: string | undefined;
  }>,
): { risks: string[]; blockers: string[]; warnings: string[]; nextActions: string[] } {
  const blockers: string[] = [];
  const warnings: string[] = [];
  const risks: string[] = [];
  const nextActions: string[] = [];

  for (const signal of signals) {
    if (signal.status === "blocked" || signal.status === "fail") {
      blockers.push(`${signal.label}: ${signal.summary}`);
    }

    if (
      signal.status === "warn" ||
      signal.status === "missing" ||
      signal.status === "skipped" ||
      signal.status === "readiness" ||
      signal.status === "unproven" ||
      signal.status === "manual-diagnostic-only" ||
      signal.status === "partially-proven"
    ) {
      warnings.push(`${signal.label}: ${signal.summary}`);
    }
  }

  const hasWarningOrBlocker = (label: string) =>
    warnings.some((warning) => warning.startsWith(`${label}:`)) ||
    blockers.some((blocker) => blocker.startsWith(`${label}:`));
  const reviewers = signals.find((signal) => signal.label === "reviewers");
  const realRepoDogfood = signals.find((signal) => signal.label === "realRepoDogfood");

  if (hasWarningOrBlocker("hooks")) {
    risks.push(
      "Hooks are not validated until trusted non-bypass hook provenance appears in trace.",
    );
    const hooks = signals.find((signal) => signal.label === "hooks");
    if (hooks?.status !== "partially-proven") {
      nextActions.push("Run a non-bypass Codex hook trust probe before claiming hook validation.");
    }
  }

  if (hasWarningOrBlocker("realRepoDogfood")) {
    risks.push("Real user-repo behavior remains unproven until approved dogfood executes.");
    nextActions.push(
      realRepoDogfood?.nextAction ??
        "Run real-repo dogfood on an approved non-protected repository.",
    );
  }

  if (realRepoDogfood?.status === "execution-evidence") {
    risks.push(
      "Real-repo execution evidence is local evidence only; production proof remains false.",
    );
    if (realRepoDogfood.nextAction) {
      nextActions.push(realRepoDogfood.nextAction);
    }
  }

  if (reviewers?.status === "missing") {
    nextActions.push("Run `krn review --write` before final handoff.");
  } else if (reviewers && reviewers.status !== "pass") {
    nextActions.push("Resolve reviewer warnings or blockers before final completion.");
  }

  if (hasWarningOrBlocker("verify")) {
    nextActions.push("Run `krn verify --execute` when safe verify commands are configured.");
  }

  if (hasWarningOrBlocker("context")) {
    nextActions.push("Run `krn context` and resolve STOP or quality warnings.");
  }

  if (hasWarningOrBlocker("handoff")) {
    nextActions.push("Run `krn handoff` after verify/review artifacts are current.");
  }

  if (blockers.length > 0) {
    nextActions.unshift("Resolve blockers before claiming completion.");
  }

  return {
    risks: [...new Set(risks)],
    blockers: [...new Set(blockers)],
    warnings: [...new Set(warnings)],
    nextActions: [...new Set(nextActions)],
  };
}

export function aggregateOperatorSummaryStatus(
  blockers: string[],
  warnings: string[],
): OperatorSummaryStatus {
  if (blockers.some((blocker) => blocker.includes("blocked"))) return "blocked";
  if (blockers.length > 0) return "fail";
  if (warnings.length > 0) return "warn";
  return "pass";
}
