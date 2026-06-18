Tak. Napisałbym to jako **pełny strategiczny `/goal` + audyt produktu**, ale z jedną twardą korektą języka:

**Nie budujemy “idealnego produktu” w sensie: wszystko, dashboard, agenci, pamięć, wizualizacja, automatyzacje, MCP, vector, magia. Budujemy falsyfikowalny produkt, który ma szansę być przełomem, bo rozwiązuje realny brak w pracy z Codexem: brak lokalnego systemu pracy, pamięci, dowodu, kontekstu i kontroli.**

Najkrócej:

> **Codex generuje pracę. KRN ma sprawić, że praca Codexa staje się kontraktowa, pamiętana, weryfikowalna, widoczna, delegowalna i audytowalna.**

To jest wedge. Nie “lepszy Codex”. Nie “kolejny agent framework”. Nie “ładny dashboard”. Tylko **local Codex Work OS**.

---

# 1. Aktualny stan repo — fakty

## Fakty z repo

KRN Harness jest dziś opisany jako **Codex-first local agentic engineering runtime/control layer**, z zasadą:

```text
contract -> context -> graph -> hooks -> trace -> verify -> governed memory
```

README jasno mówi też, czym KRN nie jest: nie jest prompt packiem, dashboard-first produktem, generycznym multi-agent frameworkiem, MCP/vector/publishing systemem, hook trust proofem ani production proof systemem.

Aktualny produktowy środek ciężkości jest dobrze ustawiony:

```text
krn run -> run-result -> run-bundle -> report/release-check as supporting evidence
```

`krn run --task-spec ... --execute-verify --bundle` jest normalną ścieżką dla targetów, a `start`, `graph`, `context`, `verify`, `handoff`, `review`, `summary`, `report`, `release-check` są plumbingiem/troubleshootingiem, nie rytuałem głównym.

Repo ma już lokalny proof threshold przekroczony, ale tylko lokalnie: fixture evidence, product-code fixture, synthetic WordPress/ACF fixture, real target local proof na `krn-llm-wiki`, config adoption PR #78, drugi real repo repeat na `marketing-intelligence-studio`, runtime-dir collision proof na `krn-ai-os`. Jednocześnie repo uczciwie utrzymuje `productionProof: false` i hook trust jako unproven.

Evidence matrix mówi wprost, że to jest ledger, nie drugi narrative truth, i że całość jest local evidence only, not production proof. Otwarte proof gaps to m.in. adoption friction hardening, non-bypass hook trust, noisy large repo behavior, reviewer usefulness, operator summary usefulness i brak production proof.

Memory już istnieje jako governed local recall: `.krn/memory/pending.json`, `.krn/memory/approved.json`, `.krn/memory/deprecated.json`, z komendami `propose`, `approve`, `deprecate`, `list`. Kluczowe: P0 nigdy nie auto-approve’uje memory, pending/deprecated nie są active memory, a approved memory może wejść do kontekstu tylko jako `referenceOnly`, z provenance i gatingiem relevance/opt-out.

Dashboard dziś nie istnieje jako produkt. Istnieje tylko artifact-first summary/report boundary: `krn summary` i `krn report` agregują lokalne artefakty i nie mogą być drugim źródłem prawdy, odpalać Codexa, wykonywać verify, czy inferować production readiness.

Dashboard-lite jest zaakceptowany tylko jako przyszły **read-only local static HTML report viewer**, bez serwera, DB, auth, frameworka, external assets i mutacji. Jego źródłem prawdy mają być artefakty, nie UI.

Adoption friction register pokazuje realne tarcia: `.krn/` w `.gitignore`, relative `--task-spec`, granice rollback/no-push/no-merge częściowo w task text, narrow verify allowlist, Python wrappery `tools/*.py`, target-owned `.krn/` collision, protected-looking do-not-use paths i różnica między full suite a target-owned quality gate.

## Moja interpretacja

Obecne repo jest **zdrowe jako local proof harness**, ale nie jest jeszcze produktem przełomowym. Jest bardzo dobrym fundamentem pod przełom, bo ma właściwe instynkty: kontrakty, dowody, memory governance, runtime artifacts, proof flags, ograniczanie scope. Ale jego obecna wartość nadal jest głównie “engineering correctness scaffold”, nie “daily work transformation”.

Przełom pojawi się dopiero, gdy KRN zacznie spinać codzienny cykl pracy:

```text
idea -> goal -> task contract -> Codex work -> verify -> review -> memory -> daily ledger -> visual cockpit -> next/delegated work
```

Nie tylko:

```text
run -> bundle
```

---

# 2. Teza produktowa: czym ma być przełomowy KRN

## Produkt, który warto zbudować

```text
KRN Work OS
```

Pełna definicja:

> **KRN Work OS to lokalny, artifact-backed system pracy dla Codex-first engineeringu, który zamienia pomysły, zadania i sesje Codexa w kontrakty, kontrolowany kontekst, wykonane runy, dowody, zatwierdzoną pamięć, daily ledger, delegację i wizualny kokpit — bez udawania production readiness i bez oddawania prawdy dashboardowi/modelowi.**

To nie jest:

```text
Codex clone
agent framework
dashboard SaaS
prompt pack
memory chatbot
vector knowledge base
multi-agent swarm
```

To jest:

```text
local truth + evidence + memory + workflow layer around Codex
```

## Dlaczego to może być przełomowe

Rynek jest zalany narzędziami od “AI writes code faster”. To jest już commodity. Przełomowa luka jest inna:

```text
AI work is cheap.
Trusted engineering continuation is expensive.
```

Codex potrafi pisać, debugować, testować, analizować. Ale w codziennej pracy problemem jest:

```text
- co dokładnie było zadaniem?
- jaki kontekst był użyty?
- czy agent nie wyszedł poza scope?
- co faktycznie zostało sprawdzone?
- co powinno zostać zapamiętane?
- co jest tylko lokalnym dowodem?
- czy da się wrócić do pracy jutro bez czytania czatu?
- czy można dać 3 taski równolegle i nadal wiedzieć, co jest bezpieczne?
- czy frontend wygląda dobrze, czy tylko build przechodzi?
- czy dashboard pokazuje prawdę, czy teatr?
```

