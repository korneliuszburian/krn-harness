import {
  type HookDecision,
  type HookGuardrailFinding,
  type HookGuardrailFindingCode,
  type HookLocalizedText,
  type HookRemediationCode,
  type HookRemediationHint,
  type HookResult,
  hookRemediationHintCatalog,
  maxHookRemediationCodes,
} from "./hook-types.js";

function remediationCodesForFinding(code: HookGuardrailFindingCode): HookRemediationCode[] {
  if (code === "invalid-hook-payload") {
    return ["send-valid-hook-json"];
  }

  if (code === "missing-task-contract") {
    return ["run-krn-start"];
  }

  if (code === "missing-context-package") {
    return ["run-krn-context"];
  }

  if (code === "context-stop-active") {
    return ["resolve-context-stop"];
  }

  if (code === "do-not-use-edit") {
    return ["avoid-do-not-use-path"];
  }

  if (code === "out-of-scope-edit") {
    return ["run-krn-context", "scope-path"];
  }

  if (code === "proof-path-exception") {
    return ["review-owned-proof-path"];
  }

  if (code === "pre-compact-run-result-missing") {
    return ["run-krn-run"];
  }

  if (code === "pre-compact-report-missing") {
    return ["run-krn-report"];
  }

  if (code === "post-compact-context-refresh-needed") {
    return ["run-krn-context"];
  }

  if (code === "final-verify-missing") {
    return ["run-krn-verify"];
  }

  if (code === "final-verify-blocked") {
    return ["resolve-verify-block"];
  }

  return ["run-krn-handoff"];
}

export function remediationCodesForFindingCodes(
  findingCodes: HookGuardrailFindingCode[],
): HookRemediationCode[] {
  const codes: HookRemediationCode[] = [];

  for (const findingCode of findingCodes) {
    for (const remediationCode of remediationCodesForFinding(findingCode)) {
      if (!codes.includes(remediationCode)) {
        codes.push(remediationCode);
      }
    }
  }

  return codes.slice(0, maxHookRemediationCodes);
}

function remediationCodesForFindings(findings: HookGuardrailFinding[]): HookRemediationCode[] {
  return remediationCodesForFindingCodes(findings.map((finding) => finding.code));
}

function remediationHintsForCodes(codes: HookRemediationCode[]): HookRemediationHint[] {
  return codes.map((code) => ({
    code,
    ...hookRemediationHintCatalog[code],
  }));
}

function findingCodesSet(findings: HookGuardrailFinding[]): Set<HookGuardrailFinding["code"]> {
  return new Set(findings.map((finding) => finding.code));
}

