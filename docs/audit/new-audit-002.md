Masz rację — jeśli KRN ma realnie zmienić codzienną pracę, to nie może być tylko “proof bundle po robocie”. Musi stać się **warstwą roboczą nad Codexem**: pamięć, decyzje, taski, statusy, delegowanie, proof, frontend/visual feedback, backlog, codzienne rytuały. Ale trzeba to zrobić w dobrej kolejności, bo inaczej zrobicie kolejny dashboard-slop.

Najkrócej:

```text
Codex = wykonawca i eksplorator
KRN = system operacyjny pracy z Codexem
Dashboard = kokpit tego systemu, ale dopiero gdy dane/kontrakty są stabilne
Memory = zatwierdzona pamięć operacyjna, nie “to, co model sobie zapamiętał”
```

I tu jest realna różnica.

---

# 1. Co Codex realnie ogarnia, a czego nie

Codex natywnie ma coraz więcej rzeczy: `AGENTS.md`, memories, skills, hooks, subagents, workflows, app/CLI/IDE. Oficjalne docs mówią, że Codex działa najlepiej, gdy traktujesz go jak teammate’a z explicit context i jasną definicją “done”; workflow examples mają też context notes i verification. ([OpenAI Developerzy][1])

Ale to nadal nie rozwiązuje warstwy zarządzania pracą.

## Codex ogarnia

```text
- pisanie kodu,
- czytanie repo,
- naprawianie bugów,
- refactor,
- generowanie UI z opisu/screenshotu,
- lokalne iteracje,
- /review,
- subagents, jeśli jawnie poprosisz,
- memories jako pomocniczy recall,
- skills jako procedury.
```

## Codex nie ogarnia dobrze sam z siebie

```text
- co jest prawdą projektową,
- co jest tylko pamięcią z poprzedniej sesji,
- co jest decyzją architektoniczną,
- co jest stale / deprecated,
- czy local proof nie został overclaimowany,
- czy pamięć nie jest błędna,
- czy task nie rozjechał scope,
- czy frontend wygląda dobrze wizualnie,
- czy daily work idzie w dobrym kierunku,
- który agent/subagent ma dostać które zadanie,
- czy wiele projektów ma spójne standardy,
- czy powtarzamy te same błędy co tydzień.
```

I dokładnie te rzeczy powinien rozwiązywać KRN.

---

# 2. KRN jako “daily operating layer”, nie tylko harness

Docelowo KRN powinien mieć trzy poziomy:

```text
1. Engineering proof layer
   contract -> context -> verify -> review -> run-result -> bundle

2. Work operating layer
   tasks -> memory -> decisions -> project state -> daily board -> delegation

3. Visual workbench
   local/static dashboard -> project cockpit -> frontend/design evidence -> agent runs
```

Dzisiaj repo jest głównie na poziomie 1. Memory już istnieje jako zalążek poziomu 2. Dashboard jest świadomie zablokowany jako produkt, ale repo ma już `operator-summary` i `operator-report.html`, czyli zalążek poziomu 3. Aktualny `operator-console.md` mówi jasno: dziś jest artifact-first, bez frontend frameworka, serwera, bazy, hostingu ani dashboardu; przyszłe dashboard-lite może konsumować `operator-summary.json`, ale nie jest aktualnym product layer.

Moja rekomendacja: **tak, KRN docelowo powinien mieć dashboard / visual workbench. Ale nie teraz jako server/dashboard-first. Najpierw local static cockpit z istniejących artefaktów.**

---

# 3. Jak memory wygląda już teraz

KRN memory jest zdrowo zaprojektowane na P0, bo nie udaje automatycznej prawdy.

Aktualnie są trzy lokalne store’y:

```text
.krn/memory/pending.json
.krn/memory/approved.json
.krn/memory/deprecated.json
```

Rekord ma między innymi `id`, `summary`, `status`, opcjonalne `evidencePath`, daty, `approvedAt`, `deprecatedAt`, `deprecationReason` i `source: manual`. Workflow jest ręczny: `propose`, `approve`, `deprecate`, `list`.