KRN może być przełomowy, jeżeli odpowie na te pytania lepiej niż sam Codex.

---

# 3. Źródła i wzorce, które uzasadniają kierunek

## 3.1. Agent-computer interface, nie prompt pack

SWE-agent stawia mocną tezę: agenci językowi są nową kategorią użytkowników komputera i potrzebują specjalnie zaprojektowanych interfejsów. Paper pokazuje, że agent-computer interface wpływa na zdolność agenta do nawigacji po repo, edycji plików i uruchamiania testów. ([arXiv][1])

To uzasadnia KRN jako:

```text
Codex ACI / harness / control layer
```

a nie jako:

```text
prompt library
```

## 3.2. Realne software engineering tasks są repo-level, nie prompt-level

SWE-bench zawiera 2294 problemy z realnych GitHub issues i pokazuje, że rozwiązywanie realnych zadań wymaga koordynacji zmian przez wiele funkcji, klas i plików, interakcji ze środowiskiem wykonawczym, długiego kontekstu i złożonego rozumowania. ([arXiv][2])

To uzasadnia KRN-owe:

```text
task contract
context package
graph-lite
verify
trace
bundle
```

bo “napisz kod” nie wystarcza.

## 3.3. Contract-first jest zgodny z oficjalnym Codex best practice

OpenAI Codex docs mówią, że w dużych repo największy unlock to właściwy task context i jasna struktura; dobry prompt powinien zawierać `Goal`, `Context`, `Constraints`, `Done when`, bo to pomaga Codexowi trzymać scope, robić mniej założeń i produkować pracę łatwiejszą do review. ([OpenAI Developerzy][3])

To prawie dokładnie mapuje się na:

```text
task-spec -> task contract
```

## 3.4. AGENTS.md, skills i automations tylko po realnym tarciu

OpenAI zaleca trzymać trwałe guidance w `AGENTS.md`, ale krótko, praktycznie i aktualizować po powtarzalnych błędach; skills mają być scoped to one job, z jasnymi input/output i 2–3 realnymi use case’ami, a tools/MCP należy dodawać tylko wtedy, gdy usuwają realną pętlę ręczną. ([OpenAI Developerzy][3]) ([OpenAI Developerzy][3])

To uzasadnia KRN-ową zasadę:

```text
friction -> pattern -> memory -> skill -> automation
```

Nigdy odwrotnie.

## 3.5. Proste, kompozycyjne workflow > wielkie agent frameworki

Anthropic pisze, że najskuteczniejsze implementacje agentów zwykle używają prostych, kompozycyjnych wzorców zamiast złożonych frameworków; zaleca zaczynać od najprostszego rozwiązania i dodawać złożoność tylko, gdy przynosi mierzalną poprawę. ([Anthropic][4])

To wspiera obecne KRN non-goals:

```text
no generic multi-agent framework
no vector DB by default
no dashboard-first
no autonomous swarm
```

## 3.6. Verify jest konieczne, ale nie wystarczy

Anthropic podkreśla, że coding agents są silne, bo kod można weryfikować testami i iterować na feedbacku, ale human review nadal jest kluczowe dla dopasowania do szerszych wymagań systemu. ([Anthropic][4])

SWE-Bench+ jest ostrzeżeniem: weak tests i leakage mogą zawyżać sukces agentów; w analizie usunięcie problematycznych przypadków mocno obniżyło reported solve rate. ([arXiv][5])

To uzasadnia proof taxonomy:

```text
verify passed != production proof
local proof != production proof
config adoption != product-code proof
bundle exists != correctness
```

## 3.7. Memory jest potrzebne, ale jest toksyczne bez governance

OpenAI Codex memories są lokalną warstwą recallu między threadami, ale docs mówią, żeby required team guidance trzymać w `AGENTS.md` albo checked-in docs, a memories traktować jako helpful local recall layer, nie jedyne źródło reguł. ([OpenAI Developerzy][6])

Survey o pamięci agentów formalizuje memory jako pętlę `write-manage-read` i wskazuje realne problemy: filtering, contradiction handling, latency budgets, privacy governance, learned forgetting i trustworthy reflection. ([arXiv][7])

SSGM idzie w tę samą stronę: long-term memory jest foundational, ale dynamiczna pamięć agentów niesie semantic drift, memory corruption i privacy risk; proponuje decoupling memory evolution from execution, consistency verification, temporal decay i access control przed consolidation. ([arXiv][8])

To dokładnie uzasadnia KRN-owe:

```text
pending -> approved -> deprecated
no auto-approved memory
memory as referenceOnly
provenance required
```

## 3.8. Hook trust i MCP/vector/browser to realne trust boundaries

OpenAI hooks docs mówią, że project-local hooks loadują się tylko, gdy `.codex/` layer jest trusted, a non-managed command hooks muszą być reviewed/trusted against exact hook definition hash; bypass istnieje, ale jest bypass, nie dowód trustu. ([OpenAI Developerzy][9])

Simon Willison opisuje “lethal trifecta”: private data + untrusted content + external communication. Jego argument jest prosty: gdy agent ma wszystkie trzy, prompt injection może prowadzić do exfiltration, bo LLM nie rozróżnia niezawodnie instrukcji operatora od instrukcji ukrytych w treści. ([Simon Willison’s Weblog][10])

To uzasadnia, dlaczego KRN nie powinien za wcześnie budować:

```text
MCP server
browser evidence layer
vector over protected corpora
publishing pipeline
autonomous agents with network
```

## 3.9. Delegacja tak, swarm nie

Codex docs mówią, że subagents pomagają przenieść noisy work poza main thread i nadają się na read-heavy exploration, tests, triage, summarization; jednocześnie ostrzegają przed parallel write-heavy workflows, bo zwiększają konflikty i coordination overhead. ([OpenAI Developerzy][11])

