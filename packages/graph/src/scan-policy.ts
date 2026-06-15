export const protectedGraphPathPolicy = "protected-looking-v1";

export interface GraphScanPolicyInput {
  excludePathPatterns?: string[] | undefined;
  excludeProtectedPaths?: boolean | undefined;
}

export interface GraphScanPolicy {
  excludePathPatterns: string[];
  excludeProtectedPaths: boolean;
  protectedPathPolicy: typeof protectedGraphPathPolicy;
}

export type GraphPathExclusionReason = "task-do-not-use" | "protected-looking";

export interface GraphPathExclusion {
  reason: GraphPathExclusionReason;
  pattern?: string | undefined;
}

export function normalizeGraphPath(value: string): string {
  return value.replaceAll("\\", "/").replace(/^\.\//, "").replace(/\/+$/, "");
}

function normalizePattern(value: string): string {
  return normalizeGraphPath(value.trim());
}

export function createGraphScanPolicy(input: GraphScanPolicyInput = {}): GraphScanPolicy {
  return {
    excludePathPatterns: [
      ...new Set((input.excludePathPatterns ?? []).map(normalizePattern).filter(Boolean)),
    ].sort((left, right) => left.localeCompare(right)),
    excludeProtectedPaths: input.excludeProtectedPaths ?? true,
    protectedPathPolicy: protectedGraphPathPolicy,
  };
}

function globPatternToRegExp(pattern: string): RegExp {
  const sentinel = "\0GLOBSTAR\0";
  const singleStar = "\0STAR\0";
  const withSentinels = pattern.replaceAll("**", sentinel).replaceAll("*", singleStar);
  const escaped = withSentinels
    .replace(/[.+?^${}()|[\]\\]/gu, "\\$&")
    .replaceAll(sentinel, ".*")
    .replaceAll(singleStar, "[^/]*");

  return new RegExp(`^${escaped}$`, "u");
}

function matchesPattern(graphPath: string, pattern: string): boolean {
  if (pattern.includes("*")) {
    return globPatternToRegExp(pattern).test(graphPath);
  }

  return graphPath === pattern || graphPath.startsWith(`${pattern}/`);
}

function isProtectedLookingGraphPath(graphPath: string): boolean {
  const parts = normalizeGraphPath(graphPath).toLowerCase().split("/").filter(Boolean);
  const basename = parts.at(-1) ?? "";

  return (
    basename === ".env" ||
    basename.startsWith(".env.") ||
    basename === "id_rsa" ||
    /\.(sql|dump|bak|backup|pem|key)$/iu.test(basename) ||
    parts.some((part) => /credential|secret|private/u.test(part))
  );
}

export function graphPathExclusionFor(
  graphPathInput: string,
  policyInput: GraphScanPolicyInput | GraphScanPolicy = {},
): GraphPathExclusion | undefined {
  const graphPath = normalizeGraphPath(graphPathInput);
  const policy =
    "protectedPathPolicy" in policyInput ? policyInput : createGraphScanPolicy(policyInput);

  for (const pattern of policy.excludePathPatterns) {
    if (matchesPattern(graphPath, pattern)) {
      return { reason: "task-do-not-use", pattern };
    }
  }

  if (policy.excludeProtectedPaths && isProtectedLookingGraphPath(graphPath)) {
    return { reason: "protected-looking" };
  }

  return undefined;
}
