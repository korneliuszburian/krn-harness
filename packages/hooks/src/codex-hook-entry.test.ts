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
  ownedProofPathHintsForState,
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

describe("Codex hook entry guardrails", () => {
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

  it("blocks edit tool use when task or context artifacts are missing", () => {
    const result = handleCodexHook("PreToolUse", {
      payload: parseCodexHookPayload(
        JSON.stringify({
          tool: "apply_patch",
          arguments: {
            patch: "*** Begin Patch\n*** Update File: src/in-scope.ts\n@@\n+test\n*** End Patch\n",
          },
        }),
      ),
    });

    expect(result).toMatchObject({
      supported: true,
      status: "blocked",
      decision: "block",
      enforced: false,
    });
    expect(result.findings.map((finding) => finding.code)).toEqual([
      "missing-task-contract",
      "missing-context-package",
    ]);
  });

  it("blocks tool use while context STOP is active", () => {
    const result = handleCodexHook("PreToolUse", {
      payload: parseCodexHookPayload(
        JSON.stringify({
          tool: "apply_patch",
          arguments: {
            patch: "*** Begin Patch\n*** Update File: src/in-scope.ts\n@@\n+test\n*** End Patch\n",
          },
        }),
      ),
      state: {
        ...readyState,
        contextStop: true,
        contextStopReason: "Required context is missing: docs/required-context.md",
        verifyStatus: "blocked",
      },
    });

    expect(result.decision).toBe("block");
    expect(result.findings).toContainEqual({
      code: "context-stop-active",
      severity: "block",
      detail: "Required context is missing: docs/required-context.md",
    });
  });

  it("warns for read-only tool use before task/context artifacts exist", () => {
    const result = handleCodexHook("PreToolUse", {
      payload: parseCodexHookPayload(JSON.stringify({ tool: "Read", filePath: "src/in-scope.ts" })),
    });

    expect(result).toMatchObject({
      supported: true,
      status: "warn",
      decision: "warn",
      enforced: false,
    });
    expect(result.findings.map((finding) => finding.code)).toEqual([
      "missing-task-contract",
      "missing-context-package",
    ]);
  });

  it("blocks edit payloads outside the current writable context", () => {
    const payload = parseCodexHookPayload(
      JSON.stringify({
        tool: "apply_patch",
        arguments: {
          patch:
            "*** Begin Patch\n*** Update File: src/out-of-scope.ts\n@@\n+test\n*** End Patch\n",
        },
      }),
    );
    const result = handleCodexHook("PreToolUse", {
      payload,
      state: readyState,
    });

    expect(result).toMatchObject({
      status: "blocked",
      decision: "block",
      payloadSource: "stdin-json",
    });
    expect(result.findings).toContainEqual({
      code: "out-of-scope-edit",
      severity: "block",
      detail: "Tool payload edits a path outside must-read/should-read current context",
      path: "src/out-of-scope.ts",
    });
  });

  it("blocks unowned test/docs proof paths outside active context", () => {
    const payload = parseCodexHookPayload(
      JSON.stringify({
        toolName: "Write",
        filePath: "docs/proof.md",
      }),
    );
    const result = handleCodexHook("PreToolUse", {
      payload,
      state: readyState,
    });

    expect(result).toMatchObject({
      status: "blocked",
      decision: "block",
      enforced: false,
    });
    expect(result.findings).toContainEqual({
      code: "out-of-scope-edit",
      severity: "block",
      detail: "Tool payload edits a path outside must-read/should-read current context",
      path: "docs/proof.md",
    });
  });

  it("warns for task-owned hook proof paths outside active context", () => {
    const payload = parseCodexHookPayload(
      JSON.stringify({
        toolName: "Write",
        filePath: "docs/specs/hooks-pack.md",
      }),
    );
    const result = handleCodexHook("PreToolUse", {
      payload,
      state: {
        ...readyState,
        taskText: "Harden hook guardrail ownership hints",
      },
    });

    expect(result).toMatchObject({
      status: "warn",
      decision: "warn",
      enforced: false,
      ownershipModel: "task-context-owned-proof-paths-v1",
    });
    expect(result.ownedProofPathHints).toEqual(["docs/specs/hooks-pack.md"]);
    expect(result.findings).toContainEqual({
      code: "proof-path-exception",
      severity: "warn",
      detail: "Tool payload edits a task/context-owned proof path outside active context",
      path: "docs/specs/hooks-pack.md",
      ownershipHint: "docs/specs/hooks-pack.md",
    });
  });

  it("warns for context-owned package test proof paths outside active context", () => {
    const payload = parseCodexHookPayload(
      JSON.stringify({
        toolName: "Write",
        filePath: "packages/hooks/src/codex-hook-entry.test.ts",
      }),
    );
    const result = handleCodexHook("PreToolUse", {
      payload,
      state: {
        ...readyState,
        taskText: "Update current package tests",
        writablePaths: ["src/in-scope.ts", "packages/hooks/src/codex-hook-entry.ts"],
      },
    });

    expect(result).toMatchObject({
      status: "warn",
      decision: "warn",
      enforced: false,
    });
    expect(result.findings).toContainEqual({
      code: "proof-path-exception",
      severity: "warn",
      detail: "Tool payload edits a task/context-owned proof path outside active context",
      path: "packages/hooks/src/codex-hook-entry.test.ts",
      ownershipHint: "packages/hooks",
    });
  });

  it("warns for non-hook package proof paths owned by current context", () => {
    const payload = parseCodexHookPayload(
      JSON.stringify({
        toolName: "Write",
        filePath: "packages/config/src/load-config.test.ts",
      }),
    );
    const result = handleCodexHook("PreToolUse", {
      payload,
      state: {
        ...readyState,
        taskText: "Update current package tests",
        writablePaths: ["packages/config/src/load-config.ts"],
      },
    });

    expect(result.ownedProofPathHints).toEqual(["packages/config"]);
    expect(result.findings).toContainEqual({
      code: "proof-path-exception",
      severity: "warn",
      detail: "Tool payload edits a task/context-owned proof path outside active context",
      path: "packages/config/src/load-config.test.ts",
      ownershipHint: "packages/config",
    });
  });

  it("does not accept broad explicit proof path ownership hints", () => {
    const payload = parseCodexHookPayload(
      JSON.stringify({
        toolName: "Write",
        filePath: "docs/proof.md",
      }),
    );
    const result = handleCodexHook("PreToolUse", {
      payload,
      state: {
        ...readyState,
        ownedProofPaths: ["docs"],
      },
    });

    expect(result.ownedProofPathHints).toEqual([]);
    expect(result.findings).toContainEqual({
      code: "out-of-scope-edit",
      severity: "block",
      detail: "Tool payload edits a path outside must-read/should-read current context",
      path: "docs/proof.md",
    });
  });

  it("keeps candidate ownership hints stable, sorted, and de-duplicated", () => {
    expect(
      ownedProofPathHintsForState({
        ...readyState,
        taskText: "Harden config loading",
        writablePaths: ["packages/config/src/load-config.ts", "packages/config/src/load-config.ts"],
        ownedProofPaths: ["docs", "packages/config", "packages/config"],
      }),
    ).toEqual(["docs/specs/krn-config.schema.md", "packages/config"]);
  });

  it("caps compact proof path hints in hook results", () => {
    const result = handleCodexHook("PreToolUse", {
      payload: parseCodexHookPayload(
        JSON.stringify({
          toolName: "Write",
          edits: [
            { filePath: "docs/specs/context-package.schema.md" },
            { filePath: "docs/specs/doctor-result.schema.md" },
            { filePath: "docs/specs/eval-result.schema.md" },
            { filePath: "docs/specs/hooks-pack.md" },
            { filePath: "docs/specs/krn-config.schema.md" },
            { filePath: "docs/specs/memory.schema.md" },
          ],
        }),
      ),
      state: {
        ...readyState,
        taskText: "Harden config context doctor eval hook memory ownership hints",
      },
    });

    expect(
      result.findings.filter((finding) => finding.code === "proof-path-exception"),
    ).toHaveLength(6);
    expect(result.ownedProofPathHints).toEqual([
      "docs/specs/context-package.schema.md",
      "docs/specs/doctor-result.schema.md",
      "docs/specs/eval-result.schema.md",
      "docs/specs/hooks-pack.md",
    ]);
    expect(result.ownedProofPathHints).toHaveLength(maxOwnedProofPathHints);
  });

  it("blocks edit payloads for do-not-use paths", () => {
    const payload = parseCodexHookPayload(
      JSON.stringify({
        toolName: "Write",
        filePath: "docs/stale.md",
      }),
    );
    const result = handleCodexHook("PreToolUse", {
      payload,
      state: readyState,
    });

    expect(result.decision).toBe("block");
    expect(result.findings).toContainEqual({
      code: "do-not-use-edit",
      severity: "block",
      detail: "Tool payload edits a path marked do-not-use by the current context package",
      path: "docs/stale.md",
    });
  });

  it("blocks final Stop until verify and handoff artifacts exist", () => {
    const result = handleCodexHook("Stop", {
      state: {
        ...readyState,
        verifyPresent: false,
        handoffPresent: false,
      },
    });

    expect(result.decision).toBe("block");
    expect(result.findings.map((finding) => finding.code)).toEqual([
      "final-verify-missing",
      "final-handoff-missing",
    ]);
  });

  it("allows final Stop when verify and handoff artifacts exist", () => {
    const result = handleCodexHook("Stop", {
      state: readyState,
    });

    expect(result).toMatchObject({
      status: "ok",
      decision: "allow",
      findings: [],
    });
  });

  it("warns but does not sandbox-block final Stop when STOP was already handed off", () => {
    const result = handleCodexHook("Stop", {
      state: {
        ...readyState,
        contextStop: true,
        contextStopReason: "Required context is missing: docs/required-context.md",
        verifyStatus: "blocked",
      },
    });

    expect(result).toMatchObject({
      status: "warn",
      decision: "warn",
      enforced: false,
    });
    expect(result.findings.map((finding) => finding.code)).toEqual(["context-stop-active"]);
  });

  it("warns deterministically on invalid JSON stdin", () => {
    const result = handleCodexHook("SessionStart", {
      payload: parseCodexHookPayload("{not json"),
      state: readyState,
    });

    expect(result).toMatchObject({
      status: "warn",
      decision: "warn",
      payloadSource: "stdin-invalid-json",
    });
    expect(result.findings).toContainEqual(
      expect.objectContaining({
        code: "invalid-hook-payload",
        severity: "warn",
      }),
    );
  });
});
