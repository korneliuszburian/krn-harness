# Glossary

- **Build-time skill:** Repo-scoped skill used by Codex while building KRN Harness.
- **Runtime/downstream skill:** Template installed into another repo by KRN Harness.
- **Task contract:** Local artifact that captures task intent, classification, acceptance, proof, and STOP state.
- **Context package:** Ranked context bundle Codex should inspect before edits.
- **Graph-lite:** Lightweight repository evidence graph, not full AST/dataflow.
- **Trace:** JSONL event stream for auditable runtime behavior.
- **Governed memory:** Evidence-linked memory that requires explicit approval before active use.
- **STOP:** Runtime instruction to avoid edits until missing context or unsafe conditions are resolved.