Codex worktrees pozwalają uruchamiać wiele niezależnych zadań w tym samym projekcie bez przeszkadzania lokalnej pracy. ([OpenAI Developerzy][12])

To uzasadnia przyszły KRN model:

```text
KRN tracks delegated task contracts and proof bundles.
Codex/worktrees/subagents do actual work.
KRN does not become autonomous swarm framework.
```

## 3.10. Codex exec daje maszynowy ślad, ale nie dowód poprawności

`codex exec` jest przeznaczony do pipeline’ów/CLI workflows, ma explicit sandbox/approval settings, domyślnie read-only, a `--json` daje JSONL stream z eventami typu agent messages, reasoning, command executions, file changes, MCP tool calls, web searches i plan updates. ([OpenAI Developerzy][13])

To wspiera KRN jako evidence runtime, ale z granicą:

```text
Codex JSONL = proof of behavior trajectory
not proof of correctness
```

---

# 4. Pełny `/goal`: KRN Work OS Breakthrough Program

Poniżej wersja, którą można potraktować jako **strategiczny goal** do repo. Nie jako jeden sprint. Raczej jako program produktu, z etapami i stop-gates.

```text
/goal krn-work-os-breakthrough-v1

Cel:
Przekształcić KRN Harness z lokalnego Codex-first run/evidence harnessu w lokalny Work OS dla Codex-first engineeringu: system, który zamienia pomysły i codzienną pracę w kontrakty, kontrolowany kontekst, wykonane runy, dowody, review, zatwierdzoną pamięć, daily ledger, delegację i read-only visual cockpit.

Produkt nie ma konkurować z Codexem w generowaniu kodu.
Produkt ma rozwiązywać problemy, których Codex sam nie domyka:
- utrata kontekstu,
- brak project truth,
- brak governed memory,
- false done,
- overclaim,
- nieczytelna historia pracy,
- brak daily operating layer,
- trudne review,
- słaba delegacja,
- brak proof taxonomy,
- brak visual/frontend acceptance,
- zbyt łatwe przechodzenie od lokalnego proofu do marketingowego claimu.

North Star:
Codex work becomes accountable, cumulative, reviewable, and reusable by default.

Core loop:
idea / issue / daily intent
  -> goal card
  -> task-spec
  -> task contract
  -> context package + approved memory refs
  -> Codex execution / local operator run
  -> trace
  -> target-owned verify
  -> run-result
  -> run-bundle
  -> deterministic review
  -> memory candidates
  -> daily ledger
  -> static/read-only cockpit
  -> next goal or delegated work

Obowiązkowe centrum produktu:
krn run -> run-result -> run-bundle
review/memory/summary/report/dashboard są projekcjami i kontrolami nad tym centrum, nie nowym centrum prawdy.

Current repo truth:
- v0.1 local proof threshold is crossed.
- productionProof remains false.
- hookTrust remains unproven.
- local evidence is not production proof.
- config adoption is not product-code proof.
- fixture evidence is not real target proof.
- report/release-check are supporting evidence.
- runtime.dir escape hatch is required for target-owned .krn collisions.
- no new broad surface without recorded friction and narrow acceptance test.

Strategiczne ograniczenia:
Nie budować dashboard-first produktu, MCP servera, vector DB, autonomous subagent frameworka, publishing pipeline, browser evidence layer, production runnera, auto-approved memory, shell verify mode, broad command allowlist, ani nowych bundle variants bez dowodu.

Strategiczny rezultat:
KRN ma stać się lokalnym systemem operacyjnym pracy z Codexem:
- co mamy robić,
- dlaczego,
- na jakim kontekście,
- z jakimi ograniczeniami,
- co Codex zrobił,
- co zostało sprawdzone,
- co jest dowodem,
- co nie jest dowodem,
- co warto zapamiętać,
- co jest gotowe do review,
- co można delegować,
- co widać w kokpicie.
```

---

# 5. Model docelowy produktu

## 5.1. Warstwy

```text
┌─────────────────────────────────────────────────────────────┐
│  Visual Cockpit / Dashboard-lite                            │
│  read-only, artifact-backed, local-first                    │
└─────────────────────────────────────────────────────────────┘
                          ▲
┌─────────────────────────────────────────────────────────────┐
│  Daily Work Ledger                                          │
│  active goals, blocked tasks, review queue, memory queue    │
└─────────────────────────────────────────────────────────────┘
                          ▲
┌─────────────────────────────────────────────────────────────┐
│  Governed Memory                                            │
│  pending -> approved -> deprecated, provenance, conflicts   │
└─────────────────────────────────────────────────────────────┘
                          ▲
┌─────────────────────────────────────────────────────────────┐
│  Evidence Layer                                             │
│  run-result, run-bundle, review, proof taxonomy             │
└─────────────────────────────────────────────────────────────┘
                          ▲
┌─────────────────────────────────────────────────────────────┐
│  Execution Harness                                          │
│  krn run, trace, target-owned verify, Codex exec evidence   │
└─────────────────────────────────────────────────────────────┘
                          ▲
┌─────────────────────────────────────────────────────────────┐
│  Context / Graph / Policy                                   │
│  context package, graph-lite, do-not-use, allowlisted gates │
└─────────────────────────────────────────────────────────────┘
                          ▲
┌─────────────────────────────────────────────────────────────┐
│  Contract Layer                                             │
│  goal, task-spec, doneWhen, constraints, proof hints        │
└─────────────────────────────────────────────────────────────┘
```

## 5.2. Zasada kontroli

```text
Codex can propose.
KRN records.
Verify executes only allowed target-owned gates.
Review classifies.
Human approves memory.
Dashboard only reads.
```

To jest bardzo ważne. W KRN prawda nie powinna pochodzić z:

```text
model said
dashboard shows
summary sounds good
agent completed
```

Tylko z:

```text
artifact exists
command executed
proof class is explicit
memory has provenance
review did not overclaim
```

---

