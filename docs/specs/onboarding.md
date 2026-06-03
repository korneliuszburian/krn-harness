# Onboarding

## New Repo Flow

1. Install KRN Harness.
2. Add or generate downstream `AGENTS.md`.
3. Add generated hooks template if trusted.
4. Add generated `.agents/skills/krn-harness/SKILL.md` if desired.
5. Run `krn status`.
6. Start work with `krn start "<task>"` and `krn context`.
7. Record P0 verification with `krn verify`.
8. Produce review-ready current state with `krn handoff`.

## Operator Rule

If KRN reports STOP, do not edit until the missing context or unsafe condition is resolved.
