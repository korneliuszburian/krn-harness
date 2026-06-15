import { readFile } from "node:fs/promises";
import path from "node:path";
import {
  type HookGuardrailMatrix,
  type HookRemediationTaxonomyFixture,
  hookFindingCodes,
  hookProofPathOwnershipHints,
  runHookGuardrailFixtureCase,
} from "../../hooks/src/guardrail-fixtures.js";
import {
  buildHookTracePayload,
  hookOperatorMessageVersion,
  hookRemediationCodeTaxonomy,
  hookRemediationHintCatalog,
  hookTracePayloadByteLength,
  maxHookRemediationCodes,
  maxHookTracePayloadBytes,
  maxOwnedProofPathHints,
  remediationCodesForFindingCodes,
} from "../../hooks/src/index.js";
import type { EvalGrade } from "./graders/types.js";

export async function gradeHookGuardrails(fixtureRoot: string): Promise<EvalGrade> {
  let matrix: HookGuardrailMatrix;
  let remediationTaxonomy: HookRemediationTaxonomyFixture;

  try {
    matrix = JSON.parse(
      await readFile(path.join(fixtureRoot, "fixtures", "hooks", "guardrail-matrix.json"), "utf8"),
    ) as HookGuardrailMatrix;
  } catch {
    return {
      name: "hook-guardrails",
      status: "fail",
      detail: "fixtures/hooks/guardrail-matrix.json is missing or malformed",
    };
  }

  try {
    remediationTaxonomy = JSON.parse(
      await readFile(
        path.join(fixtureRoot, "fixtures", "hooks", "remediation-taxonomy.json"),
        "utf8",
      ),
    ) as HookRemediationTaxonomyFixture;
  } catch {
    return {
      name: "hook-guardrails",
      status: "fail",
      detail: "fixtures/hooks/remediation-taxonomy.json is missing or malformed",
    };
  }

  if (matrix.schemaVersion !== 1 || !Array.isArray(matrix.cases)) {
    return {
      name: "hook-guardrails",
      status: "fail",
      detail: "fixtures/hooks/guardrail-matrix.json has an invalid schema",
    };
  }

  if (
    remediationTaxonomy.schemaVersion !== 1 ||
    !Array.isArray(remediationTaxonomy.codes) ||
    !Array.isArray(remediationTaxonomy.findingMappings)
  ) {
    return {
      name: "hook-guardrails",
      status: "fail",
      detail: "fixtures/hooks/remediation-taxonomy.json has an invalid schema",
    };
  }

  const failures: string[] = [];
  let wordingFixtureCount = 0;
  let remediationFixtureCount = 0;

  if (
    JSON.stringify(remediationTaxonomy.codes.map((item) => item.code)) !==
    JSON.stringify(hookRemediationCodeTaxonomy)
  ) {
    failures.push("hook remediation-code taxonomy fixture is out of order or incomplete");
  }

  for (const item of remediationTaxonomy.codes) {
    const catalogItem = hookRemediationHintCatalog[item.code];

    if (!catalogItem || catalogItem.en !== item.en || catalogItem.pl !== item.pl) {
      failures.push(`${item.code} remediation hint taxonomy regression`);
    }
  }

  for (const mapping of remediationTaxonomy.findingMappings) {
    const actualCodes = remediationCodesForFindingCodes([mapping.findingCode]);

    if (JSON.stringify(actualCodes) !== JSON.stringify(mapping.remediationCodes)) {
      failures.push(`${mapping.findingCode} remediation mapping regression`);
    }
  }

  for (const testCase of matrix.cases) {
    const result = runHookGuardrailFixtureCase(testCase);
    const tracePayload = buildHookTracePayload(result);
    const findingCodes = hookFindingCodes(result);
    const traceFindingCodes = tracePayload.findingCodes;
    const traceRemediationCodes = tracePayload.remediationCodes;

    if (result.status !== testCase.expected.status) {
      failures.push(
        `${testCase.name} expected status ${testCase.expected.status} got ${result.status}`,
      );
    }

    if (result.decision !== testCase.expected.decision) {
      failures.push(
        `${testCase.name} expected decision ${testCase.expected.decision} got ${result.decision}`,
      );
    }

    if (JSON.stringify(findingCodes) !== JSON.stringify(testCase.expected.findingCodes)) {
      failures.push(
        `${testCase.name} expected finding codes ${testCase.expected.findingCodes.join(",")} got ${findingCodes.join(",")}`,
      );
    }

    if (JSON.stringify(traceFindingCodes) !== JSON.stringify(testCase.expected.findingCodes)) {
      failures.push(`${testCase.name} trace finding-code regression`);
    }

    if (
      JSON.stringify(hookProofPathOwnershipHints(result)) !==
      JSON.stringify(testCase.expected.ownedProofPathHints ?? [])
    ) {
      failures.push(`${testCase.name} proof-path ownership hint regression`);
    }

    if (result.ownershipModel !== "task-context-owned-proof-paths-v1") {
      failures.push(`${testCase.name} used an unknown proof-path ownership model`);
    }

    if (result.ownedProofPathHintLimit !== maxOwnedProofPathHints) {
      failures.push(`${testCase.name} used an unexpected proof-path hint limit`);
    }

    if (result.tracePayloadByteLimit !== maxHookTracePayloadBytes) {
      failures.push(`${testCase.name} used an unexpected trace payload byte limit`);
    }

    if (hookTracePayloadByteLength(tracePayload) > maxHookTracePayloadBytes) {
      failures.push(`${testCase.name} emitted an oversized compact trace payload`);
    }

    if ("userFacingMessage" in tracePayload || "remediationHints" in tracePayload) {
      failures.push(`${testCase.name} leaked operator text into compact trace payload`);
    }

    if (result.operatorMessageVersion !== hookOperatorMessageVersion) {
      failures.push(`${testCase.name} used an unexpected operator message version`);
    }

    if (result.remediationCodes.length > maxHookRemediationCodes) {
      failures.push(`${testCase.name} emitted too many remediation codes`);
    }

    if (JSON.stringify(result.remediationCodes) !== JSON.stringify(traceRemediationCodes)) {
      failures.push(`${testCase.name} trace remediation-code regression`);
    }

    if (testCase.expected.remediationCodes !== undefined) {
      remediationFixtureCount += 1;

      if (
        JSON.stringify(result.remediationCodes) !==
        JSON.stringify(testCase.expected.remediationCodes)
      ) {
        failures.push(
          `${testCase.name} expected remediation codes ${testCase.expected.remediationCodes.join(",")} got ${result.remediationCodes.join(",")}`,
        );
      }
    }

    if (testCase.expected.userFacingMessage !== undefined) {
      wordingFixtureCount += 1;

      if (
        result.userFacingMessage.en !== testCase.expected.userFacingMessage.en ||
        result.userFacingMessage.pl !== testCase.expected.userFacingMessage.pl
      ) {
        failures.push(`${testCase.name} operator wording regression`);
      }
    }

    if (result.ownedProofPathHints.length > maxOwnedProofPathHints) {
      failures.push(`${testCase.name} emitted too many compact ownership hints`);
    }

    if (
      JSON.stringify(result.ownedProofPathHints) !==
      JSON.stringify(hookProofPathOwnershipHints(result))
    ) {
      failures.push(`${testCase.name} emitted non-compact ownership hints`);
    }

    if (result.enforced !== false) {
      failures.push(`${testCase.name} claimed enforcement instead of guardrail evidence`);
    }
  }

  if (wordingFixtureCount < 4) {
    failures.push("hook operator wording fixtures are missing or too sparse");
  }

  if (remediationFixtureCount < 4) {
    failures.push("hook remediation-code fixtures are missing or too sparse");
  }

  return {
    name: "hook-guardrails",
    status: failures.length === 0 ? "pass" : "fail",
    detail:
      failures.length === 0
        ? `${matrix.cases.length} hook guardrail fixture(s) cover allow, warn, block, false-positive collisions, compact ownership hints, operator wording, remediation taxonomy, writer-side compact trace payloads, trace payload limits, and finding codes`
        : failures.join("; "),
  };
}
