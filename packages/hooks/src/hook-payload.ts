import type { HookPayload } from "./hook-types.js";

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export function parseCodexHookPayload(raw: string | undefined): HookPayload {
  if (!raw || raw.trim().length === 0) {
    return { source: "placeholder" };
  }

  try {
    return {
      source: "stdin-json",
      parsed: JSON.parse(raw) as unknown,
    };
  } catch (error) {
    return {
      source: "stdin-invalid-json",
      invalidReason: error instanceof Error ? error.message : "Invalid JSON",
    };
  }
}

export function normalizeHookPath(filePath: string): string {
  return filePath.trim().replaceAll("\\", "/").replace(/^\.\//, "");
}

export function pathMatches(candidate: string, scopedPath: string): boolean {
  const normalizedCandidate = normalizeHookPath(candidate);
  const normalizedScopedPath = normalizeHookPath(scopedPath);

  return (
    normalizedCandidate === normalizedScopedPath ||
    normalizedCandidate.startsWith(`${normalizedScopedPath}/`)
  );
}

export function uniqueSortedPaths(paths: string[]): string[] {
  return [...new Set(paths.map(normalizeHookPath).filter((item) => item.length > 0))].sort(
    (left, right) => left.localeCompare(right),
  );
}

export function isBroadProofPathHint(filePath: string): boolean {
  const normalized = normalizeHookPath(filePath).replace(/\/+$/, "");

  return (
    normalized.length === 0 ||
    normalized === "docs" ||
    normalized === "fixtures" ||
    normalized === "test" ||
    normalized === "tests" ||
    normalized === "packages"
  );
}

function collectPathsFromPatch(text: string): string[] {
  const paths: string[] = [];

  for (const line of text.split("\n")) {
    const fileMatch = /^\*\*\* (?:Add|Update|Delete) File: (.+)$/.exec(line);
    if (fileMatch?.[1]) {
      paths.push(fileMatch[1]);
    }

    const diffMatch = /^(?:--- a|\+\+\+ b)\/(.+)$/.exec(line);
    if (diffMatch?.[1] && diffMatch[1] !== "/dev/null") {
      paths.push(diffMatch[1]);
    }
  }

  return paths;
}

function collectPathValues(value: unknown, parentKey = ""): string[] {
  if (typeof value === "string") {
    const paths = /(^|_|\b)(path|file_path|filepath|relative_path|relativepath)$/i.test(parentKey)
      ? [value]
      : [];

    if (/^(patch|diff)$/i.test(parentKey)) {
      paths.push(...collectPathsFromPatch(value));
    }

    return paths;
  }

  if (Array.isArray(value)) {
    return value.flatMap((item) => collectPathValues(item, parentKey));
  }

  if (isRecord(value)) {
    return Object.entries(value).flatMap(([key, item]) => collectPathValues(item, key));
  }

  return [];
}

export function hookToolName(payload: HookPayload): string | undefined {
  if (!isRecord(payload.parsed)) {
    return undefined;
  }

  for (const key of ["tool", "toolName", "tool_name", "name"]) {
    const value = payload.parsed[key];
    if (typeof value === "string") {
      return value;
    }
  }

  return undefined;
}

export function isEditTool(toolName: string | undefined): boolean {
  if (!toolName) {
    return false;
  }

  const normalized = toolName.toLowerCase();
  return (
    normalized === "edit" ||
    normalized === "write" ||
    normalized === "multiedit" ||
    normalized === "apply_patch" ||
    normalized.endsWith(".apply_patch")
  );
}

export function isProofPath(filePath: string): boolean {
  const normalized = normalizeHookPath(filePath);

  return (
    normalized === "README.md" ||
    normalized === "biome.json" ||
    normalized === "package.json" ||
    normalized === "pnpm-workspace.yaml" ||
    normalized === "tsconfig.json" ||
    normalized === "vitest.config.ts" ||
    normalized.startsWith(".github/workflows/") ||
    normalized.startsWith("docs/") ||
    normalized.startsWith("fixtures/") ||
    normalized.startsWith("tests/") ||
    normalized.startsWith("test/") ||
    normalized.includes("/__tests__/") ||
    /\.test\.[cm]?[jt]sx?$/.test(normalized) ||
    /\.spec\.[cm]?[jt]sx?$/.test(normalized)
  );
}

export function editedPaths(payload: HookPayload): string[] {
  if (!isRecord(payload.parsed)) {
    return [];
  }

  return [...new Set(collectPathValues(payload.parsed).map(normalizeHookPath))].sort();
}