# 6. A-Z: co chcemy osiągnąć

## A. Goal model

Dzisiaj KRN ma task contract. Docelowo potrzebuje wyższego poziomu: **goal card**.

Goal card odpowiada:

```text
- co chcemy osiągnąć biznesowo/inżynieryjnie?
- dlaczego to ważne?
- jaki jest smallest useful slice?
- jakie są ryzyka?
- jakie są non-goals?
- co będzie dowodem?
- czy to jest discovery, build, review, frontend, refactor, bugfix, release?
```

Bez tego Codex będzie robił taski, ale nie będzie prowadził pracy.

## B. Task contract jako wykonawczy kontrakt

Task contract zostaje, ale musi stać się codziennym standardem:

```text
goal
context
constraints
doneWhen
doNotTouch
verifyCommands
proofClassExpected
rollback/no-push/no-merge boundaries
```

Obecne tarcie polega na tym, że część granic nadal żyje w task prose; friction register mówi to wprost.

## C. Context package jako “anti-context-rot layer”

KRN musi kontrolować, co wchodzi do kontekstu:

```text
included
excluded
do-not-use
stale-doc risk
memory refs
graph refs
why included
why excluded
```

To jest kluczowe, bo Codex sam bardzo łatwo zamienia “dużo kontekstu” w “toksyczny kontekst”.

## D. Graph-lite jako evidence, nie pełny callgraph

Graph-lite ma zostać płytki, deterministyczny i tani. Repo samo mówi, że nie buduje AST/callgraph/dataflow ani Tree-sitter graph w P0/P1.

Docelowo graph może się rozwinąć, ale tylko po benchmarku:

```text
graph-lite vs lexical retrieval vs optional synthetic vector scorer
```

## E. Verify jako target-owned gate

Najważniejszy wzorzec:

```text
KRN does not invent correctness.
Target defines validation.
KRN controls how validation is executed and recorded.
```

Obecne narrow allowlist tworzy tarcie, szczególnie dla Python targetów, które potrzebują wrapperów. To jest realny problem adopcyjny, nie noise.

## F. Review jako hamulec overclaimu

`krn review` powinien być first-class closeout audit. Nie powinien być kolejnym summary.

Powinien odpowiadać:

```text
VERIFIED_LOCAL
NEEDS_CHANGES
BLOCKED
OVERCLAIM_RISK
MISSING_EVIDENCE
```

i sprawdzać:

```text
productionProof false
hookTrust unproven
verify actually executed
proof class correct
protected paths not active context
report/release-check not overread
runtime artifacts not staged
target push/merge not claimed
```

## G. Memory jako system uczenia się pracy

To jest jeden z największych potencjalnych przełomów KRN.

Memory nie ma być “model pamięta”. Memory ma być:

```text
claim with provenance and status
```

Typy memory:

```text
project truth memory
friction memory
workflow memory
evidence memory
preference memory
product memory
rejected/unsafe memory
```

Minimalny model:

```text
pending -> approved -> deprecated
```

już istnieje. Teraz trzeba zrobić z tego daily loop.

## H. Daily ledger

To jest brakująca warstwa między CLI a dashboardem.

Daily ledger powinien lokalnie pokazywać:

```text
active goals
active tasks
last runs
runs needing review
blocked work
memory candidates
approved memory changes
adoption frictions
delegated work
stale decisions
next recommended action
```

To może być najpierw JSON + Markdown. Bez serwera.

## I. Frontend / visual evidence lane

Dla frontendów sam `pnpm build` nie wystarcza.

KRN potrzebuje osobnego task type:

```text
frontend-slice
```

z acceptance:

```text
routes/components affected
viewports
design constraints
accessibility expectations
visual before/after evidence
Storybook/Playwright if target-owned
no design-token bypass
copy status: draft/approved
```

Nie oznacza to od razu browser evidence layer. Najpierw: target-owned screenshot/Storybook/Playwright artifacts, manual notes, visual checklist.

## J. Delegation model

KRN nie powinien spawn’ować własnego swarmu.

KRN powinien opisywać delegację:

```text
one delegated task
one worktree
one contract
one run-result
one bundle
one review
one handoff
```

Codex worktrees/subagents mogą być workerami, ale KRN ma być ledgerem i evidence control plane.

## K. Dashboard-lite / cockpit

Docelowo tak, KRN powinien mieć dashboard. Ale nie jako source of truth.

Pierwszy dashboard:

```text
read-only
local
static
artifact-backed
no server
no DB
no mutation
no external assets
```

Widoki:

```text
overview
projects
goals
tasks
runs
run detail
memory
review queue
frontend proof
delegations
risks
```

To jest zgodne z już zaakceptowanym ADR-0014.

## L. Eval system: raw Codex vs Codex+KRN

Bez porównania nie ma przełomu.

Trzeba mierzyć:

```text
raw Codex
vs
Codex with KRN workflow
```

Na tych samych targetach.

Metryki:

```text
task completion
verify pass
human interventions
wrong-file edits
scope violations
false done
review time
artifact usefulness
memory reuse
repeated mistake reduction
frontend defect rate
time to auditable proof
```

---

# 7. Roadmapa `/goal` od A do Z

## Goal 01 — Product North Star & Claim Control

**Cel:** zamrozić produktowy język: KRN Work OS, nie prompt pack, nie dashboard, nie agent framework.

**Minimalny zakres:**

```text
- jeden docs/product/north-star.md
- update README wording only if inconsistent
- claim taxonomy:
  local proof
  fixture proof
  config adoption proof
  product-code proof
  Codex exec proof
  hook trust proof
  production proof
- explicit stop phrases:
  "not production proof"
  "not hook trust proof"
  "dashboard is projection"
```

**Acceptance criteria:**

```bash
pnpm test
pnpm verify:local
```

**Proof artifacts:**

```text
docs/product/north-star.md
docs/product/evidence-matrix.md updated if needed
```

**Nie wolno:**

```text
- dodawać CLI surface
- budować dashboardu
- zmieniać proof flags na true
- pisać marketingowych claimów bez artifact evidence
```

