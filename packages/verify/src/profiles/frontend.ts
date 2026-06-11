import type { VerifyConfigProfileInput } from "../verify.js";

export const frontendProfile = {
  name: "frontend",
  commands: ["pnpm lint", "pnpm test"],
} satisfies VerifyConfigProfileInput & { name: string };
