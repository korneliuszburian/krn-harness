import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import {
  buildHookTracePayload,
  type HookCurrentState,
  handleCodexHook,
  hookRemediationCodeTaxonomy,
  hookRemediationHintCatalog,
  hookTraceCompactedDetail,
  hookTracePayloadByteLength,
  maxHookTracePayloadBytes,
  maxOwnedProofPathHints,
  parseCodexHookPayload,
  remediationCodesForFindingCodes,
} from "./codex-hook-entry.js";
import {
  type HookGuardrailMatrix,
  type HookRemediationTaxonomyFixture,
  hookFindingCodes,
  hookProofPathOwnershipHints,
  runHookGuardrailFixtureCase,
} from "./guardrail-fixtures.js";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../..");

function readHookMatrix(): HookGuardrailMatrix {
  return JSON.parse(
    readFileSync(path.join(repoRoot, "fixtures", "hooks", "guardrail-matrix.json"), "utf8"),
  ) as HookGuardrailMatrix;
}

function readRemediationTaxonomy(): HookRemediationTaxonomyFixture {
  return JSON.parse(
    readFileSync(path.join(repoRoot, "fixtures", "hooks", "remediation-taxonomy.json"), "utf8"),
  ) as HookRemediationTaxonomyFixture;
}

const readyState: HookCurrentState = {
  taskPresent: true,
  contextPresent: true,
  contextStop: false,
  verifyPresent: true,
  handoffPresent: true,
  taskId: "task-hook",
  taskText: "Edit scoped file",
  writablePaths: ["src/in-scope.ts"],
  doNotUsePaths: ["docs/stale.md"],
  missingContextPaths: [],
  verifyStatus: "not-runnable",
};