---

## Goal 02 — Target Adoption Hardening

**Cel:** zewnętrzny operator ma wykonać KRN run na target repo bez wiedzy autora.

**Minimalny zakres:**

```text
- canonical target adoption playbook
- relative task-spec rule
- runtime.dir decision tree
- gitignore guidance
- target-owned verify command pattern
- wrapper-first Python validation guidance
- no-push/no-merge boundary as structured task fields or clear docs
```

**Acceptance criteria:**

```bash
scripts/krn-real-repo-preflight.sh <target>
pnpm --silent krn config doctor --json
pnpm --silent krn run --task-spec <relative-task-spec.json> --execute-verify --bundle
pnpm --silent krn review --write
git status --short
```

**Proof artifacts:**

```text
<runtime-dir>/current/config-doctor.json
<runtime-dir>/current/run-result.json
<runtime-dir>/current/run-bundle/manifest.json
<runtime-dir>/current/review-summary.json
```

**Nie wolno:**

```text
- shell mode
- arbitrary command execution
- target push/merge
- treating config adoption as product-code proof
```

---

## Goal 03 — Review as Closeout Gate

**Cel:** `krn review` ma być hamulcem overclaimu.

**Minimalny zakres:**

```text
- review reads run-result, bundle manifest, verify, context, memory refs
- review emits JSON/MD
- verdict enum:
  PASS_LOCAL
  NEEDS_CHANGES
  BLOCKED
  OVERCLAIM_RISK
  MISSING_EVIDENCE
- reviewer checks productionProof/hookTrust/protected paths/runtime artifacts
```

**Acceptance criteria:**

```bash
pnpm test
pnpm --silent krn run --task-spec fixtures/tasks/product-code-test-dogfood.json --execute-verify --bundle
pnpm --silent krn review --write
```

**Proof artifacts:**

```text
.krn/current/review-summary.json
.krn/current/review-summary.md
```

**Nie wolno:**

```text
- model judge jako required gate
- reviewer editing files
- reviewer approving memory
- reviewer executing commands
```

Repo już ma kontrakt, że reviewerzy są deterministic, czytają lokalne artefakty i nie edytują, nie wykonują verify, nie wołają modeli, nie commitują i nie pushują.

---

## Goal 04 — Governed Memory Daily Loop

**Cel:** memory ma realnie wspierać codzienną pracę, ale bez zatruwania project truth.

**Minimalny zakres:**

```text
- memory candidates from run/review/handoff
- manual approve/reject/deprecate
- memory scopes:
  personal
  project
  target
  workflow
  evidence
  rejected
- provenance required
- approved memory can enter context as referenceOnly
- pending/deprecated never active
- opt-out phrases respected
```

**Acceptance criteria:**

```bash
pnpm test
pnpm --silent krn memory propose "..." --evidence <artifact>
pnpm --silent krn memory approve <id>
pnpm --silent krn memory list
pnpm --silent krn context --use-approved-memory
```

**Proof artifacts:**

```text
.krn/memory/pending.json
.krn/memory/approved.json
.krn/memory/deprecated.json
.krn/current/context-package.json
```

**Nie wolno:**

```text
- auto-approved memory
- vector DB
- semantic memory without eval
- memory from protected data
- memory without evidencePath
```

To rozszerza istniejące P0 memory primitives, które już odrzucają auto-approval i dopuszczają approved memory tylko jako reference-only z provenance.

---

## Goal 05 — Daily Work Ledger

**Cel:** KRN ma pokazywać stan pracy bez czytania czatu.

**Minimalny zakres:**

```text
- active goals
- active task-specs
- last run statuses
- review-needed runs
- blocked runs
- memory candidates
- approved memory changes
- adoption frictions
- delegated work placeholders
- stale artifacts
```

**Output:**

```text
.krn/current/daily-ledger.json
.krn/current/daily-ledger.md
```

**Acceptance criteria:**

```bash
pnpm test
pnpm --silent krn summary --write
pnpm --silent krn daily --write
```

Jeżeli `krn daily` to za dużo nowej CLI surface, można zacząć od `krn summary --daily --write` albo wygenerować ledger jako część summary. Ale intencja musi być osobna: daily work view, nie release report.

**Nie wolno:**

```text
- serwer
- baza danych
- hidden state poza artifacts
- dashboard as source of truth
```

---

## Goal 06 — Context Quality Benchmark

**Cel:** przestać zgadywać, czy context package działa.

**Minimalny zakres:**

```text
- synthetic corpus
- lexical baseline
- graph-lite baseline
- stale-doc avoidance metric
- do-not-use exclusion metric
- context budget metric
- answerability metric
- optional fake scorer only
```

**Acceptance criteria:**

```bash
pnpm test
pnpm --silent krn eval
```

**Proof artifacts:**

```text
.krn/current/eval-result.json
.krn/evals/baseline.json
```

**Nie wolno:**

```text
- production vector DB
- embeddings dependency
- protected/client corpus
- replacing graph-lite without benchmark
```

To jest zgodne z ADR-0016, który dopuszcza tylko synthetic retrieval experiment harness i zabrania vector DB/embeddings dependency/protected corpora na tym etapie.

---

## Goal 07 — Frontend Visual Proof Lane

**Cel:** KRN ma wspierać codzienną pracę frontendową i tworzenie stron, nie tylko backend/CLI proof.

**Minimalny zakres:**

```text
- frontend task type
- routes/components affected
- viewport list
- design constraints
- a11y expectations
- target-owned visual commands if available
- screenshot/manual visual artifact references
- copy status
```

**Acceptance criteria:**

```bash
pnpm --silent krn run --task-spec <frontend-task.json> --execute-verify --bundle
pnpm --silent krn review --write
```

**Proof artifacts:**

```text
<runtime-dir>/current/run-result.json
<runtime-dir>/current/run-bundle/manifest.json
<runtime-dir>/current/frontend-proof.json
```

**Nie wolno:**