CLI to już obsługuje:

```bash
krn memory list
krn memory propose "<summary>" [--evidence <path>]
krn memory approve <memory_id>
krn memory deprecate <memory_id> [reason]
```

Kod faktycznie przenosi rekordy między pending/approved/deprecated i emituje trace eventy dla operacji memory.

Najważniejsza rzecz: **approved memory nie wchodzi do kontekstu jako “must-read truth”.** Obecnie context builder dodaje approved memory tylko jako `reference-only`, tylko gdy task jawnie prosi o pamięć albo memory pasuje do taska; opt-out typu “bez pamięci” / “nie używaj pamięci” blokuje użycie pamięci.

To jest dokładnie właściwe.

---

# 4. Codex memory vs KRN memory

OpenAI docs mówią, że Codex memories pozwalają przenosić useful context z wcześniejszych threadów do przyszłej pracy: preferencje, recurring workflows, tech stack, conventions, pitfalls. Ale docs mówią też, żeby wymagane team guidance trzymać w `AGENTS.md` albo checked-in docs, a memories traktować jako helpful local recall layer, nie jedyne źródło reguł. ([OpenAI Developerzy][2])

Dodatkowo Codex stores memories pod `~/.codex/memories/` i docs mówią, żeby traktować te pliki jako generated state, które można inspectować, ale nie używać ręcznej edycji jako primary control surface. ([OpenAI Developerzy][2])

Czyli:

```text
Codex memory:
  - prywatna / lokalna dla Codexa,
  - model-generated,
  - dobra do preferencji i recall,
  - niekanoniczna,
  - trudna do audytu projektowego.

KRN memory:
  - repo/runtime-scoped,
  - ręcznie zatwierdzana,
  - evidence-backed,
  - widoczna w artifactach,
  - może wejść do context-package,
  - może być zdeprecjonowana,
  - nie jest canon bez review.
```

Najważniejsza zasada:

```text
Codex remembers.
KRN decides what is allowed to matter.
```

---

# 5. Jak memory pomoże daily usage

## 5.1. Dziś rano zaczynasz pracę

Bez KRN:

```text
- odpalasz Codex,
- przypominasz mu kontekst,
- przypominasz konwencje,
- przypominasz czego nie robić,
- przypominasz poprzednie błędy,
- potem i tak musisz sam pilnować overclaimów.
```

Z KRN docelowo:

```text
KRN daily view pokazuje:
  - aktywne targety/projekty,
  - ostatnie runy,
  - pending memory do zatwierdzenia,
  - approved memory relevant to current project,
  - open blockers,
  - proof gaps,
  - zadania gotowe do delegowania Codexowi,
  - ostatnie failed review findings,
  - najważniejsze decisions/spec/ADR changed.
```

Dzisiaj CLI-owo można to robić tak:

```bash
pnpm --silent krn memory list
pnpm --silent krn summary --write
pnpm --silent krn report --write
```

Docelowo dashboard pokaże to bez grzebania w JSON.

---

## 5.2. Po każdym runie nie tracisz wiedzy

Przykład: Codex zrobił pracę w Python target i znowu pojawił się problem z verify allowlist.

Zamiast trzymać to w głowie:

```bash
pnpm --silent krn memory propose \
  "Python targets often need target-owned tools/*.py wrappers because v0.1 verify allowlist rejects native pytest or shell quality gates." \
  --evidence docs/product/adoption-friction-register.md
```

Potem:

```bash
pnpm --silent krn memory approve <memory_id>
```

Od tego momentu KRN może tę wiedzę podsunąć jako `reference-only` przy podobnym tasku.

To rozwiązuje codzienny problem:

```text
“Znowu tłumaczę Codexowi to samo”
```

ale bez robienia z memory automatycznej prawdy.

---

## 5.3. Przy nowym projekcie KRN pomaga zrobić onboarding

Dla nowej aplikacji / nowego pomysłu:

```text
1. KRN target preflight
2. krn.config.json
3. runtime dir decision
4. target validation command
5. task-spec for first slice
6. Codex implementation
7. KRN run
8. memory proposal from friction
9. dashboard shows project state
```