describe("Codex hook entry core guardrails", () => {
  it("keeps guardrail fixtures out of the public hooks barrel", () => {
    const barrel = readFileSync(
      path.join(repoRoot, "packages", "hooks", "src", "index.ts"),
      "utf8",
    );

    expect(barrel).not.toContain("guardrail-fixtures");
  });

  it("keeps hook decisions non-enforced until a later ADR changes the contract", () => {
    const allowed = handleCodexHook("SessionStart", { state: readyState });
    const blocked = handleCodexHook("PreToolUse", {
      payload: parseCodexHookPayload(JSON.stringify({ toolName: "Write", filePath: "outside.ts" })),
      state: readyState,
    });

    expect(allowed.decision).toBe("allow");
    expect(allowed.enforced).toBe(false);
    expect(blocked.decision).toBe("block");
    expect(blocked.enforced).toBe(false);
  });

  it("ignores unsupported events without crashing", () => {
    expect(handleCodexHook("PermissionRequest", { state: readyState })).toMatchObject({
      provider: "codex",
      event: "PermissionRequest",
      supported: false,
      status: "ignored",
      decision: "allow",
      enforced: false,
      findings: [],
    });
  });

  it("matches the deterministic hook guardrail fixture matrix", () => {
    for (const testCase of readHookMatrix().cases) {
      const result = runHookGuardrailFixtureCase(testCase);

      expect(
        {
          status: result.status,
          decision: result.decision,
          findingCodes: hookFindingCodes(result),
        },
        testCase.name,
      ).toEqual({
        status: testCase.expected.status,
        decision: testCase.expected.decision,
        findingCodes: testCase.expected.findingCodes,
      });
      expect(hookProofPathOwnershipHints(result), testCase.name).toEqual(
        testCase.expected.ownedProofPathHints ?? [],
      );
      expect(result.ownedProofPathHints, testCase.name).toEqual(
        testCase.expected.ownedProofPathHints ?? [],
      );
      if (testCase.expected.userFacingMessage !== undefined) {
        expect(result.userFacingMessage, testCase.name).toEqual(
          testCase.expected.userFacingMessage,
        );
      }
      if (testCase.expected.remediationCodes !== undefined) {
        expect(result.remediationCodes, testCase.name).toEqual(testCase.expected.remediationCodes);
        expect(
          result.remediationHints.map((hint) => hint.code),
          testCase.name,
        ).toEqual(testCase.expected.remediationCodes);
      }
      expect(result.enforced, testCase.name).toBe(false);
      expect(result.ownershipModel, testCase.name).toBe("task-context-owned-proof-paths-v1");
      expect(result.ownedProofPathHintLimit, testCase.name).toBe(maxOwnedProofPathHints);
      expect(result.tracePayloadByteLimit, testCase.name).toBe(maxHookTracePayloadBytes);
      expect(result.operatorMessageVersion, testCase.name).toBe("hook-operator-message-v1");
    }
  });

  it("returns deterministic bilingual operator guidance for allow, warn, and block decisions", () => {
    const allow = handleCodexHook("SessionStart", { state: readyState });
    const proofPath = handleCodexHook("PreToolUse", {
      payload: parseCodexHookPayload(
        JSON.stringify({ toolName: "Write", filePath: "docs/specs/hooks-pack.md" }),
      ),
      state: {
        ...readyState,
        taskText: "Harden hook guardrail operator ergonomics",
      },
    });
    const outOfScope = handleCodexHook("PreToolUse", {
      payload: parseCodexHookPayload(
        JSON.stringify({ toolName: "Write", filePath: "src/out-of-scope.ts" }),
      ),
      state: readyState,
    });
    const finalStop = handleCodexHook("Stop", {
      state: {
        ...readyState,
        verifyPresent: false,
        handoffPresent: false,
      },
    });

    expect(allow).toMatchObject({
      userFacingMessage: {
        en: "Hook guardrails passed. Continue.",
        pl: "Guardrails hooka przeszły. Możesz kontynuować.",
      },
      remediationCodes: [],
      remediationHints: [],
    });
    expect(proofPath).toMatchObject({
      userFacingMessage: {
        en: "Warning: allowed as an owned proof path. Review it before handoff.",
        pl: "Ostrzeżenie: dozwolone jako owned proof path. Sprawdź to przed handoffem.",
      },
      remediationCodes: ["review-owned-proof-path"],
    });
    expect(outOfScope).toMatchObject({
      userFacingMessage: {
        en: "Blocked: this edit is outside the current context. Run `krn context` or add this path to the task scope.",
        pl: "Zablokowano: ta zmiana jest poza aktualnym kontekstem. Uruchom `krn context` albo dodaj tę ścieżkę do zakresu zadania.",
      },
      remediationCodes: ["run-krn-context", "scope-path"],
    });
    expect(finalStop).toMatchObject({
      userFacingMessage: {
        en: "Blocked: final Stop needs verification and handoff. Run `krn verify` and run `krn handoff`.",
        pl: "Zablokowano: końcowy Stop wymaga verify i handoff. Uruchom `krn verify` i uruchom `krn handoff`.",
      },
      remediationCodes: ["run-krn-verify", "run-krn-handoff"],
    });
  });

  it("matches the deterministic remediation-code taxonomy fixture", () => {
    const taxonomy = readRemediationTaxonomy();

    expect(taxonomy.schemaVersion).toBe(1);
    expect(taxonomy.codes.map((item) => item.code)).toEqual(hookRemediationCodeTaxonomy);

    for (const item of taxonomy.codes) {
      expect(hookRemediationHintCatalog[item.code]).toEqual({
        en: item.en,
        pl: item.pl,
      });
    }

    for (const mapping of taxonomy.findingMappings) {
      expect(remediationCodesForFindingCodes([mapping.findingCode]), mapping.findingCode).toEqual(
        mapping.remediationCodes,
      );
    }
  });

  it("builds compact hook trace payloads without stdout-only operator text", () => {
    const result = handleCodexHook("PreToolUse", {
      payload: parseCodexHookPayload(
        JSON.stringify({ toolName: "Write", filePath: "src/out-of-scope.ts" }),
      ),
      state: readyState,
    });
    const tracePayload = buildHookTracePayload(result);

    expect(tracePayload).toMatchObject({
      provider: "codex",
      event: "PreToolUse",
      status: "blocked",
      decision: "block",
      enforced: false,
      findingCodes: ["out-of-scope-edit"],
      operatorMessageVersion: "hook-operator-message-v1",
      remediationCodes: ["run-krn-context", "scope-path"],
      tracePayloadMode: "full",
    });
    expect(tracePayload).not.toHaveProperty("userFacingMessage");
    expect(tracePayload).not.toHaveProperty("remediationHints");
    expect(hookTracePayloadByteLength(tracePayload)).toBeLessThanOrEqual(maxHookTracePayloadBytes);
  });

  it("compacts oversized hook trace payloads before writing", () => {
    const result = {
      ...handleCodexHook("PreToolUse", {
        payload: parseCodexHookPayload(
          JSON.stringify({ toolName: "Write", filePath: "docs/specs/hooks-pack.md" }),
        ),
        state: {
          ...readyState,
          taskText: "Harden hook trace payload budgeting",
        },
      }),
      event: `PreToolUse-${"x".repeat(2000)}`,
      detail: `P0 hook guardrail warn: ${"x".repeat(2000)}`,
      ownedProofPathHints: [`docs/specs/${"x".repeat(2000)}.md`],
    };
    const tracePayload = buildHookTracePayload(result);

    expect(tracePayload.tracePayloadMode).toBe("compacted");
    expect(tracePayload.detail).toBe(hookTraceCompactedDetail);
    expect(tracePayload.findingCodes).toEqual(["proof-path-exception"]);
    expect(tracePayload.remediationCodes).toEqual(["review-owned-proof-path"]);
    expect(tracePayload).not.toHaveProperty("userFacingMessage");
    expect(tracePayload).not.toHaveProperty("remediationHints");
    expect(hookTracePayloadByteLength(tracePayload)).toBeLessThanOrEqual(maxHookTracePayloadBytes);
  });
});
