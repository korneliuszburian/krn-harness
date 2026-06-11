import type { VerifyConfigProfileInput } from "../verify.js";

export const genericProfile = {
  name: "generic",
  commands: ["pnpm lint", "pnpm typecheck", "pnpm test"],
} satisfies VerifyConfigProfileInput & { name: string };
