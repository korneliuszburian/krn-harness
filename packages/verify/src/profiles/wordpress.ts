import type { VerifyConfigProfileInput } from "../verify.js";

export const wordpressProfile = {
  name: "wordpress",
  commands: ["pnpm lint", "pnpm test"],
} satisfies VerifyConfigProfileInput & { name: string };
