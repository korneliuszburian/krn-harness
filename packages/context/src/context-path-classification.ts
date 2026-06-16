import type { TaskContract } from "../../task-contract/src/index.js";

export interface ContextSelectionHints {
  explicitTaskPaths: Set<string>;
  expectedTouchedPaths: Set<string>;
  doNotUsePaths: string[];
  verifyProfileFocused: boolean;
}

const taskStopWords = new Set([
  "active",
  "avoid",
  "approved",
  "basic",
  "code",
  "context",
  "docs",
  "implement",
  "memories",
  "memory",
  "missing",
  "only",
  "package",
  "relevant",
  "required",
  "root",
  "section",
  "src",
  "stop",
  "task",
  "test",
  "tests",
  "theme",
  "treating",
  "truth",
  "update",
  "using",
  "when",
  "with",
  "work",
  "fixture",
  "fixtures",
  "wordpress",
  "acf",
]);

export function taskTermsFor(task: string): string[] {
  return [
    ...new Set(
      task
        .toLowerCase()
        .split(/[^a-z0-9]+/)
        .filter((term) => term.length >= 4 && !taskStopWords.has(term)),
    ),
  ].sort((left, right) => left.localeCompare(right));
}

export function matchedTermsForText(text: string, terms: string[]): string[] {
  const normalized = text.toLowerCase();
  return terms.filter((term) => normalized.includes(term));
}

export function normalizeContextPath(value: string): string {
  return value.replaceAll("\\", "/").replace(/^\.\//, "").replace(/\/+$/, "");
}

function explicitRepoPathsForTask(task: string): string[] {
  const paths = new Set<string>();
  const pathPattern =
    /(?:^|[\s`"'(])((?:[A-Za-z0-9._-]+\/)+[A-Za-z0-9._-]+\.(?:cjs|js|json|md|mjs|py|toml|ts|tsx|yaml|yml)|[A-Za-z0-9._-]+\.(?:cjs|js|json|md|mjs|py|toml|ts|tsx|yaml|yml))(?:$|[\s`"',.;:)])/g;

  for (const match of task.matchAll(pathPattern)) {
    const rawPath = match[1];
    if (!rawPath) {
      continue;
    }

    const normalized = normalizeContextPath(rawPath);
    if (normalized.length > 0 && !normalized.startsWith("-")) {
      paths.add(normalized);
    }
  }

  return [...paths].sort((left, right) => left.localeCompare(right));
}

export function isPathWithin(pathValue: string, parentPath: string): boolean {
  const pathName = normalizeContextPath(pathValue);
  const parent = normalizeContextPath(parentPath);

  return pathName === parent || pathName.startsWith(`${parent}/`);
}

function isVerifyProfileFocusedTask(task: string): boolean {
  const normalized = task.toLowerCase();

  return (
    normalized.includes("verify") &&
    (normalized.includes("verify --execute") ||
      normalized.includes("verify profile") ||
      normalized.includes("readonly profile") ||
      normalized.includes("check_all_readonly"))
  );
}

export function selectionHintsFor(contract: TaskContract | undefined): ContextSelectionHints {
  const task = contract?.task ?? "";
  const expectedTouchedPaths = new Set(
    (contract?.metadata?.expectedTouchedFiles ?? []).map(normalizeContextPath),
  );
  const doNotUsePaths = (contract?.metadata?.requiredDoNotUsePaths ?? []).map(normalizeContextPath);
  const explicitTaskPaths = new Set(
    explicitRepoPathsForTask(task).filter(
      (explicitPath) =>
        !doNotUsePaths.some((doNotUsePath) => isPathWithin(explicitPath, doNotUsePath)),
    ),
  );

  return {
    explicitTaskPaths,
    expectedTouchedPaths,
    doNotUsePaths,
    verifyProfileFocused: isVerifyProfileFocusedTask(task),
  };
}

export function packageIdForContextPath(contextPath: string): string | undefined {
  const parts = contextPath.split("/");

  if (parts[0] === "packages" && parts[1]) {
    return `package:${parts[0]}/${parts[1]}`;
  }

  if (parts[0] === "fixtures" && parts[1] === "repos" && parts[2]) {
    return `package:${parts[0]}/${parts[1]}/${parts[2]}`;
  }

  if (
    parts[0] === "src" ||
    parts[0] === "docs" ||
    parts[0] === "test" ||
    parts[0] === "tests" ||
    parts[0] === "__tests__" ||
    contextPath === "README.md" ||
    contextPath === "package.json" ||
    contextPath === "krn.config.json" ||
    contextPath === "composer.json"
  ) {
    return "package:.";
  }

  return undefined;
}

export function packageRelativeEvidencePath(packageId: string, evidencePath: string): string {
  const packageRoot = packageId.replace(/^package:/, "");
  if (packageRoot === ".") {
    return evidencePath;
  }

  return evidencePath.startsWith(`${packageRoot}/`)
    ? evidencePath.slice(packageRoot.length + 1)
    : evidencePath;
}

export function packageRelativeNodeText(
  packageId: string,
  node: { label: string; evidencePath: string } | undefined,
): string {
  if (!node) {
    return "";
  }

  return packageRelativeEvidencePath(packageId, node.evidencePath);
}
