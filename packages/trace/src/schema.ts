import { z } from "zod";

export const traceEventNames = [
  "cli.status",
  "task.started",
  "graph.built",
  "context.built",
  "verify.ran",
  "handoff.created",
  "install.ran",
  "doctor.ran",
  "eval.ran",
  "summary.ran",
  "review.ran",
  "report.ran",
  "memory.proposed",
  "memory.approved",
  "memory.deprecated",
  "memory.listed",
  "hook.received",
] as const;

export const TraceEventNameSchema = z.enum(traceEventNames);

export const JsonPrimitiveSchema = z.union([z.string(), z.number(), z.boolean(), z.null()]);
export type JsonPrimitive = z.infer<typeof JsonPrimitiveSchema>;
export type JsonValue = JsonPrimitive | JsonValue[] | { [key: string]: JsonValue };
export const JsonValueSchema: z.ZodType<JsonValue> = z.lazy(() =>
  z.union([JsonPrimitiveSchema, z.array(JsonValueSchema), z.record(z.string(), JsonValueSchema)]),
);

export const TraceEventSchema = z.object({
  id: z.string(),
  timestamp: z.string(),
  name: TraceEventNameSchema,
  taskId: z.string().optional(),
  data: z.record(z.string(), JsonValueSchema).optional(),
});

export type TraceEventName = z.infer<typeof TraceEventNameSchema>;
export type TraceEvent = z.infer<typeof TraceEventSchema>;

export function isTraceEventName(value: unknown): value is TraceEventName {
  return TraceEventNameSchema.safeParse(value).success;
}

function formatPath(path: PropertyKey[]): string {
  return path.reduce<string>((formatted, part) => {
    if (typeof part === "number") {
      return `${formatted}[${part}]`;
    }
    return formatted ? `${formatted}.${String(part)}` : String(part);
  }, "");
}

export function formatTraceEventIssues(error: z.ZodError): string[] {
  return error.issues.map((issue) => {
    const path = formatPath(issue.path);
    return path ? `${path} ${issue.message}` : issue.message;
  });
}

export function parseTraceEvent(value: unknown): TraceEvent {
  const parsed = TraceEventSchema.safeParse(value);
  if (!parsed.success) {
    throw new Error(`Invalid trace event: ${formatTraceEventIssues(parsed.error).join("; ")}`);
  }

  return parsed.data;
}
