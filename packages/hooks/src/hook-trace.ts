import {
  type HookResult,
  type HookTracePayload,
  type HookTracePayloadMode,
  hookRemediationCodeTaxonomy,
  hookTraceCompactedDetail,
  maxHookRemediationCodes,
  maxHookTracePayloadBytes,
  maxOwnedProofPathHints,
} from "./hook-types.js";

function compactTraceString(value: string, maxLength: number): string {
  if (value.length <= maxLength) {
    return value;
  }

  const suffix = "...<compacted>";
  return `${value.slice(0, Math.max(0, maxLength - suffix.length))}${suffix}`;
}

export function hookTracePayloadByteLength(payload: HookTracePayload): number {
  return Buffer.byteLength(JSON.stringify(payload), "utf8");
}

function hookTracePayloadFromResult(
  result: HookResult,
  input: {
    event: string;
    detail: string;
    ownedProofPathHints: string[];
    tracePayloadMode: HookTracePayloadMode;
  },
): HookTracePayload {
  return {
    provider: result.provider,
    event: input.event,
    supported: result.supported,
    status: result.status,
    decision: result.decision,
    enforced: result.enforced,
    ownershipModel: result.ownershipModel,
    ownedProofPathHintLimit: result.ownedProofPathHintLimit,
    tracePayloadByteLimit: result.tracePayloadByteLimit,
    ownedProofPathHints: input.ownedProofPathHints,
    payloadSource: result.payloadSource,
    detail: input.detail,
    findingCodes: result.findings.map((finding) => finding.code).slice(0, 10),
    operatorMessageVersion: result.operatorMessageVersion,
    remediationCodes: result.remediationCodes
      .filter((code) => hookRemediationCodeTaxonomy.includes(code))
      .slice(0, maxHookRemediationCodes),
    tracePayloadMode: input.tracePayloadMode,
  };
}

function compactOwnedTraceHints(hints: string[], maxLength: number): string[] {
  return hints.slice(0, maxOwnedProofPathHints).map((hint) => compactTraceString(hint, maxLength));
}

function firstPayloadWithinBudget(payloads: HookTracePayload[]): HookTracePayload {
  const lastPayload = payloads[payloads.length - 1];

  for (const payload of payloads) {
    if (hookTracePayloadByteLength(payload) <= maxHookTracePayloadBytes) {
      return payload;
    }
  }

  if (!lastPayload) {
    throw new Error("No hook trace payload fallback was provided");
  }

  return lastPayload;
}

export function buildHookTracePayload(result: HookResult): HookTracePayload {
  const fullPayload = hookTracePayloadFromResult(result, {
    event: result.event,
    detail: result.detail,
    ownedProofPathHints: result.ownedProofPathHints,
    tracePayloadMode: "full",
  });

  if (hookTracePayloadByteLength(fullPayload) <= maxHookTracePayloadBytes) {
    return fullPayload;
  }

  return firstPayloadWithinBudget([
    hookTracePayloadFromResult(result, {
      event: compactTraceString(result.event, 96),
      detail: hookTraceCompactedDetail,
      ownedProofPathHints: compactOwnedTraceHints(result.ownedProofPathHints, 128),
      tracePayloadMode: "compacted",
    }),
    hookTracePayloadFromResult(result, {
      event: compactTraceString(result.event, 48),
      detail: hookTraceCompactedDetail,
      ownedProofPathHints: compactOwnedTraceHints(result.ownedProofPathHints, 64),
      tracePayloadMode: "compacted",
    }),
    hookTracePayloadFromResult(result, {
      event: "<compacted>",
      detail: hookTraceCompactedDetail,
      ownedProofPathHints: result.ownedProofPathHints.length > 0 ? ["<compacted>"] : [],
      tracePayloadMode: "compacted",
    }),
  ]);
}
