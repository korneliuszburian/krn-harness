import { z } from "zod";

const nonEmptyStringSchema = z.string().trim().min(1);
const optionalNonEmptyStringArraySchema = z.array(nonEmptyStringSchema).optional();

export const TargetValidationCoverageSchema = z.enum([
  "full-suite",
  "fast-quality-gate",
  "smoke",
  "lint-only",
]);

export const TargetValidationBoundarySchema = z.object({
  authority: z.literal("target-owned"),
  command: nonEmptyStringSchema,
  coverage: TargetValidationCoverageSchema,
  reason: nonEmptyStringSchema,
  limitations: optionalNonEmptyStringArraySchema,
  unsafeIf: optionalNonEmptyStringArraySchema,
});

export const TargetIsolationBoundarySchema = z.object({
  isolated: z.literal(true),
  sourceCheckoutRejected: z.literal(true),
  isolatedPath: nonEmptyStringSchema.optional(),
  baseCommit: nonEmptyStringSchema.optional(),
  reason: nonEmptyStringSchema.optional(),
});

export const VisualProofCopyStatusSchema = z.enum(["draft", "approved", "unknown"]);

export const TargetOwnedVisualCommandSchema = z.object({
  authority: z.literal("target-owned"),
  command: nonEmptyStringSchema,
  reason: nonEmptyStringSchema,
  limitations: optionalNonEmptyStringArraySchema,
  unsafeIf: optionalNonEmptyStringArraySchema,
});

export const FrontendVisualProofSchema = z
  .object({
    route: nonEmptyStringSchema.optional(),
    component: nonEmptyStringSchema.optional(),
    viewports: optionalNonEmptyStringArraySchema,
    designConstraints: optionalNonEmptyStringArraySchema,
    a11yExpectations: optionalNonEmptyStringArraySchema,
    copyStatus: VisualProofCopyStatusSchema.optional(),
    manualVisualArtifact: nonEmptyStringSchema.optional(),
    targetOwnedVisualCommand: TargetOwnedVisualCommandSchema.optional(),
  })
  .superRefine((visualProof, context) => {
    const hasArrayEvidence =
      (visualProof.viewports !== undefined && visualProof.viewports.length > 0) ||
      (visualProof.designConstraints !== undefined && visualProof.designConstraints.length > 0) ||
      (visualProof.a11yExpectations !== undefined && visualProof.a11yExpectations.length > 0);
    const hasVisualProofField =
      visualProof.route !== undefined ||
      visualProof.component !== undefined ||
      hasArrayEvidence ||
      visualProof.copyStatus !== undefined ||
      visualProof.manualVisualArtifact !== undefined ||
      visualProof.targetOwnedVisualCommand !== undefined;

    if (!hasVisualProofField) {
      context.addIssue({
        code: "custom",
        message: "must declare at least one visual proof field",
      });
    }
  });

export const TaskSpecBoundariesSchema = z.object({
  targetValidation: TargetValidationBoundarySchema.optional(),
  targetIsolation: TargetIsolationBoundarySchema.optional(),
  rollback: z
    .object({
      boundary: nonEmptyStringSchema,
    })
    .optional(),
  noPush: z.literal(true).optional(),
  noMerge: z.literal(true).optional(),
  targetApproval: z
    .object({
      required: z.literal(true),
      approvalRef: nonEmptyStringSchema.optional(),
    })
    .optional(),
  protectedData: z
    .object({
      allowed: z.literal(false),
      paths: optionalNonEmptyStringArraySchema,
      reason: nonEmptyStringSchema.optional(),
    })
    .optional(),
});

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
  boundaries: TaskSpecBoundariesSchema.optional(),
  visualProof: FrontendVisualProofSchema.optional(),
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
  boundaries: TaskSpecBoundariesSchema.optional(),
  visualProof: FrontendVisualProofSchema.optional(),
});