Codex może wygenerować appkę, frontend, backend, testy. KRN ma pilnować:

```text
- czy task był scoped,
- czy expected files się zgadzały,
- czy validation realnie poszła,
- czy memory z podobnych projektów jest tylko reference,
- czy nie overclaimujemy production,
- czy wynik nadaje się do decyzji.
```

---

## 5.4. Przy frontendzie / stronach

OpenAI workflow docs mają przykłady prototype from screenshot i live UI iteration: screenshot jako visual requirement, constraints typu React/Vite/Tailwind/TypeScript, potem dev server i browser review. Docs podkreślają, że obraz daje wymagania wizualne, ale trzeba dopisać constraints i zachowania, oraz że w live UI loop warto iterować małymi promptami i reviewować w browserze. ([OpenAI Developerzy][1])

KRN nie powinien od razu budować browser automation layer, ale powinien wspierać frontend workflow tak:

```text
Frontend task:
  - screenshot/design reference
  - route/page/component scope
  - expected touched files
  - visual acceptance notes
  - responsive/accessibility checklist
  - target validation command
  - optional manual visual review artifact
```

Docelowy KRN dashboard dla frontendu powinien pokazać:

```text
- task: “landing page hero redesign”
- route: /landing
- dev URL: http://localhost:5173/landing
- files changed
- visual checklist
- lint/typecheck/test status
- manual visual review: pending/pass/fail
- screenshots/appshots if available later
- notes for next Codex iteration
```

Ale znów: **to nie musi być od razu Playwright/browser evidence layer**. Najpierw visual acceptance jako artifact + manual checkbox + route/dev URL. Browser automation później.

---

# 6. Co powinno być w dashboardzie docelowo

Tak — docelowo widziałbym **KRN Workbench**. Nie “dashboard-first product”, tylko lokalny kokpit pracy z Codexem.

## 6.1. Główne panele

```text
1. Daily Board
   - dzisiejsze taski
   - aktywne projekty
   - ostatnie runy
   - blockers
   - pending approvals

2. Task Builder
   - prompt
   - expectedTouchedFiles
   - forbiddenTouchedFiles
   - requiredDoNotUsePaths
   - validation command
   - no-push/no-merge boundary
   - frontend visual acceptance

3. Run Board
   - status: planned/ran/verified/blocked/failed
   - verify status
   - review status
   - productionProof false/true
   - hookTrust status
   - bundle link

4. Memory Board
   - pending memory
   - approved memory
   - deprecated memory
   - evidencePath
   - approve/deprecate workflow
   - memory used in current context

5. Project Map
   - target repos
   - runtime dir
   - config profile
   - validation gate
   - last proof class
   - adoption friction

6. Agent Delegation Board
   - Codex main task
   - optional subagent tasks
   - status per branch/worktree
   - what each agent is allowed to do
   - what proof is required

7. Frontend / Visual Board
   - pages/routes/components
   - screenshot references
   - dev URLs
   - manual visual checks
   - accessibility/performance notes

8. Decision Ledger
   - active canon/spec/ADR
   - proposed canon updates
   - knowledge condensation proposals
   - repeated friction -> proposed ADR/spec
```

## 6.2. Dashboard graph

```text
KRN artifacts
  -> operator-summary.json
  -> operator-report.json/html
  -> future local workbench

Memory stores
  -> memory board

Run-result
  -> run board

Task-spec
  -> task builder

Context-package
  -> context/memory view

Review-result
  -> blockers and anti-overclaim view

Target configs
  -> project map
```

Najważniejsza zasada dashboardu:

```text
Dashboard reads artifacts.
Dashboard does not become source of truth.
Dashboard does not run Codex.
Dashboard does not execute verify.
Dashboard does not infer production readiness.
```

To jest już zgodne z obecnym `operator-console.md`: summary/report mogą agregować istniejące local artifacts, ale nie mogą stać się drugim source of truth, uruchamiać Codexa, wykonywać verify commands, inspectować protected contents ani inferować production readiness.

---

