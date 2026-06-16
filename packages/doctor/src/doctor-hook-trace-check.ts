import { readFile } from "node:fs/promises";
import path from "node:path";
import { pathExists } from "../../core/src/index.js";
import { readTraceLines, type TraceEvent } from "../../trace/src/index.js";
import { isRecord, isStringArray } from "./doctor-json.js";
import type { DoctorCheck } from "./doctor-types.js";

const maxOwnedProofPathHints = 4;
const maxHookTracePayloadBytes = 1024;
const hookOperatorMessageVersion = "hook-operator-message-v1";
const maxHookRemediationCodes = 6;
const hookTraceCompactedDetail = "P0 hook trace payload compacted to fit budget";

function normalizeTracePathHint(filePath: string): string {
  return filePath.trim().replaceAll("\\", "/").replace(/^\.\//, "").replace(/\/+$/, "");
}

function isBroadProofPathHint(filePath: string): boolean {
  const normalized = normalizeTracePathHint(filePath);

  return (
    normalized.length === 0 ||
    normalized === "docs" ||
    normalized === "fixtures" ||
    normalized === "test" ||
    normalized === "tests" ||
    normalized === "packages"
  );
}

export async function hookGuardrailTraceCheck(cwd: string): Promise<DoctorCheck> {
  const relativePath = ".krn/traces/trace.jsonl";
  const tracePath = path.join(cwd, relativePath);

  if (!(await pathExists(tracePath))) {
    return {
      name: "hook-guardrail-trace",
      status: "pass",
      detail: "No global trace; hook guardrail trace check skipped",
    };
  }

  let events: TraceEvent[];
  try {
    events = await readTraceLines(await readFile(tracePath, "utf8"));
  } catch {
    return {
      name: "hook-guardrail-trace",
      status: "fail",
      detail: `${relativePath} is malformed`,
    };
  }

  const hookEvents = events.filter((event) => event.name === "hook.received");

  if (hookEvents.length === 0) {
    return {
      name: "hook-guardrail-trace",
      status: "pass",
      detail: "No hook.received events; hook guardrail trace check skipped",
    };
  }

  const counts = { allow: 0, warn: 0, block: 0 };
  let legacyEvents = 0;
  let legacyProofPathEvents = 0;
  let ownedProofPathEvents = 0;

  for (const event of hookEvents) {
    const data = event.data;

    if (isRecord(data) && data.decision === undefined) {
      legacyEvents += 1;
      continue;
    }

    if (
      !isRecord(data) ||
      data.provider !== "codex" ||
      typeof data.event !== "string" ||
      typeof data.supported !== "boolean" ||
      typeof data.status !== "string" ||
      (data.decision !== "allow" && data.decision !== "warn" && data.decision !== "block") ||
      data.enforced !== false ||
      typeof data.payloadSource !== "string" ||
      typeof data.detail !== "string" ||
      !isStringArray(data.findingCodes)
    ) {
      return {
        name: "hook-guardrail-trace",
        status: "fail",
        detail: `hook.received ${event.id} is missing guardrail decision fields`,
      };
    }

    counts[data.decision] += 1;

    if (data.decision !== "allow" && data.findingCodes.length === 0) {
      return {
        name: "hook-guardrail-trace",
        status: "fail",
        detail: `hook.received ${event.id} has ${data.decision} without finding codes`,
      };
    }

    if (data.userFacingMessage !== undefined || data.remediationHints !== undefined) {
      return {
        name: "hook-guardrail-trace",
        status: "fail",
        detail: `hook.received ${event.id} includes long operator text in trace payload`,
      };
    }

    if (
      data.tracePayloadMode !== undefined &&
      data.tracePayloadMode !== "full" &&
      data.tracePayloadMode !== "compacted"
    ) {
      return {
        name: "hook-guardrail-trace",
        status: "fail",
        detail: `hook.received ${event.id} has an unknown trace payload mode`,
      };
    }

    if (data.tracePayloadMode === "compacted" && data.detail !== hookTraceCompactedDetail) {
      return {
        name: "hook-guardrail-trace",
        status: "fail",
        detail: `hook.received ${event.id} has malformed compacted trace detail`,
      };
    }

    if (data.remediationCodes !== undefined && data.operatorMessageVersion === undefined) {
      return {
        name: "hook-guardrail-trace",
        status: "fail",
        detail: `hook.received ${event.id} has remediation codes without operator message version`,
      };
    }

    if (data.operatorMessageVersion !== undefined) {
      if (data.operatorMessageVersion !== hookOperatorMessageVersion) {
        return {
          name: "hook-guardrail-trace",
          status: "fail",
          detail: `hook.received ${event.id} has an unknown operator message version`,
        };
      }

      if (data.remediationCodes === undefined) {
        return {
          name: "hook-guardrail-trace",
          status: "fail",
          detail: `hook.received ${event.id} has operator message version without remediation codes`,
        };
      }

      if (!isStringArray(data.remediationCodes)) {
        return {
          name: "hook-guardrail-trace",
          status: "fail",
          detail: `hook.received ${event.id} has malformed remediation codes`,
        };
      }

      if (data.remediationCodes.length > maxHookRemediationCodes) {
        return {
          name: "hook-guardrail-trace",
          status: "fail",
          detail: `hook.received ${event.id} exceeds remediation code limit`,
        };
      }

      if (data.decision !== "allow" && data.remediationCodes.length === 0) {
        return {
          name: "hook-guardrail-trace",
          status: "fail",
          detail: `hook.received ${event.id} has ${data.decision} without remediation codes`,
        };
      }
    }

    if (
      data.ownershipModel !== undefined &&
      data.ownershipModel !== "task-context-owned-proof-paths-v1"
    ) {
      return {
        name: "hook-guardrail-trace",
        status: "fail",
        detail: `hook.received ${event.id} has an unknown proof-path ownership model`,
      };
    }

    if (data.ownedProofPathHints !== undefined && !isStringArray(data.ownedProofPathHints)) {
      return {
        name: "hook-guardrail-trace",
        status: "fail",
        detail: `hook.received ${event.id} has malformed proof-path ownership hints`,
      };
    }

    if (data.ownedProofPathHintLimit !== undefined) {
      if (data.ownedProofPathHintLimit !== maxOwnedProofPathHints) {
        return {
          name: "hook-guardrail-trace",
          status: "fail",
          detail: `hook.received ${event.id} has unexpected proof-path ownership hint limit`,
        };
      }

      if (!isStringArray(data.ownedProofPathHints)) {
        return {
          name: "hook-guardrail-trace",
          status: "fail",
          detail: `hook.received ${event.id} has a hint limit without compact ownership hints`,
        };
      }

      if (data.ownedProofPathHints.length > maxOwnedProofPathHints) {
        return {
          name: "hook-guardrail-trace",
          status: "fail",
          detail: `hook.received ${event.id} exceeds proof-path ownership hint limit`,
        };
      }
    }

    if (data.tracePayloadByteLimit !== undefined) {
      if (data.tracePayloadByteLimit !== maxHookTracePayloadBytes) {
        return {
          name: "hook-guardrail-trace",
          status: "fail",
          detail: `hook.received ${event.id} has unexpected trace payload byte limit`,
        };
      }

      if (Buffer.byteLength(JSON.stringify(data), "utf8") > maxHookTracePayloadBytes) {
        return {
          name: "hook-guardrail-trace",
          status: "fail",
          detail: `hook.received ${event.id} exceeds trace payload byte limit`,
        };
      }
    }

    if (isStringArray(data.ownedProofPathHints)) {
      const broadHint = data.ownedProofPathHints.find(isBroadProofPathHint);

      if (broadHint !== undefined) {
        return {
          name: "hook-guardrail-trace",
          status: "fail",
          detail: `hook.received ${event.id} has over-broad proof-path ownership hint ${broadHint}`,
        };
      }
    }

    if (data.findingCodes.includes("proof-path-exception")) {
      if (data.ownershipModel !== "task-context-owned-proof-paths-v1") {
        legacyProofPathEvents += 1;
        continue;
      }

      if (!isStringArray(data.ownedProofPathHints) || data.ownedProofPathHints.length === 0) {
        return {
          name: "hook-guardrail-trace",
          status: "fail",
          detail: `hook.received ${event.id} has proof-path-exception without ownership hints`,
        };
      }

      ownedProofPathEvents += 1;
    }
  }

  const checkedEvents = hookEvents.length - legacyEvents;

  if (checkedEvents === 0) {
    return {
      name: "hook-guardrail-trace",
      status: "warn",
      detail: `${legacyEvents} legacy hook.received event(s) predate guardrail decision fields`,
    };
  }

  return {
    name: "hook-guardrail-trace",
    status: "pass",
    detail: `${checkedEvents} hook guardrail trace event(s) valid: allow ${counts.allow}, warn ${counts.warn}, block ${counts.block}, owned proof paths ${ownedProofPathEvents}${legacyEvents > 0 ? `; ignored ${legacyEvents} legacy event(s)` : ""}${legacyProofPathEvents > 0 ? `; ignored ${legacyProofPathEvents} legacy proof-path event(s)` : ""}`,
  };
}
