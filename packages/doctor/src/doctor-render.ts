import type { DoctorCheck, DoctorResult, DoctorStatus } from "./doctor-types.js";

export function deriveStatus(checks: DoctorCheck[]): DoctorStatus {
  if (checks.some((check) => check.status === "fail")) {
    return "fail";
  }

  if (checks.some((check) => check.status === "warn")) {
    return "warn";
  }

  return "pass";
}

export function nextActionsFor(checks: DoctorCheck[]): string[] {
  const byName = new Map(checks.map((check) => [check.name, check]));
  const actions: string[] = [];

  if (byName.get("graph-json")?.status === "warn") {
    actions.push("Run `krn graph` to generate graph artifacts.");
  }

  if (byName.get("current-context-package")?.status === "warn") {
    actions.push("Run `krn context` to generate the current context package.");
  }

  const verifyCheck = byName.get("current-verify-result");
  if (verifyCheck?.status === "warn" && verifyCheck.detail.includes("not-runnable")) {
    actions.push("Configure an allowed verify profile or run `krn verify --profile <name>`.");
  } else if (verifyCheck?.status === "warn") {
    actions.push("Run `krn verify` to record P0 verification state.");
  }

  if (byName.get("current-handoff")?.status === "warn") {
    actions.push("Run `krn handoff` to generate the current handoff.");
  }

  return actions;
}

export function renderDoctorResultMarkdown(result: DoctorResult): string {
  const lines = ["# KRN Doctor Result", "", `Status: ${result.status}`, "", "## Checks", ""];

  for (const check of result.checks) {
    lines.push(`- ${check.name}: ${check.status} - ${check.detail}`);
  }

  lines.push("", "## Next Actions", "");
  lines.push(
    ...(result.nextActions.length > 0
      ? result.nextActions.map((action) => `- ${action}`)
      : ["- none"]),
  );

  lines.push("");
  return lines.join("\n");
}