# 7. Czy dashboard jest sprzeczny z wcześniejszym “no dashboard”?

Nie, jeśli rozdzielimy trzy rzeczy.

## Zakazane teraz

```text
dashboard-first product
hosted dashboard
server/database/auth
dashboard jako centrum produktu
dashboard, który uruchamia Codexa
dashboard, który zmienia source of truth
```

## Dozwolone teraz / blisko

```text
static local operator report
operator-summary.json
operator-report.html
read-only artifact viewer
memory board z lokalnych JSON
```

## Docelowo dozwolone

```text
local KRN Workbench
read-only first
artifact-backed
no production claims
opcjonalny local server dopiero gdy static HTML przestanie wystarczać
```

Czyli nie “nigdy dashboard”.
Raczej:

```text
Nie buduj dashboardu, zanim nie wiesz, jakie dane są prawdziwe.
```

---

# 8. Delegowanie agentów do projektów

Codex subagents są realne, ale trzeba uważać. OpenAI docs mówią, że Codex może spawnować specialized agents równolegle i zbierać wyniki, ale robi to tylko gdy jawnie poprosisz; każdy subagent wykonuje własną pracę model/tool i zużywa więcej tokenów. Subagents dziedziczą sandbox i approval controls. ([OpenAI Developerzy][3])

Więc KRN nie powinien teraz budować własnego multi-agent swarm. Ale powinien przygotować **delegation contracts**.

Przykład:

```text
Main Codex task:
  Implement checkout validation fix.

Subagent A:
  Read-only security review. No edits. Output findings with file paths.

Subagent B:
  Read-only frontend consistency review. No edits. Output UI risks.

Subagent C:
  Test flakiness review. No edits. Output suspected flaky tests.

KRN:
  collects outputs
  stores them as review inputs
  does deterministic review
  does not trust subagent claims as proof
```

Dashboard może pokazywać:

```text
Agent / Role / Status / Allowed actions / Output artifact / Trust level
```

Ale proof nadal idzie przez:

```text
verify-result
review-result
run-result
```

---

# 9. AGENTS.md, skills, memory — kto za co odpowiada

OpenAI docs mówią, że Codex czyta `AGENTS.md` przed pracą i buduje instruction chain: global scope z `~/.codex`, potem project scope od root do current dir, a bliższe pliki nadpisują wcześniejsze; Codex zatrzymuje dodawanie instrukcji po limicie `project_doc_max_bytes`, domyślnie 32 KiB. ([OpenAI Developerzy][4])

Skills używają progressive disclosure: Codex widzi najpierw name/description/path, a pełny `SKILL.md` ładuje dopiero gdy zdecyduje się użyć skill. ([OpenAI Developerzy][5])

To daje bardzo dobry podział:

| Warstwa       | Do czego                           | Czego nie trzymać                          |
| ------------- | ---------------------------------- | ------------------------------------------ |
| `AGENTS.md`   | krótkie, always-on zasady          | długich procedur, historii, researchu      |
| Skills        | workflow-specific procedury        | projektowej prawdy i memory                |
| KRN memory    | zatwierdzone obserwacje z evidence | sekretów, raw traces, automatycznej prawdy |
| Docs/spec/ADR | canonical truth                    | ephemeral notes                            |
| Run artifacts | aktualny dowód                     | długoterminowej polityki                   |
| Dashboard     | widok i operowanie na artifactach  | source of truth                            |

Czyli KRN ma ogarniać to, czego Codex nie umie rozdzielić sam:

```text
rule vs memory vs evidence vs suggestion vs deprecated knowledge
```

---

# 10. Daily workflow, realnie

## 10.1. Rano: orientacja

```bash
pnpm --silent krn memory list
pnpm --silent krn summary --write
pnpm --silent krn report --write
```

W przyszłości dashboard:

```text
Daily:
  - 3 pending memories
  - 2 blocked runs
  - 1 verified target proof
  - 1 config adoption pending
  - 4 tasks ready for Codex
  - 1 proof overclaim warning
```

## 10.2. Nowe zadanie

Tworzysz task spec:

