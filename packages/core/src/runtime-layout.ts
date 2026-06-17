import path from "node:path";

export const defaultRuntimeDir = ".krn" as const;

export interface RuntimeLayout {
  root: string;
  currentDir: string;
  graphDir: string;
  tracesDir: string;
  runsDir: string;
  memoryDir: string;
  evalsDir: string;
  runBundleDir: string;
  reportBundleDir: string;
  releaseBundleDir: string;
}

const runtimeLayoutCache = new Map<string, RuntimeLayout>();

function cacheKey(cwd: string): string {
  return path.resolve(cwd);
}

export function runtimePath(...segments: string[]): string {
  return segments.join("/");
}

export function buildRuntimeLayout(root: string = defaultRuntimeDir): RuntimeLayout {
  const currentDir = runtimePath(root, "current");

  return {
    root,
    currentDir,
    graphDir: runtimePath(root, "graph"),
    tracesDir: runtimePath(root, "traces"),
    runsDir: runtimePath(root, "runs"),
    memoryDir: runtimePath(root, "memory"),
    evalsDir: runtimePath(root, "evals"),
    runBundleDir: runtimePath(currentDir, "run-bundle"),
    reportBundleDir: runtimePath(currentDir, "report-bundle"),
    releaseBundleDir: runtimePath(currentDir, "release-bundle"),
  };
}

export function setRuntimeLayout(cwd: string, layout: RuntimeLayout): void {
  runtimeLayoutCache.set(cacheKey(cwd), layout);
}

export function getRuntimeLayout(cwd: string): RuntimeLayout {
  return runtimeLayoutCache.get(cacheKey(cwd)) ?? buildRuntimeLayout();
}

export function getRuntimeDir(cwd: string): string {
  return getRuntimeLayout(cwd).root;
}
