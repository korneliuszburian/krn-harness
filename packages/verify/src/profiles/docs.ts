import type { VerifyConfigProfileInput } from "../verify.js";

export const docsProfile = {
  name: "docs",
  commands: ["pnpm lint"],
} satisfies VerifyConfigProfileInput & { name: string };