```text
- browser automation as mandatory dependency
- external visual service
- Figma/MCP dependency
- claiming visual correctness from build alone
```

---

## Goal 08 — Codex Exec Evidence Integration

**Cel:** uchwycić realne zachowanie Codexa bez udawania, że JSONL = poprawność.

**Minimalny zakres:**

```text
- codex exec --json evidence pack
- metadata parse
- event summary
- file change summary
- command execution summary
- sandbox/approval settings captured
- raw JSONL/stderr not committed by default
```

**Acceptance criteria:**

```bash
codex exec --sandbox workspace-write --json "<bounded task>"
pnpm --silent krn eval
pnpm test
```

**Proof artifacts:**

```text
docs/evidence/codex-exec-runs/<run-id>/
<runtime-dir>/current/codex-exec-summary.json
```

**Nie wolno:**

```text
- treating Codex exec as production proof
- treating hook bypass as hook trust proof
- committing secrets/raw logs by default
```

`codex exec --json` daje event stream przydatny do evidence, ale poprawność nadal musi pochodzić z target verify i review. ([OpenAI Developerzy][13])

---

## Goal 09 — Delegation / Worktree Protocol

**Cel:** umożliwić równoległą pracę Codexa bez budowy własnego swarmu.

**Minimalny zakres:**

```text
- delegated-task contract
- one task = one worktree/run/bundle
- read-heavy subagent use only as external Codex capability
- write-heavy conflicts blocked unless explicit worktree boundary
- delegation summary in daily ledger
```

**Acceptance criteria:**

```bash
pnpm test
pnpm --silent krn run --task-spec <delegated-task.json> --execute-verify --bundle
pnpm --silent krn review --write
```

**Proof artifacts:**

```text
.krn/current/delegation-summary.json
.krn/current/run-bundle/manifest.json
```

**Nie wolno:**

```text
- autonomous subagent framework
- uncontrolled parallel writes
- agent spawning from KRN by default
- memory approval by agents
```

Repo już ma “reviewer contracts” i świadomie nie implementuje autonomous subagent frameworka; przyszłe role wymagają ADR, isolated worktree policy, conflict handling i explicit operator approval.

---

## Goal 10 — Static Cockpit / Dashboard-lite

**Cel:** dać wizualny obraz pracy, ale wyłącznie jako projekcję artefaktów.

**Minimalny zakres:**

```text
- one generated local HTML file
- consumes daily-ledger/operator-summary/run artifacts
- views:
  overview
  goals
  tasks
  runs
  run detail
  memory
  review queue
  frontend proof
  risks
- no server
- no DB
- no mutation
- no external assets
```

**Acceptance criteria:**

```bash
pnpm test
pnpm --silent krn summary --write
pnpm --silent krn report --write
```

**Proof artifacts:**

```text
.krn/current/operator-summary.json
.krn/current/operator-report.html
.krn/current/dashboard-lite.html
```

**Nie wolno:**

```text
- React app/server as first step
- hosted UI
- auth
- external CSS/JS
- dashboard as product authority
```

To jest dokładnie kierunek ADR-0014: dashboard-lite jako read-only static local report viewer, nie źródło prawdy.

---

## Goal 11 — Comparative Breakthrough Eval

**Cel:** udowodnić, że KRN poprawia codzienną pracę z Codexem względem raw Codex.

**Minimalny zakres:**

```text
Baseline A:
  raw Codex + normal prompt + AGENTS.md

Baseline B:
  Codex + KRN goal/task/run/review/memory

Targets:
  fixture
  TypeScript repo
  Python repo with wrapper
  repo with tracked .krn collision
  frontend slice
  one real product-code target
```

**Metrics:**

```text
task completed
verify passed
review time
number of human interventions
scope violations
wrong-file edits
false done claims
proof overclaim incidents
memory reuse quality
repeated mistake reduction
frontend visual defects
time to auditable proof
```

**Acceptance criteria:**

```text
KRN must beat baseline on at least:
- false done reduction
- proof overclaim reduction
- reviewer time
- repeated mistake reduction
- target adoption reproducibility
```

**Nie wolno:**

```text
- cherry-pick only successful runs
- count fixture as real target proof
- hide failed KRN runs
- compare summary quality instead of engineering outcomes
```

---

## Goal 12 — Packaging / Distribution Gate

**Cel:** dopiero po realnych proof thresholds rozważyć dystrybucję.

**Minimalny zakres przed packagingiem:**

```text
- 20+ real local runs
- 5+ real target classes
- memory daily loop proven
- review usefulness measured
- dashboard-lite read-only proven
- zero proof-claim regressions
- hook trust still unclaimed unless separately proven
```

**Acceptance criteria:**

```bash
pnpm verify:local
pnpm test
pnpm --silent krn release-check --write
```

**Nie wolno:**

```text
- publishing pipeline before product proof
- hosted dashboard
- production runner claim
- hook enforcement claim
```

---

# 8. Definition of Done dla przełomowego produktu

KRN zaczyna być realnym przełomem dopiero, gdy prawdziwe jest to:

```text
[ ] Obcy operator może używać KRN bez autora repo.
[ ] Codzienny dzień pracy zaczyna się od KRN daily ledger, nie od pytania Codexa “co robiliśmy?”.
[ ] Każdy task ma contract, doneWhen i proof class.
[ ] Każdy run ma run-result i run-bundle.
[ ] Review wykrywa overclaim i missing evidence.
[ ] Memory candidates powstają z pracy, ale tylko human-approved memory trafia do przyszłego kontekstu.
[ ] Approved memory ma provenance i scope.
[ ] Rejected/deprecated memory nie wraca do kontekstu.
[ ] Frontend work ma visual/design acceptance, nie tylko build pass.
[ ] Delegated work jest one-task/one-worktree/one-bundle.
[ ] Dashboard pokazuje artefakty, nie wymyśla prawdy.
[ ] KRN pokazuje lokalny proof jako lokalny proof, nigdy jako production proof.
[ ] Hook trust pozostaje unproven, dopóki nie ma osobnego non-bypass proof.
[ ] Raw Codex baseline vs KRN pokazuje mierzalną poprawę.
```