export type TaskClassification = z.infer<typeof TaskClassificationSchema>;
export type TaskIntentQuality = z.infer<typeof TaskIntentQualitySchema>;
export type TaskMode = z.infer<typeof TaskModeSchema>;
export type AcceptanceCriterionKind = z.infer<typeof AcceptanceCriterionKindSchema>;
export type ProofRequirementKind = z.infer<typeof ProofRequirementKindSchema>;
export type NormalizedAcceptanceCriterion = z.infer<typeof NormalizedAcceptanceCriterionSchema>;
export type NormalizedProofRequirement = z.infer<typeof NormalizedProofRequirementSchema>;
export type StopCondition = z.infer<typeof StopConditionSchema>;
export type TargetValidationCoverage = z.infer<typeof TargetValidationCoverageSchema>;
export type TargetValidationBoundary = z.infer<typeof TargetValidationBoundarySchema>;
export type TargetIsolationBoundary = z.infer<typeof TargetIsolationBoundarySchema>;
export type VisualProofCopyStatus = z.infer<typeof VisualProofCopyStatusSchema>;
export type TargetOwnedVisualCommand = z.infer<typeof TargetOwnedVisualCommandSchema>;
export type FrontendVisualProof = z.infer<typeof FrontendVisualProofSchema>;
export type TaskSpecBoundaries = z.infer<typeof TaskSpecBoundariesSchema>;
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
    path === "requiredDoNotUsePaths" ||
    path === "boundaries.targetValidation.limitations" ||
    path === "boundaries.targetValidation.unsafeIf" ||
    path === "boundaries.protectedData.paths" ||
    path === "visualProof.viewports" ||
    path === "visualProof.designConstraints" ||
    path === "visualProof.a11yExpectations" ||
    path === "visualProof.targetOwnedVisualCommand.limitations" ||
    path === "visualProof.targetOwnedVisualCommand.unsafeIf"
  ) {
    return `${path} must be an array of non-empty strings`;
  }
  if (
    path.startsWith("expectedTouchedFiles[") ||
    path.startsWith("forbiddenTouchedFiles[") ||
    path.startsWith("requiredDoNotUsePaths[") ||
    path.startsWith("boundaries.targetValidation.limitations[") ||
    path.startsWith("boundaries.targetValidation.unsafeIf[") ||
    path.startsWith("boundaries.protectedData.paths[") ||
    path.startsWith("visualProof.viewports[") ||
    path.startsWith("visualProof.designConstraints[") ||
    path.startsWith("visualProof.a11yExpectations[") ||
    path.startsWith("visualProof.targetOwnedVisualCommand.limitations[") ||
    path.startsWith("visualProof.targetOwnedVisualCommand.unsafeIf[")
  ) {
    const [fieldName] = path.split("[");
    return `${fieldName} must be an array of non-empty strings`;
  }
  if (path === "visualProof") {
    if (issue.code === "custom") {
      return "visualProof must declare at least one visual proof field";
    }
    return "visualProof must be an object";
  }
  if (path === "visualProof.route") {
    return "visualProof.route must be a non-empty string";
  }
  if (path === "visualProof.component") {
    return "visualProof.component must be a non-empty string";
  }
  if (path === "visualProof.copyStatus") {
    return "visualProof.copyStatus must be draft, approved, or unknown";
  }
  if (path === "visualProof.manualVisualArtifact") {
    return "visualProof.manualVisualArtifact must be a non-empty string";
  }
  if (path === "visualProof.targetOwnedVisualCommand") {
    return "visualProof.targetOwnedVisualCommand must be an object";
  }
  if (path === "visualProof.targetOwnedVisualCommand.authority") {
    return "visualProof.targetOwnedVisualCommand.authority must be target-owned";
  }
  if (path === "visualProof.targetOwnedVisualCommand.command") {
    return "visualProof.targetOwnedVisualCommand.command must be a non-empty string";
  }
  if (path === "visualProof.targetOwnedVisualCommand.reason") {
    return "visualProof.targetOwnedVisualCommand.reason must be a non-empty string";
  }
  if (path === "boundaries") {
    return "boundaries must be an object";
  }
  if (path === "boundaries.targetValidation") {
    return "boundaries.targetValidation must be an object";
  }
  if (path === "boundaries.targetValidation.authority") {
    return "boundaries.targetValidation.authority must be target-owned";
  }
  if (path === "boundaries.targetValidation.command") {
    return "boundaries.targetValidation.command must be a non-empty string";
  }
  if (path === "boundaries.targetValidation.coverage") {
    return "boundaries.targetValidation.coverage must be full-suite, fast-quality-gate, smoke, or lint-only";
  }
  if (path === "boundaries.targetValidation.reason") {
    return "boundaries.targetValidation.reason must be a non-empty string";
  }
  if (path === "boundaries.targetIsolation") {
    return "boundaries.targetIsolation must be an object";
  }
  if (path === "boundaries.targetIsolation.isolated") {
    return "boundaries.targetIsolation.isolated must be true";
  }
  if (path === "boundaries.targetIsolation.sourceCheckoutRejected") {
    return "boundaries.targetIsolation.sourceCheckoutRejected must be true";
  }
  if (path === "boundaries.targetIsolation.isolatedPath") {
    return "boundaries.targetIsolation.isolatedPath must be a non-empty string";
  }
  if (path === "boundaries.targetIsolation.baseCommit") {
    return "boundaries.targetIsolation.baseCommit must be a non-empty string";
  }
  if (path === "boundaries.targetIsolation.reason") {
    return "boundaries.targetIsolation.reason must be a non-empty string";
  }
  if (path === "boundaries.rollback") {
    return "boundaries.rollback must be an object";
  }
  if (path === "boundaries.rollback.boundary") {
    return "boundaries.rollback.boundary must be a non-empty string";
  }
  if (path === "boundaries.noPush") {
    return "boundaries.noPush must be true";
  }
  if (path === "boundaries.noMerge") {
    return "boundaries.noMerge must be true";
  }
  if (path === "boundaries.targetApproval") {
    return "boundaries.targetApproval must be an object";
  }
  if (path === "boundaries.targetApproval.required") {
    return "boundaries.targetApproval.required must be true";
  }
  if (path === "boundaries.targetApproval.approvalRef") {
    return "boundaries.targetApproval.approvalRef must be a non-empty string";
  }
  if (path === "boundaries.protectedData") {
    return "boundaries.protectedData must be an object";
  }
  if (path === "boundaries.protectedData.allowed") {
    return "boundaries.protectedData.allowed must be false";
  }
  if (path === "boundaries.protectedData.reason") {
    return "boundaries.protectedData.reason must be a non-empty string";
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