function operatorMessageFor(
  decision: HookDecision,
  supported: boolean,
  findings: HookGuardrailFinding[],
): HookLocalizedText {
  if (!supported) {
    return {
      en: "Hook event is not supported in P0. Ignored without action.",
      pl: "To zdarzenie hooka nie jest wspierane w P0. Pominięto bez akcji.",
    };
  }

  if (findings.length === 0) {
    return {
      en: "Hook guardrails passed. Continue.",
      pl: "Guardrails hooka przeszły. Możesz kontynuować.",
    };
  }

  const codes = findingCodesSet(findings);

  if (codes.has("final-verify-missing") || codes.has("final-handoff-missing")) {
    return {
      en: "Blocked: final Stop needs verification and handoff. Run `krn verify` and run `krn handoff`.",
      pl: "Zablokowano: końcowy Stop wymaga verify i handoff. Uruchom `krn verify` i uruchom `krn handoff`.",
    };
  }

  if (codes.has("final-verify-blocked")) {
    return {
      en: "Blocked: verify is blocked. Fix verification or keep the context STOP active before final Stop.",
      pl: "Zablokowano: verify jest zablokowane. Napraw weryfikację albo zachowaj aktywny STOP kontekstu przed końcowym Stop.",
    };
  }

  if (codes.has("do-not-use-edit")) {
    return {
      en: "Blocked: this path is marked do-not-use by the current context. Pick another path or rebuild context.",
      pl: "Zablokowano: ta ścieżka jest oznaczona jako do-not-use w aktualnym kontekście. Wybierz inną ścieżkę albo przebuduj kontekst.",
    };
  }

  if (codes.has("out-of-scope-edit")) {
    return {
      en: "Blocked: this edit is outside the current context. Run `krn context` or add this path to the task scope.",
      pl: "Zablokowano: ta zmiana jest poza aktualnym kontekstem. Uruchom `krn context` albo dodaj tę ścieżkę do zakresu zadania.",
    };
  }

  if (codes.has("context-stop-active")) {
    return {
      en: "STOP is active in the current context. Resolve the missing context before editing.",
      pl: "STOP jest aktywny w aktualnym kontekście. Uzupełnij brakujący kontekst przed edycją.",
    };
  }

  if (codes.has("missing-task-contract") && codes.has("missing-context-package")) {
    return {
      en: 'Current task and context are missing. Run `krn start "<task>"`, then run `krn context`.',
      pl: 'Brakuje aktualnego zadania i kontekstu. Uruchom `krn start "<zadanie>"`, potem `krn context`.',
    };
  }

  if (codes.has("missing-task-contract")) {
    return {
      en: 'Current task is missing. Run `krn start "<task>"` first.',
      pl: 'Brakuje aktualnego zadania. Najpierw uruchom `krn start "<zadanie>"`.',
    };
  }

  if (codes.has("missing-context-package")) {
    return {
      en: "Current context is missing. Run `krn context` before editing or stopping.",
      pl: "Brakuje aktualnego kontekstu. Uruchom `krn context` przed edycją albo końcowym Stop.",
    };
  }

  if (codes.has("proof-path-exception")) {
    return {
      en: "Warning: allowed as an owned proof path. Review it before handoff.",
      pl: "Ostrzeżenie: dozwolone jako owned proof path. Sprawdź to przed handoffem.",
    };
  }

  if (codes.has("pre-compact-run-result-missing") || codes.has("pre-compact-report-missing")) {
    return {
      en: "Warning: compacting before run/report evidence is current. Run `krn run --bundle` or refresh report artifacts.",
      pl: "Ostrzeżenie: kompakcja przed aktualnym run/report evidence. Uruchom `krn run --bundle` albo odśwież artefakty report.",
    };
  }

  if (codes.has("post-compact-context-refresh-needed")) {
    return {
      en: "Warning: context should be refreshed after compaction before more edits.",
      pl: "Ostrzeżenie: po kompakcji odśwież kontekst przed kolejnymi edycjami.",
    };
  }

  if (codes.has("invalid-hook-payload")) {
    return {
      en: "Warning: hook input was not valid JSON. Send valid JSON or omit stdin.",
      pl: "Ostrzeżenie: wejście hooka nie było poprawnym JSON. Przekaż poprawny JSON albo pomiń stdin.",
    };
  }

  return decision === "block"
    ? {
        en: "Blocked by P0 hook guardrails. Check findings and current KRN artifacts.",
        pl: "Zablokowano przez guardrails P0. Sprawdź findings i aktualne artefakty KRN.",
      }
    : {
        en: "Warning from P0 hook guardrails. Check findings before continuing.",
        pl: "Ostrzeżenie z guardrails P0. Sprawdź findings przed kontynuacją.",
      };
}

export function operatorGuidanceFor(
  decision: HookDecision,
  supported: boolean,
  findings: HookGuardrailFinding[],
): Pick<HookResult, "userFacingMessage" | "remediationCodes" | "remediationHints"> {
  const remediationCodes = remediationCodesForFindings(findings);

  return {
    userFacingMessage: operatorMessageFor(decision, supported, findings),
    remediationCodes,
    remediationHints: remediationHintsForCodes(remediationCodes),
  };
}