---

# 9. Audyt: co jest bardzo dobre

## 9.1. Dobre centrum produktu

`krn run -> run-result -> run-bundle` to właściwy środek. Nie należy go teraz rozmywać. Repo samo mówi, że report/release-check są supporting evidence.

## 9.2. Dobra odporność na marketingowy overclaim

`productionProof: false`, hook trust unproven, fixture/config/product-code/local proof rozdzielone — to jest jedna z najmocniejszych rzeczy w projekcie. Większość agent tooling produktów kłamie tu implicite.

## 9.3. Dobra intuicja memory

Memory jako pending/approved/deprecated, bez auto-approval, z provenance i reference-only context injection, jest dokładnie właściwym kierunkiem.

## 9.4. Dobra obrona przed scope creep

Dashboard, MCP, vector, subagents i publishing są trzymane jako ADR/contract/experiment lanes, nie jako feature soup. To jest rozsądne.

## 9.5. Dobry adoption-friction loop

Friction register jest bardzo dobrym artefaktem produktowym: nie mówi “dodajmy wszystko”, tylko “to są tarcia z realnych runów; użyj ich do wyboru następnego focused `/goal`”.

---

# 10. Audyt: co jest nadal słabe

## 10.1. Użyteczność memory jest nieudowodniona

Evidence matrix mówi, że memory ma executable governed store, ale usefulness remains unproven i next proof to operator-approved memory examples.

To jest teraz najważniejszy strategiczny brak. Bez memory daily loop KRN będzie run harness, nie Work OS.

## 10.2. Review/summary/report mogą stać się teatrem

Evidence matrix wprost pokazuje ryzyko: reviewer usefulness beyond first deterministic records unproven, operator summary usefulness unproven, report can over-compress caveats.

To znaczy: więcej raportów nie równa się więcej wartości.

## 10.3. Brakuje daily operating layer

Repo ma operator-summary/report, ale nie ma jeszcze “daily ledger” jako centrum codziennej pracy. Bez tego użytkownik nadal będzie żył w czacie, terminalu, git statusie i pamięci własnej.

## 10.4. Frontend workflow nie jest jeszcze pierwszoklasowy

KRN jest bardzo engineering-proof oriented. Dla stron/aplikacji frontendowych trzeba dodać visual/design acceptance lane, inaczej KRN będzie świetny do proofów CLI, ale słabszy w realnym product-building.

## 10.5. Verify allowlist friction jest realny

Python wrappery i target-owned quality gate są aktualnie obejściem, ale jeszcze nie eleganckim product patternem. To nie musi oznaczać broad allowlist. Raczej:

```text
wrapper-first pattern
+
documented target validation authority
+
later narrow profiles after repeated evidence
```

## 10.6. Hook trust nadal jest dziurą — i dobrze, że jest nazwana

Nie próbowałbym tego teraz “naprawiać” w biegu. Hook trust powinien być osobnym `/goal`, bo OpenAI hooks trust flow ma własne warunki review/hash/project trust. ([OpenAI Developerzy][9])

---

# 11. Największe ryzyka strategiczne

## Ryzyko 1: Dashboard przed prawdą

Jeżeli zaczniecie od React dashboardu, skończycie z pięknym UI do oglądania niezweryfikowanych artefaktów.

Właściwa kolejność:

```text
run-result schema
review schema
memory schema
daily ledger
static viewer
dashboard
```

Nie odwrotnie.

## Ryzyko 2: Memory poisoning

Największy future footgun:

```text
Codex proposes memory
memory becomes active truth
future Codex uses false truth
system drifts
```

Dlatego memory approval musi zostać manualne, a memory musi mieć provenance, scope, status, expiry/conflict handling.

## Ryzyko 3: Agent swarm fantasy

Delegowanie jest potrzebne. Swarm nie.

Prawidłowy model:

```text
bounded delegated task
isolated worktree
single proof bundle
review closeout
human-controlled merge
```

## Ryzyko 4: Proof inflation

Największy produktowy grzech:

```text
verified local run
```

zaczyna być sprzedawane jako:

```text
production-ready automated engineering
```

To zabiłoby wiarygodność.

## Ryzyko 5: Feature envy względem Codexa

OpenAI będzie dokładać memory, worktrees, subagents, automations, MCP, app UI. KRN nie wygra feature-for-feature.

KRN ma wygrać czymś innym:

```text
local project truth
evidence discipline
governed memory
artifact-backed workflow
claim control
```

---

# 12. Idealny daily usage flow

## Rano

```bash
pnpm --silent krn summary --write
pnpm --silent krn daily --write
```

KRN pokazuje:

```text
- aktywne cele
- ostatnie runy
- rzeczy do review
- memory candidates
- blokery
- target frictions
- delegated work
- next recommended action
```

## Gdy masz pomysł

Nie piszesz od razu do Codexa:

```text
zrób mi landing page
```

Tylko KRN/Codex prowadzi do:

```text
goal card
task-spec
frontend acceptance
proof class
```

## Gdy Codex pracuje

```bash
pnpm --silent krn run --task-spec <task.json> --execute-verify --bundle
```

KRN wymusza:

```text
contract
context
trace
verify
bundle
```

## Po pracy

```bash
pnpm --silent krn review --write
pnpm --silent krn memory propose "..." --evidence <artifact>
```

Review mówi:

```text
local verified
not production proof
hook trust unproven
frontend visual proof missing
memory candidate safe/unsafe
```

## Na koniec dnia

KRN mówi:

```text
co zostało zrobione
co jest gotowe do review
co jest tylko lokalnym proofem
co warto zapamiętać
co trzeba odrzucić
co jutro jest next
```

To jest realne wsparcie pracy, nie tylko narzędzie do jednego runa.

---

# 13. Jak to mapuje się na twórców/wzorce, o których wspomniałeś