```json
{
  "prompt": "Implement responsive pricing section for the landing page. Keep the existing design language. Do not push or merge.",
  "expectedTouchedFiles": [
    "src/pages/Landing.tsx",
    "src/components/PricingSection.tsx"
  ],
  "forbiddenTouchedFiles": [
    ".env",
    ".env.local"
  ],
  "requiredDoNotUsePaths": [
    ".env",
    ".env.*",
    "client-documents/",
    "uploads/"
  ]
}
```

Potem Codex:

```text
Read .krn/local/task.json.
Use approved KRN memory only if it appears in context-package as reference-only.
Implement the minimal change.
Run:
pnpm --silent krn run --task-spec .krn/local/task.json --execute-verify --bundle
Do not claim production readiness.
Do not push.
```

## 10.3. Po pracy Codexa

Czytasz run-result:

```text
verified?
blocked?
failed?
verify executed?
review pass?
memory used?
protected path?
productionProof false?
hookTrust unproven?
```

Jeśli blocked:

```text
Codex, fix only these KRN blockers:
...
rerun KRN.
```

## 10.4. Po zakończeniu

Jeśli pojawił się nowy wzorzec:

```bash
pnpm --silent krn memory propose \
  "Landing page tasks should include route URL and manual visual acceptance notes before KRN claims frontend proof." \
  --evidence .krn/current/review-result.json
```

Potem ręcznie approve, jeśli to rzeczywiście ma wartość.

---

# 11. Daily workflow dla typów pracy

## 11.1. Nowa aplikacja / startup idea

KRN pomaga tak:

```text
Idea
  -> task-spec: product slice
  -> Codex builds thin vertical prototype
  -> KRN verifies local gate
  -> memory records architecture decisions
  -> dashboard shows app progress
  -> next slice
```

Najważniejsze panele dashboardu:

```text
- product assumptions
- active vertical slices
- architecture decisions
- target validation
- blockers
- next Codex tasks
```

KRN nie robi product management magic, ale robi coś bardzo praktycznego: nie pozwala, żeby szybki vibe-prototype zamienił się w nieaudytowalny chaos.

## 11.2. Frontend / strony

KRN pomaga tak:

```text
Design intent
  -> visual task spec
  -> Codex builds UI
  -> local dev review
  -> lint/typecheck/test
  -> manual visual check artifact
  -> memory: design/system patterns
```

Dashboard powinien pokazywać:

```text
- route/page/component
- screenshot/reference
- responsive checklist
- design tokens touched
- manual visual status
- accessibility notes
- before/after screenshot later
```

## 11.3. Refactor / engineering

```text
Refactor intent
  -> expected files / forbidden files
  -> graph/context
  -> Codex patch
  -> tests
  -> review for scope creep
  -> memory if pattern repeats
```

## 11.4. Bugfix

```text
Repro
  -> task spec
  -> Codex reproduces/fixes
  -> verify reruns minimal test
  -> review checks regression evidence
  -> memory if bug class repeats
```

## 11.5. Multi-project work

```text
Project A:
  last run verified, memory pending

Project B:
  runtime dir collision, needs .krn-harness

Project C:
  frontend manual visual review pending

Project D:
  verify blocked by target-native command
```

To jest miejsce, gdzie dashboard stanie się naprawdę wartościowy.

---

# 12. Co dokładnie KRN powinien “pamiętać”

## Dobre memory

```text
- “This repo uses .krn-harness because .krn is product-owned.”
- “For Python targets, prefer target-owned tools/*.py wrapper until validation contract v0 is implemented.”
- “Config adoption proof is not product-code proof.”
- “Frontend tasks need route URL + manual visual check.”
- “Do not treat Codex hook bypass runs as hook trust proof.”
- “If full suite fails but target fast gate passes, mark proof as limited.”
- “For this target, run python3 tools/check_all_readonly.py.”
```

## Złe memory

```text
- “This app is production ready.”
- “Hooks work.”
- “Use secrets from .env.”
- “Always ignore failing tests.”
- “Codex said this pattern is best.”
- “Client X wanted Y” without evidence and privacy boundary.
```

---

