import { z } from "zod";
import { defaultRuntimeDir } from "../../core/src/index.js";

const verifyModeSchema = z.enum(["record-only", "execute"]);

export const VerifyCommandConfigSchema = z.union([
  z.string(),
  z.object({
    command: z.string(),
    args: z.array(z.string()).optional(),
    label: z.string().optional(),
  }),
]);

export const VerifyProfileConfigSchema = z.object({
  commands: z.array(VerifyCommandConfigSchema).optional(),
  mode: verifyModeSchema.optional(),
  timeoutMs: z.number().int().positive().optional(),
  maxOutputBytes: z.number().int().positive().optional(),
});

const rejectedRuntimeDirs = new Set(["src", "docs", "tools", "packages"]);

function runtimeDirIssue(value: string): string | undefined {
  if (value === defaultRuntimeDir) return undefined;
  if (value === "" || value === "." || value === "/")
    return "must be a repo-relative dot-directory";
  if (!value.startsWith(".")) return "must start with .";
  if (value.includes("..")) return "must not contain ..";
  if (value.startsWith("/")) return "must not be absolute";
  if (value.endsWith("/")) return "must not end with /";
  if (value.split("/").some((part) => rejectedRuntimeDirs.has(part))) {
    return "must not target source or documentation directories";
  }

  return undefined;
}

export function validateRuntimeDir(value: string): string[] {
  const issue = runtimeDirIssue(value);
  return issue ? [`runtime.dir ${issue}`] : [];
}

const RuntimeDirSchema = z.string().superRefine((value, context) => {
  const issue = runtimeDirIssue(value);
  if (issue) {
    context.addIssue({
      code: "custom",
      message: issue,
    });
  }
});

export const KRNConfigSchema = z
  .object({
    version: z.literal(1),
    project: z
      .object({
        name: z.string().optional(),
      })
      .optional(),
    runtime: z
      .object({
        dir: RuntimeDirSchema.optional(),
      })
      .optional(),
    verify: z
      .object({
        commands: z.array(VerifyCommandConfigSchema).optional(),
        profiles: z.record(z.string(), VerifyProfileConfigSchema).optional(),
        defaultProfile: z.string().optional(),
        mode: verifyModeSchema.optional(),
        timeoutMs: z.number().int().positive().optional(),
        maxOutputBytes: z.number().int().positive().optional(),
      })
      .optional(),
  })
  .superRefine((config, context) => {
    const verify = config.verify;
    if (
      verify?.defaultProfile &&
      verify.profiles &&
      verify.profiles[verify.defaultProfile] === undefined
    ) {
      context.addIssue({
        code: "custom",
        path: ["verify", "defaultProfile"],
        message: "must reference a configured profile",
      });
    }
  });

export type KRNConfig = z.infer<typeof KRNConfigSchema>;
export type VerifyCommandConfig = z.infer<typeof VerifyCommandConfigSchema>;
export type VerifyProfileConfig = z.infer<typeof VerifyProfileConfigSchema>;

export const defaultConfig: KRNConfig = {
  version: 1,
  runtime: {
    dir: defaultRuntimeDir,
  },
};

function formatPath(path: PropertyKey[]): string {
  return path.reduce<string>((formatted, part) => {
    if (typeof part === "number") {
      return `${formatted}[${part}]`;
    }
    return formatted ? `${formatted}.${String(part)}` : String(part);
  }, "");
}

function normalizeIssueMessage(issue: z.ZodError["issues"][number]): string {
  const path = formatPath(issue.path);
  if (path === "") {
    return "config must be a JSON object";
  }

  if (path === "version") {
    return "version must be 1";
  }

  if (issue.code === "invalid_type") {
    const expected = "expected" in issue ? String(issue.expected) : "valid value";
    if (expected === "object") return `${path} must be an object`;
    if (expected === "array") return `${path} must be an array`;
    if (expected === "string") return `${path} must be a string`;
    if (expected === "number") return `${path} must be a number`;
  }

  if (path === "runtime.dir") {
    return `runtime.dir ${issue.message}`;
  }

  if (issue.code === "invalid_union" && "errors" in issue && Array.isArray(issue.errors)) {
    const nestedIssues = issue.errors.flat();
    const argsIssue = nestedIssues.find((nestedIssue) => formatPath(nestedIssue.path) === "args");
    if (argsIssue) {
      return `${path}.args must be an array of strings`;
    }
    return `${path} must be a string or command object`;
  }

  if (path.endsWith(".timeoutMs") || path.endsWith(".maxOutputBytes")) {
    return `${path} must be a positive integer`;
  }

  if (path.endsWith(".args")) {
    return `${path} must be an array of strings`;
  }

  return `${path} ${issue.message}`;
}

export function formatKRNConfigIssues(error: z.ZodError): string[] {
  return error.issues.map(normalizeIssueMessage);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function validateDefaultProfileReference(value: unknown): string[] {
  if (!isRecord(value) || !isRecord(value.verify)) {
    return [];
  }

  const { defaultProfile, profiles } = value.verify;
  if (
    typeof defaultProfile === "string" &&
    isRecord(profiles) &&
    profiles[defaultProfile] === undefined
  ) {
    return ["verify.defaultProfile must reference a configured profile"];
  }

  return [];
}

export function validateKRNConfig(value: unknown): string[] {
  const parsed = KRNConfigSchema.safeParse(value);
  const issues = parsed.success ? [] : formatKRNConfigIssues(parsed.error);
  for (const issue of validateDefaultProfileReference(value)) {
    if (!issues.includes(issue)) {
      issues.push(issue);
    }
  }

  return issues;
}

export function parseKRNConfig(value: unknown): KRNConfig {
  const issues = validateKRNConfig(value);
  if (issues.length > 0) {
    throw new Error(issues.join("; "));
  }

  return KRNConfigSchema.parse(value);
}

export function isKRNConfig(value: unknown): value is KRNConfig {
  return KRNConfigSchema.safeParse(value).success;
}
