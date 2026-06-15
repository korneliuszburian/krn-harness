import { readdir } from "node:fs/promises";
import path from "node:path";
import { type GraphScanPolicyInput, graphPathExclusionFor } from "./scan-policy.js";

const skippedDirectories = new Set([".git", "node_modules", ".krn", "dist", "coverage"]);

export function toGraphPath(cwd: string, absolutePath: string): string {
  return path.relative(cwd, absolutePath).split(path.sep).join("/") || ".";
}

export function graphPathJoin(...parts: string[]): string {
  return parts.filter(Boolean).join("/").replaceAll(/\/+/g, "/");
}

export async function walkFiles(
  cwd: string,
  extensions?: Set<string>,
  scanPolicy?: GraphScanPolicyInput | undefined,
): Promise<string[]> {
  async function visit(directory: string): Promise<string[]> {
    const entries = await readdir(directory, { withFileTypes: true });
    const nested = await Promise.all(
      entries
        .filter((entry) => !entry.isDirectory() || !skippedDirectories.has(entry.name))
        .map(async (entry) => {
          const absolutePath = path.join(directory, entry.name);
          const graphPath = toGraphPath(cwd, absolutePath);

          if (graphPathExclusionFor(graphPath, scanPolicy)) {
            return [];
          }

          if (entry.isDirectory()) {
            return visit(absolutePath);
          }

          if (!entry.isFile()) {
            return [];
          }

          if (extensions && !extensions.has(path.extname(entry.name).toLowerCase())) {
            return [];
          }

          return [absolutePath];
        }),
    );

    return nested.flat();
  }

  return (await visit(cwd)).sort((left, right) =>
    toGraphPath(cwd, left).localeCompare(toGraphPath(cwd, right)),
  );
}