# 13. Memory board jako serce daily usage

Dashboard memory board powinien mieć cztery stany:

```text
Pending:
  proposed but not active

Approved:
  may appear in context as reference-only

Used in current run:
  memory actually surfaced into context-package

Deprecated:
  no longer active, with reason
```

I widok:

```text
Memory ID
Summary
Type
Scope
Evidence path
Approved at
Last used in run
Conflicts?
Deprecate / approve action
```

Docelowo memory powinno mieć dodatkowe pola:

```json
{
  "id": "mem_...",
  "type": "target_validation_pattern",
  "scope": "target-repo",
  "summary": "...",
  "evidencePath": "...",
  "status": "approved",
  "approvedAt": "...",
  "tags": ["python", "verify", "target-gate"],
  "supersedes": [],
  "reviewAfter": "2026-08-01"
}
```

Ale nie dodawałbym wszystkiego naraz. Najpierw `type`, `scope`, `evidencePath required for approval`, `lastUsed`.

---

# 14. Knowledge condensation: z memory do canon

KRN już ma dobry model w `knowledge-condensation.md`: evidence może stać się note, ledger entry, ADR, spec, README status albo code rule/test; nie ma automatycznego update active truth.

Docelowy flow:

```text
Repeated memory:
  “Python wrapper friction repeated 3 times”
        |
        v
condensation proposal:
  “We need target-validation-contract v0”
        |
        v
ADR/spec
        |
        v
tests
        |
        v
active truth
```

To jest to, czego Codex sam nie zrobi bezpiecznie. Codex może zauważyć pattern, ale KRN powinien wymagać:

```text
- evidence,
- repeated occurrence,
- operator approval,
- canonical destination.
```

---

# 15. Najważniejszy design: KRN ma być “workbench”, ale nie teraz “platforma”

Widzę docelowy produkt tak:

```text
KRN Workbench
  local-first
  artifact-backed
  Codex-first
  memory-aware
  visual enough for daily work
  strict enough for engineering proof
```

## Etap 1 — teraz

```text
CLI + artifacts:
  krn run
  krn memory
  krn summary
  krn report
```

## Etap 2 — static dashboard-lite

```text
krn report --dashboard
albo
krn summary --html

Czyta:
  run-result
  review-result
  verify-result
  memory stores
  adoption friction
  target configs

Nie ma:
  servera
  bazy
  auth
  wykonywania komend
```

## Etap 3 — local workbench

```text
local server only
read/write only safe KRN artifacts
task builder
memory approval UI
project board
run board
frontend visual acceptance board
```

## Etap 4 — delegated workbench

```text
Codex app/CLI integration
subagent delegation contracts
worktree status
proof ledger
manual approvals
```

## Etap 5 — maybe MCP / remote / team

Dopiero gdy:

```text
- contracts stabilne,
- local dashboard używany codziennie,
- proof taxonomy działa,
- memory governance działa,
- real target repeats istnieją.
```

---

# 16. Jak to wpływa na “całą pracę z Codexem”

Docelowo KRN powinien zmienić codzienność tak:

## Przed KRN

```text
Codex thread 1:
  zrób landing page

Codex thread 2:
  napraw bug

Codex thread 3:
  pamiętasz, że u nas nie wolno...?

Codex thread 4:
  kurde znowu dotknął złych plików

Operator:
  trzyma kontekst w głowie
  ręcznie sprawdza proof
  ręcznie pamięta decyzje
  ręcznie pilnuje projektu
```

## Po KRN

```text
KRN:
  pamięta zatwierdzone wzorce
  pokazuje pending decisions
  buduje task spec
  ogranicza context
  uruchamia verify
  robi review closeout
  pokazuje dashboard
  pilnuje proof classes
  ułatwia delegowanie Codexowi

Codex:
  robi implementację, eksplorację, UI, refactor, bugfix

Operator:
  decyduje, zatwierdza, wybiera kierunek
```

To jest duża zmiana.

Nie “AI robi wszystko”.
Raczej:

```text
AI robi więcej,
ale KRN sprawia, że ty mniej trzymasz w głowie.
```