Nie traktowałbym tych osób jako “autorytet powiedział X, więc budujemy Y”. Raczej jako wzorce pracy:

| Wzorzec                                      | Co KRN powinien z niego brać                                                                                                   |
| -------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------ |
| Matt Pocock                                  | type-safe contracts, executable examples, minimal APIs, świetne DX dla TS workspace.                                           |
| Addy Osmani                                  | product engineering discipline: UX, performance, clarity, user workflow, visual/frontend acceptance.                           |
| Andrej Karpathy                              | “vibe coding” pokazuje moc natural language → code, ale KRN ma być antytezą bezrefleksyjnego vibe shippingu: evidence-first.   |
| Harrison Chase / LangGraph                   | durable state, human-in-loop, memory, observability — ale KRN lokalnie i artifact-first, bez natychmiastowego framework creep. |
| Simon Willison                               | prompt injection, lethal trifecta, slop, evidence skepticism; KRN musi minimalizować trust boundary i overclaim.               |
| Anton Osika / Lovable-style product building | szybkie tworzenie aplikacji i UI slice’ów; KRN musi dodać frontend/product proof, inaczej zostanie infra-only.                 |
| Swyx                                         | AI engineering jako systemy, workflow, evals, externalized knowledge — KRN jako operating protocol, nie zbiór promptów.        |
| Logan Kilpatrick / OpenAI Codex docs         | goal/context/constraints/doneWhen, AGENTS.md, skills po powtarzalnych workflow, MCP tylko gdy usuwa realną pętlę.              |

Uwaga audytowa: z tej listy najmocniej potwierdzone źródłowo są OpenAI/Codex, Anthropic, SWE-agent/SWE-bench, Willison i memory papers. Przy Anton/Swyx/Karpathy traktowałbym to jako inspiracje produktowe, nie formalne dowody.

---

# 14. Co powinno zostać zakazane jeszcze długo

```text
- productionProof=true
- hookTrust proven bez non-bypass hook proof
- hosted dashboard
- dashboard as source of truth
- MCP server with mutation tools
- vector DB over real target/client corpus
- auto-approved memory
- autonomous subagent framework
- broad shell verify mode
- arbitrary command allowlist
- raw Codex JSONL/stderr committed by default
- production runner claim
- publishing pipeline
- browser evidence layer as required dependency
- model judge as release authority
- hiding failed runs from eval
```

---

# 15. Najbardziej konkretna następna sekwencja

Gdybym miał to teraz ułożyć bez rozpraszania:

```text
1. /goal krn-work-os-north-star
2. /goal review-closeout-gate-v1
3. /goal governed-memory-daily-loop-v0
4. /goal daily-ledger-v0
5. /goal target-adoption-hardening-v1
6. /goal frontend-visual-proof-lane-v0
7. /goal delegation-worktree-protocol-v0
8. /goal static-cockpit-v0
9. /goal raw-codex-vs-krn-eval-v0
10. /goal packaging-readiness-review
```

Nie zaczynałbym od dashboardu. Zacząłbym od memory + daily ledger + review, bo to robi z KRN narzędzie codzienne, a nie tylko runner.

---

# 16. Brutalna uwaga końcowa

Obecny KRN jest **bardzo dobrym szkieletem kontroli**, ale jeszcze nie produktem, który zmienia codzienną pracę. Produkt przełomowy zacznie się wtedy, gdy KRN będzie odpowiadał każdego dnia na pytania:

```text
co robimy?
co wie projekt?
co Codex zrobił?
co jest sprawdzone?
co jest nieudowodnione?
co warto zapamiętać?
co jest gotowe do review?
co można delegować?
co widać wizualnie?
co jest następnym ruchem?
```

Jeżeli KRN zostanie przy:

```text
run-result
bundle
report
summary
```

to będzie porządny engineering harness.

Jeżeli dołoży:

```text
governed memory
daily ledger
review closeout
frontend proof
delegation ledger
artifact-backed cockpit
comparative eval
```

to ma realny shot na coś dużo większego:

> **lokalny system operacyjny pracy z Codexem, który zamienia agentowe generowanie w powtarzalną, widoczną, pamiętaną i audytowalną pracę inżynieryjno-produktową.**

[1]: https://arxiv.org/abs/2405.15793?utm_source=chatgpt.com "SWE-agent: Agent-Computer Interfaces Enable Automated Software Engineering"
[2]: https://arxiv.org/abs/2310.06770?utm_source=chatgpt.com "SWE-bench: Can Language Models Resolve Real-World GitHub Issues?"
[3]: https://developers.openai.com/codex/learn/best-practices "Best practices – Codex | OpenAI Developers"
[4]: https://www.anthropic.com/engineering/building-effective-agents "Building Effective AI Agents \ Anthropic"
[5]: https://arxiv.org/abs/2410.06992 "[2410.06992] SWE-Bench+: Enhanced Coding Benchmark for LLMs"
[6]: https://developers.openai.com/codex/memories "Memories – Codex | OpenAI Developers"
[7]: https://arxiv.org/abs/2603.07670?utm_source=chatgpt.com "Memory for Autonomous LLM Agents:Mechanisms, Evaluation, and Emerging Frontiers"
[8]: https://arxiv.org/abs/2603.11768?utm_source=chatgpt.com "Governing Evolving Memory in LLM Agents: Risks, Mechanisms, and the Stability and Safety Governed Memory (SSGM) Framework"
[9]: https://developers.openai.com/codex/hooks "Hooks – Codex | OpenAI Developers"
[10]: https://simonwillison.net/2025/Jun/16/the-lethal-trifecta/ "The lethal trifecta for AI agents: private data, untrusted content, and external communication"
[11]: https://developers.openai.com/codex/concepts/subagents "Subagents – Codex | OpenAI Developers"
[12]: https://developers.openai.com/codex/app/worktrees "Worktrees – Codex app | OpenAI Developers"
[13]: https://developers.openai.com/codex/noninteractive "Non-interactive mode – Codex | OpenAI Developers"
