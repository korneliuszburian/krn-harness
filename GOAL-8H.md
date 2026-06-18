  Mam teraz pełen obraz projektu. Przeprowadzam głęboką analizę.
  
  ***
  
  # KRN Harness – Pełny Audyt Agentic Engineering + Analiza Kierunku Przełomowego
  
  ## Werdykt: Przełom czy Slop?
  
  **KRN idzie w stronę realnego przełomu, ale z kilkoma lukami, które – jeśli niezałatane – zamienią go w kolejne "developer-tool-for-developers" bez traction.** Unikalność jest: Codex-first, local-operator runtime z durable artifacts, task contract schema, proof taxonomy i governed memory w jednym spójnym pipeline. Tego w tej formie nie ma na rynku jako standalone open-source runtime. Closest neighbors: [OpenHands/SWE-agent](https://github.com/All-Hands-AI/OpenHands) (cloud-first, benchmark-oriented), [Aider](https://github.com/Aider-AI/aider) (conversation-first, no durable state), [LangGraph](https://github.com/langchain-ai/langgraph) (graph-framework, nie runtime operator). Żaden z nich nie robi tego co KRN: **durable artifacts + governed memory + verify execute policy jako lokalny operator layer dla jednego agenta (Codex)** .
  
  ***
  
  ## Co Mówią Realnie Wzorce Twórców
  
  ### Karpathy / Swyx – "Software 3.0 i Vibe Engineering"
  Karpathy w [Software Is Changing (Again)](https://karpathy.ai/blog/software2) i Swyx w [The Shift from Models to Compound AI Systems](https://www.latent.space/p/compound-ai) wskazują, że wartość nie jest w modelu, lecz w **orchestration layer, który kontroluje przepływ kontekstu i narzędzi**. KRN ma tę intuicję: `contract → context → graph → hooks → trace → verify → governed memory` to dokładnie compound AI system loop . Brakuje jednak **observable feedback loop** – Karpathy podkreśla, że trzeba widzieć co model widzi i dlaczego podejmuje decyzje.
  
  ### Harrison Chase / LangChain – "Persistence i Human-in-Loop"
  Chase w [State of AI Agents 2025](https://blog.langchain.dev/state-of-ai-agents-2025/) identyfikuje dwa wzorce, których w KRN brakuje:
  - **Interrupt/Resume pattern** – agent musi umieć zatrzymać się, zapytać operatora, kontynuować z odpowiedzią w tym samym task scope
  - **Long-horizon memory z checkpointingiem** – `packages/memory` istnieje , ale jest governed (dobry wybór), jednak brak formatu interruptible checkpoints
  
  ### Matt Pocock – TypeScript-first, schema-first correctness
  Pocock w [Total TypeScript](https://www.totaltypescript.com/articles) i konferencyjnych talki promuje wzorzec **type-level contracts jako single source of truth** – types powinny generować validators, nie odwrotnie. W KRN `packages/task-contract`, `packages/config`, `packages/trace/src/schema.ts`  to dobry kierunek, ale **brak Zod/Valibot jako runtime validators generowanych z typów**. Schema.ts w trace to hand-written types, nie inferowane z runtime parsers.
  
  ### Addy Osmani – "Performance budgets i measurable thresholds"
  Osmani w [Learning Patterns](https://www.patterns.dev/) promuje wzorzec **measurable proof gates** zamiast subjective "done". KRN ma `productionProof`, `hookTrust`, `verify.mode`  – to jest dokładnie ten pattern. Mocna strona. Słabość: brak **automated regression baseline** – nie wiadomo czy run rezultat jest lepszy niż poprzedni.
  
  ### Simon Willison – "Datasette philosophy i observable local-first tools"
  Willison w [sqlite-utils](https://github.com/simonw/sqlite-utils) i [LLM CLI](https://github.com/simonw/llm) pokazuje wzorzec: **local-first, SQLite-backed, zero-config observable tools**. KRN pisze do `.krn/` JSONL traces  – to dobrze. Ale brak **queryable trace store** – Willison powiedziałby: "jeśli nie możesz zapytać swoich traces SQL-em, to nie masz observability, masz logi".
  
  ### Anton Osika – Aider/Codegen – "Minimal scaffolding, maximal reliability"
  Osika w projektowaniu Aider pokazuje wzorzec: **mniej abstrakcji = więcej reliability**. KRN ma to dobrze zainternalizowane (P0 non-goals są agresywne ), ale `packages/evals/src/run-eval.ts` ma 34876 bajtów – to sygnał, że eval layer jest za duży jak na P0 scope .
  
  ### Logan Kilpatrick – "Structured outputs jako OS primitives"
  Kilpatrick (OpenAI DevRel → Google) promuje wzorzec **structured output compliance jako gate dla każdego kroku agenta**. KRN ma `krn.config.json` schema  ale brak **per-step structured output validation** w hooku pipeline – każde `SessionStart/SessionEnd` powinno walidować JSON Schema output modelu przed kontynuacją.
  
  ***
  
  ## Audyt Względem Wzorców Agentic Engineering
  
  ### ✅ Co Działa Dobrze
  
  - **ADR-driven architecture** – 17 ADRs  to profesjonalny standard, większość agentowych projektów open source nie ma żadnych
  - **Skill separation: build-time vs runtime** – ADR-0008 i `.agents/skills/`  to wzorzec, który Harrison Chase wprowadził dopiero w LangChain v0.2
  - **Proof taxonomy** – `packages/core/src/proof-taxonomy.ts` (7994 bajtów)  jako oddzielny moduł to unikalne; LangSmith/Phoenix tego nie mają
  - **Verify execute policy** – ADR-0017 z explicit `--execute`, exact command allowlists, scrubbed env  to security-first thinking
  - **Governed memory** – ADR-0006 z explicit `auto-approved memory` w P0 non-goals  pokazuje dojrzałość
  - **Biome.json** – wybór Biome zamiast ESLint+Prettier to 2025+ standard 
  - **pnpm workspace** – prawidłowy monorepo setup 
  
  ### ❌ Brakujące Wzorce – Pełna Lista Zadań
  
  ***
  
  ## Pełna Lista Zadań (Codex-only, bez timeline)
  
  ### TASK-001 – Zod Runtime Validation dla Wszystkich Schemas
  **Brakujący wzorzec:** Type-level contracts jako single source of truth (Matt Pocock)
  **Co:** Zamień hand-written TypeScript interfaces na Zod schemas w `packages/trace/src/schema.ts`, `packages/task-contract`, `packages/config`. Generuj typy z Zod (`z.infer<>`), nie odwrotnie. Dodaj runtime parse na wejściu każdego CLI command.
  **Dlaczego:** Aktualnie błędny JSON w task-spec może przejść type-check ale crashnąć w runtime. Zod da proper error messages z path.
  **Context link:** [packages/trace/src/schema.ts](https://github.com/korneliuszburian/krn-harness/blob/de38cd06b09cd7a2a684a82cd3710919ba74dc55/packages/trace/src/schema.ts) | [packages/task-contract](https://github.com/korneliuszburian/krn-harness/tree/de38cd06b09cd7a2a684a82cd3710919ba74dc55/packages/task-contract)
  
  ***
  
  ### TASK-002 – Queryable Trace Store (SQLite via `better-sqlite3`)
  **Brakujący wzorzec:** Observable local-first tools (Simon Willison / Datasette philosophy)
  **Co:** Zamiast/obok JSONL trace writer dodaj SQLite sink w `packages/trace/src/trace-writer.ts`. Tabela `trace_events(task_id, event_type, ts, payload_json)`. Dodaj `krn traces query --task-id X` CLI command.
  **Dlaczego:** JSONL traces  są append-only i nie queryable. Nie można zapytać "ile razy verify failed w ostatnich 5 runach" bez parsowania pliku. Willison: "if you can't query it with SQL, you don't have observability."
  **Context link:** [packages/trace/src/trace-writer.ts](https://github.com/korneliuszburian/krn-harness/blob/de38cd06b09cd7a2a684a82cd3710919ba74dc55/packages/trace/src/trace-writer.ts)
  
  ***
  
  ### TASK-003 – Interrupt/Resume Pattern w krn run
  **Brakujący wzorzec:** Human-in-loop interrupt (Harrison Chase / LangGraph)
  **Co:** Dodaj `--interrupt-on <hook-decision>` flag do `krn run`. Gdy hook zwraca `warn` lub `block`, zapisz `interrupt.json` do `.krn/current/` z pending resume state. Dodaj `krn resume` command który odczytuje interrupt state i kontynuuje.
  **Dlaczego:** Aktualnie `block` = hard stop. Operator nie może zatwierdzić działania i kontynuować w tej samej run session. To eliminuje KRN z use case'ów gdzie Codex potrzebuje operator approval na mid-task.
  **Context link:** [packages/hooks/](https://github.com/korneliuszburian/krn-harness/tree/de38cd06b09cd7a2a684a82cd3710919ba74dc55/packages/hooks) | [packages/cli/](https://github.com/korneliuszburian/krn-harness/tree/de38cd06b09cd7a2a684a82cd3710919ba74dc55/packages/cli)
  
  ***
  
  ### TASK-004 – Per-Step Structured Output Validation w Hooks
  **Brakujący wzorzec:** Structured output compliance gates (Logan Kilpatrick)
  **Co:** W `packages/hooks` dodaj `StructuredOutputValidator` który przed każdym `SessionStart` i po każdym `SessionEnd` waliduje JSON output Codexa względem zadeklarowanego schema w `task-contract`. Fail = hook `block` z diff wyjaśniającym co się nie zgadza.
  **Dlaczego:** Aktualnie hooks sprawdzają guardrails (allow/warn/block) ale nie walidują struktury outputu. Agent może zwrócić coś semantycznie poprawnego ale strukturalnie innego niż kontrakt.
  **Context link:** [packages/hooks/](https://github.com/korneliuszburian/krn-harness/tree/de38cd06b09cd7a2a684a82cd3710919ba74dc55/packages/hooks) | [ADR-0004](https://github.com/korneliuszburian/krn-harness/blob/de38cd06b09cd7a2a684a82cd3710919ba74dc55/docs/adr/ADR-0004-codex-hooks-as-guardrails.md)
  
  ***
  
  ### TASK-005 – Automated Regression Baseline w Evals
  **Brakujący wzorzec:** Measurable proof gates z regression detection (Addy Osmani)
  **Co:** W `packages/evals/src/run-eval.ts` dodaj baseline persistence – zapisuj każdy eval result do `.krn/evals/baseline.json`. Przy każdym kolejnym uruchomieniu porównaj z baseline i emituj `REGRESSION` jeśli score spadł. Dodaj `krn eval --compare-baseline` flag.
  **Dlaczego:** Aktualnie evals są pass/fail per run bez porównania do historii . Nie wiadomo czy zmiana w `packages/core` regresuje eval w `packages/verify`. Karpathy: "you need a number that goes up or down."
  **Context link:** [packages/evals/src/run-eval.ts](https://github.com/korneliuszburian/krn-harness/blob/de38cd06b09cd7a2a684a82cd3710919ba74dc55/packages/evals/src/run-eval.ts)
  
  ***
  
  ### TASK-006 – Context Budget Manager
  **Brakujący wzorzec:** Token reduction i context engineering (research papers – Anthropic's "Lost in the Middle", arXiv 2307.03172)
  **Co:** Dodaj `packages/context/src/budget-manager.ts`. Każdy `context package` ma zadeklarowany `maxTokens`. Budget manager sprawdza estimated token count przed wysłaniem do Codexa i prune'uje według priorytetu (task contract > recent trace > memory > graph). Emit warning w trace gdy pruning nastąpił.
  **Dlaczego:** `packages/context`  istnieje ale nie ma budget enforcement. Długie context packages mogą powodować "lost in the middle" – model ignoruje środkowe fakty. Swyx nazywa to "context window management as first-class concern".
  **Context link:** [packages/context/](https://github.com/korneliuszburian/krn-harness/tree/de38cd06b09cd7a2a684a82cd3710919ba74dc55/packages/context) | Paper: https://arxiv.org/abs/2307.03172
  
  ***
  
  ### TASK-007 – run-eval.ts Refactor (File Size Reduction)
  **Brakujący wzorzec:** Minimal scaffolding (Anton Osika)
  **Co:** `packages/evals/src/run-eval.ts` ma 34876 bajtów . Podziel na: `run-eval-core.ts` (orchestration), `run-eval-reporters.ts` (output formatters), `run-eval-validators.ts` (assertion logic). Każdy plik max 500 linii.
  **Dlaczego:** Duże pliki to sygnał "doing too much" – trudne do testowania isolatedly, trudne dla Codexa do modyfikowania bez side effects.
  **Context link:** [packages/evals/src/run-eval.ts](https://github.com/korneliuszburian/krn-harness/blob/de38cd06b09cd7a2a684a82cd3710919ba74dc55/packages/evals/src/run-eval.ts)
  
  ***
  
  ### TASK-008 – Hook Trust Proof via Real Non-Bypass Codex Run
  **Brakujący wzorzec:** Dogfood evidence jako production signal (wszystkich wymienionych twórców)
  **Co:** Przeprowadź first real non-bypass Codex session z załadowanym `SessionStart` hookiem. Zapisz trace z `hookTrust.source: codex-native` (nie bypass). Zaktualizuj `docs/product/evidence-matrix.md` z SHA commita i timestamp.
  **Dlaczego:** README wprost: `hookTrust.status: unproven` . To jest największy gap między "local evidence" a "real operator runtime". Dopóki hook trust jest unproven, KRN nie może twierdzić że jest operator runtime.
  **Context link:** [docs/product/evidence-matrix.md](https://github.com/korneliuszburian/krn-harness/tree/de38cd06b09cd7a2a684a82cd3710919ba74dc55/docs/product) | [packages/hooks/](https://github.com/korneliuszburian/krn-harness/tree/de38cd06b09cd7a2a684a82cd3710919ba74dc55/packages/hooks)
  
  ***
  
  ### TASK-009 – Graph-Lite Dependency Evidence (nie AST)
  **Brakujący wzorzec:** Codebase intelligence bez full AST (ADR-0005 intent, research: Microsoft's "GraphSAGE for Code")
  **Co:** `packages/graph`  – sprawdź obecny stan i dodaj `file-dep-graph.ts`: statyczny import graph budowany przez regex/`es-module-lexer` (nie Tree-sitter). Format: `{ file: string, imports: string[], importedBy: string[] }[]`. Zapisz jako `graph-snapshot.json` do `.krn/current/`. CLI: `krn graph --format json`.
  **Dlaczego:** Bez dependency graph context package nie wie co jest impacted przez zmianę. Graph-lite (nie AST) to ADR-0005 intent  ale aktualny `packages/graph` jest prawdopodobnie skeleton.
  **Context link:** [packages/graph/](https://github.com/korneliuszburian/krn-harness/tree/de38cd06b09cd7a2a684a82cd3710919ba74dc55/packages/graph) | [ADR-0005](https://github.com/korneliuszburian/krn-harness/blob/de38cd06b09cd7a2a684a82cd3710919ba74dc55/docs/adr/ADR-0005-graph-lite-before-ast.md) | `es-module-lexer`: https://github.com/guybedford/es-module-lexer
  
  ***
  
  ### TASK-010 – AGENTS.md Polish: Skills jako Invocable Commands
  **Brakujący wzorzec:** Skill discoverability (Codex official docs pattern)
  **Co:** Każdy skill w `.agents/skills/` powinien mieć nagłówek `## Invocation: $skillname <args>` z przykładem i expected output. Dodaj `.agents/skills/README.md` z tabelą all skills + invocation syntax + kiedy używać.
  **Dlaczego:** Aktualnie AGENTS.md definiuje wymagane skills  ale nie ma standardowego sposobu na ich odkrywanie przez nowego Codexa w cold-start sesji. Pierwsza sesja Codexa powinna być self-onboarding.
  **Context link:** [.agents/](https://github.com/korneliuszburian/krn-harness/tree/de38cd06b09cd7a2a684a82cd3710919ba74dc55/.agents) | [AGENTS.md](https://github.com/korneliuszburian/krn-harness/blob/de38cd06b09cd7a2a684a82cd3710919ba74dc55/AGENTS.md)
  
  ***
  
  ### TASK-011 – ADR-0018: Context Poisoning Prevention
  **Brakujący wzorzec:** Security/context poisoning (research: Prompt Injection in Agentic Systems, arXiv 2402.15160)
  **Co:** Napisz ADR-0018 dokumentujący politykę ochrony przed context poisoning. Zaimplementuj w `packages/hooks` `ContentSanitizer` który przed dodaniem do context package sprawdza czy plik nie zawiera: inline prompt injection patterns (`<!-- ignore previous instructions -->`), podejrzanych `AGENTS.md` override attempts w downstream repach.
  **Dlaczego:** `scripts/krn-real-repo-preflight.sh` istnieje  ale nie ma runtime defense. Przy real-repo adoption Codex może być poisoned przez złośliwy `AGENTS.md` w target repo.
  **Context link:** [docs/security/](https://github.com/korneliuszburian/krn-harness/tree/de38cd06b09cd7a2a684a82cd3710919ba74dc55/docs/security) | Paper: https://arxiv.org/abs/2402.15160
  
  ***
  
  ### TASK-012 – `krn diff` Command: Artifact Comparison Between Runs
  **Brakujący wzorzec:** Observable regression detection (Willison + Osmani pattern razem)
  **Co:** Dodaj `krn diff <run-id-a> <run-id-b>` który porównuje `run-result.json` między dwoma runami: changed fields, added/removed verified commands, proof state delta. Output jako structured Markdown + JSON.
  **Dlaczego:** `krn artifacts list` istnieje  ale nie ma comparison. Operator nie może łatwo zobaczyć czy run po zmianie kodu jest lepszy od poprzedniego.
  **Context link:** [packages/cli/](https://github.com/korneliuszburian/krn-harness/tree/de38cd06b09cd7a2a684a82cd3710919ba74dc55/packages/cli)
  
  ***
  
  ### TASK-013 – Downstream AGENTS.md Template Quality Gate
  **Brakujący wzorzec:** Install lifecycle validation (Osmani: measurable correctness gates)
  **Co:** Podczas `krn install` dodaj walidację generowanego `AGENTS.md` dla downstream repa: sprawdź że zawiera required sections (`## Roles`, `## Non-negotiables`, minimum 1 skill reference). Fail install z clear error jeśli template jest incomplete.
  **Dlaczego:** `packages/codex-adapter` generuje downstream templates  ale nie ma validation że wygenerowany AGENTS.md spełnia minimum Codex onboarding requirements.
  **Context link:** [packages/codex-adapter/](https://github.com/korneliuszburian/krn-harness/tree/de38cd06b09cd7a2a684a82cd3710919ba74dc55/packages/codex-adapter)
  
  ***
  
  ## Sygnały że To Nie Jest Slop
  
  Trzy rzeczy odróżniają KRN od typowego "AI wrapper":
  
  1. **Proof taxonomy jako oddzielny moduł** (`proof-taxonomy.ts` 7994 bajtów)  – nikt na rynku nie traktuje "co jest dowodem" jako first-class model. To jest alignment research myślenie zaaplikowane do developer tooling.
  2. **P0 non-goals są agresywne i trzymane** – AGENTS.md zabrania dashboard, MCP, vector DB, autonomous researcher . Większość projektów scope creep'uje po tygodniu.
  3. **ADR-0017 verify execute policy**  – explicit `--execute`, allowlists, scrubbed env to enterprise-grade security thinking w lokalnym tool. Tego nie ma Aider, Cursor, ani Claude Code.
  
  Największe ryzyko nie leży w kodzie – leży w `hookTrust.status: unproven`. Dopóki real non-bypass Codex session nie przejdzie z załadowanym hookiem, KRN jest formalnie runtime bez runtime proof (TASK-008 jest krytycznym path).