---

# 17. Co powinno być następnym ruchem

Po `$review` i target validation contract dodałbym goal stricte pod daily usage:

## `/goal: KRN Daily Work Model v0`

**Cel:**
Zdefiniować, jak operator codziennie używa KRN z Codexem dla engineering, frontend i project work.

**Minimalny zakres:**
Docs/spec only + fixture artifacts. Nie budować dashboardu jeszcze.

**Acceptance criteria:**

```text
- daily workflow opisany dla:
  - bugfix
  - frontend page
  - new app slice
  - review-only task
  - target adoption
- memory touchpoints opisane:
  - when propose
  - when approve
  - when deprecate
  - when opt out
- dashboard-lite data inputs opisane:
  - run-result
  - review-result
  - memory stores
  - operator-summary
- no dashboard server
```

**Proof artifact:**

```text
docs/product/daily-work-model.md
docs/product/dashboard-lite-contract.md
fixtures/tasks/frontend-visual-task.json
fixtures/tasks/new-app-slice-task.json
```

**Nie wolno:**

```text
- implementować UI,
- dodawać servera,
- dodawać bazy,
- dodawać MCP,
- dodawać subagent runtime,
- auto-approve memory.
```

Potem dopiero:

## `/goal: Memory Governance v1`

```text
- add memory type
- add memory scope
- require evidencePath for approval or warn hard
- surface usedMemory in run-result
- add tests:
  approved memory -> reference-only
  deprecated memory -> never surfaced
  opt-out -> no memory surfaced
```

Potem:

## `/goal: Static Workbench Prototype`

```text
- single static local HTML
- reads operator-summary.json + memory stores + run-result
- no server
- no JS dependencies if avoidable
- no mutation
```

---

# 18. Brutalnie: co jest prawdziwym produktem?

Nie `krn run`.

Nie memory.

Nie dashboard.

Prawdziwym produktem ma być:

```text
Codex work cockpit with governed memory and proof.
```

Czyli:

```text
1. Wiem, co robię dzisiaj.
2. Wiem, co Codex robił.
3. Wiem, co Codex może pamiętać.
4. Wiem, co jest zatwierdzoną decyzją.
5. Wiem, co jest tylko obserwacją.
6. Wiem, jakie zadania mogę delegować.
7. Wiem, które proofy są lokalne.
8. Wiem, gdzie frontend wymaga manual visual review.
9. Wiem, co jest blocked.
10. Wiem, co mam zrobić dalej.
```

Jeżeli KRN da Ci to w codziennej pracy, to ma sens jako przełomowe narzędzie.

Jeżeli zostanie przy “wygenerujmy bundle po tasku”, to będzie tylko porządny harness, nie system pracy.

---

# 19. Mój docelowy obraz

```text
Rano:
  otwierasz KRN Workbench

Widzisz:
  - projekty
  - taski
  - pamięć
  - decyzje
  - runy
  - blockers
  - proof gaps
  - frontend pages do review
  - agent delegation candidates

Wybierasz task:
  KRN buduje task spec

Codex robi:
  implementację / UI / bugfix / exploration

KRN robi:
  verify / review / memory proposal / proof

Ty robisz:
  approve / reject / iterate / commit / delegate
```

To jest dobry kierunek.

Ale kolejność musi być taka:

```text
proof first
memory governance second
daily model third
static dashboard fourth
delegation fifth
```

Nie:

```text
dashboard first
agent swarm second
memory magic third
proof later
```

Bo wtedy będzie dokładnie ten slop, którego chcesz uniknąć.

[1]: https://developers.openai.com/codex/workflows "Workflows – Codex | OpenAI Developers"
[2]: https://developers.openai.com/codex/memories "Memories – Codex | OpenAI Developers"
[3]: https://developers.openai.com/codex/subagents "Subagents – Codex | OpenAI Developers"
[4]: https://developers.openai.com/codex/guides/agents-md "Custom instructions with AGENTS.md – Codex | OpenAI Developers"
[5]: https://developers.openai.com/codex/skills "Agent Skills – Codex | OpenAI Developers"
