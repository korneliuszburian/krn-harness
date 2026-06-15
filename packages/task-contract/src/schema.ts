import { z } from "zod";

const nonEmptyStringSchema = z.string().trim().min(1);
const optionalNonEmptyStringArraySchema = z.array(nonEmptyStringSchema).optional();

export const TaskClassificationSchema = z.enum([
  "implementation",
  "docs",
  "research",
  "review",
  "unknown",
]);
export const TaskIntentQualitySchema = z.enum(["low", "medium", "high"]);
export const TaskModeSchema = z.enum(["edit", "read-only", "review", "unknown"]);
export const AcceptanceCriterionKindSchema = z.enum([
  "scope",
  "context",
  "validation",
  "safety",
  "documentation",
  "unknown",
]);
export const ProofRequirementKindSchema = z.enum([
  "verify",
  "handoff",
  "artifact",
  "review",
  "command",
  "unknown",
]);

export const NormalizedAcceptanceCriterionSchema = z.object({
  id: z.string(),
  text: z.string(),
  kind: AcceptanceCriterionKindSchema,
  required: z.literal(true),
});

export const NormalizedProofRequirementSchema = z.object({
  id: z.string(),
  text: z.string(),
  kind: ProofRequirementKindSchema,
  required: z.literal(true),
});

export const StopConditionSchema = z.object({
  code: z.string(),
  reason: z.string(),
  active: z.boolean(),
});

export const TaskContractMetadataSchema = z.object({
  taskSpecPath: z.string().optional(),
  expectedTouchedFiles: z.array(z.string()).optional(),
  forbiddenTouchedFiles: z.array(z.string()).optional(),
  requiredDoNotUsePaths: z.array(z.string()).optional(),
});

export const TaskContractSchema = z
  .object({
    id: z.string(),
    rawUserIntent: z.string(),
    task: z.string(),
    intentQuality: TaskIntentQualitySchema,
    intentWarnings: z.array(z.string()),
    metadata: TaskContractMetadataSchema.optional(),
    interpretation: z.string().min(1),
    classification: TaskClassificationSchema,
    mode: TaskModeSchema,
    nonTrivial: z.boolean(),
    acceptance: z.array(z.string()),
    proof: z.array(z.string()),
    evidenceRequirements: z.array(z.string()).min(1),
    stopConditions: z.array(StopConditionSchema),
    stop: z.boolean(),
    stopReason: z.string().optional(),
  })
  .superRefine((contract, context) => {
    if (!contract.stop && contract.task.trim().length === 0) {
      context.addIssue({
        code: "custom",
        path: ["task"],
        message: "is required unless STOP is set",
      });
    }
    if (!contract.stop && contract.rawUserIntent.trim().length === 0) {
      context.addIssue({
        code: "custom",
        path: ["rawUserIntent"],
        message: "is required unless STOP is set",
      });
    }
  });

export const TaskSpecInputSchema = z.object({
  prompt: nonEmptyStringSchema,
  expectedTouchedFiles: optionalNonEmptyStringArraySchema,
  forbiddenTouchedFiles: optionalNonEmptyStringArraySchema,
  requiredDoNotUsePaths: optionalNonEmptyStringArraySchema,
});

export type TaskClassification = z.infer<typeof TaskClassificationSchema>;
export type TaskIntentQuality = z.infer<typeof TaskIntentQualitySchema>;
export type TaskMode = z.infer<typeof TaskModeSchema>;
export type AcceptanceCriterionKind = z.infer<typeof AcceptanceCriterionKindSchema>;
export type ProofRequirementKind = z.infer<typeof ProofRequirementKindSchema>;
export type NormalizedAcceptanceCriterion = z.infer<typeof NormalizedAcceptanceCriterionSchema>;
export type NormalizedProofRequirement = z.infer<typeof NormalizedProofRequirementSchema>;
export type StopCondition = z.infer<typeof StopConditionSchema>;
export type TaskContract = z.infer<typeof TaskContractSchema>;
export type TaskSpecInput = z.infer<typeof TaskSpecInputSchema>;

function formatPath(path: PropertyKey[]): string {
  return path.reduce<string>((formatted, part) => {
    if (typeof part === "number") {
      return `${formatted}[${part}]`;
    }
    return formatted ? `${formatted}.${String(part)}` : String(part);
  }, "");
}

function formatTaskSpecIssue(issue: z.ZodError["issues"][number]): string {
  const path = formatPath(issue.path);
  if (path === "") {
    return "must be an object";
  }
  if (path === "prompt") {
    return "must include a prompt";
  }
  if (
    path === "expectedTouchedFiles" ||
    path === "forbiddenTouchedFiles" ||
    path === "requiredDoNotUsePaths"
  ) {
    return `${path} must be an array of non-empty strings`;
  }
  if (
    path.startsWith("expectedTouchedFiles[") ||
    path.startsWith("forbiddenTouchedFiles[") ||
    path.startsWith("requiredDoNotUsePaths[")
  ) {
    const [fieldName] = path.split("[");
    return `${fieldName} must be an array of non-empty strings`;
  }
  return `${path} ${issue.message}`;
}

export function formatTaskSpecIssues(error: z.ZodError): string[] {
  return [...new Set(error.issues.map(formatTaskSpecIssue))];
}

function formatTaskContractIssue(issue: z.ZodError["issues"][number]): string {
  const path = formatPath(issue.path);
  if (path === "interpretation") {
    return "contract.interpretation is required";
  }
  if (path === "evidenceRequirements") {
    return "contract.evidenceRequirements must not be empty";
  }
  if (path) {
    return `contract.${path} ${issue.message}`;
  }
  return issue.message;
}

export function formatTaskContractIssues(error: z.ZodError): string[] {
  return error.issues.map(formatTaskContractIssue);
}

export function parseTaskSpecInput(value: unknown): TaskSpecInput {
  const parsed = TaskSpecInputSchema.safeParse(value);
  if (!parsed.success) {
    throw new Error(formatTaskSpecIssues(parsed.error).join("; "));
  }

  return parsed.data;
}

export function parseTaskContract(value: unknown): TaskContract {
  return TaskContractSchema.parse(value);
}
