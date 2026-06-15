import { readFile } from "node:fs/promises";
import path from "node:path";
import type { GraphDetector, GraphEdge, GraphNode } from "../graph-types.js";
import { graphPathJoin, toGraphPath, walkFiles } from "../path-utils.js";

const moduleExtensions = [".ts", ".tsx", ".js", ".jsx", ".mjs", ".cjs"] as const;
const moduleExtensionSet = new Set<string>(moduleExtensions);

function stripComments(source: string): string {
  return source.replace(/\/\*[\s\S]*?\*\//g, "").replace(/(^|[^:])\/\/.*$/gm, "$1");
}

function importSpecifiers(source: string): string[] {
  const withoutComments = stripComments(source);
  const patterns = [
    /\bimport\s+(?:type\s+)?(?:[^'";]*?\s+from\s+)?["']([^"']+)["']/g,
    /\bexport\s+(?:type\s+)?(?:\*|[^'";]*?)\s+from\s+["']([^"']+)["']/g,
    /\bimport\s*\(\s*["']([^"']+)["']\s*\)/g,
    /\brequire\s*\(\s*["']([^"']+)["']\s*\)/g,
  ];
  const specifiers = patterns.flatMap((pattern) =>
    [...withoutComments.matchAll(pattern)].flatMap((match) => (match[1] ? [match[1]] : [])),
  );

  return [...new Set(specifiers)].sort((left, right) => left.localeCompare(right));
}

function normalizedRelativeImportPath(importerPath: string, specifier: string): string | undefined {
  if (!specifier.startsWith(".")) {
    return undefined;
  }

  const importerDir = path.posix.dirname(importerPath);
  const joined = graphPathJoin(importerDir === "." ? "" : importerDir, specifier);
  const normalized = path.posix.normalize(joined).replace(/^\.\//, "");

  if (normalized.startsWith("../") || normalized === "..") {
    return undefined;
  }

  return normalized;
}

function candidateImportPaths(importPath: string): string[] {
  const extension = path.posix.extname(importPath);
  const withoutExtension = extension ? importPath.slice(0, -extension.length) : importPath;
  const candidates = [importPath];

  for (const moduleExtension of moduleExtensions) {
    candidates.push(`${withoutExtension}${moduleExtension}`);
  }

  for (const moduleExtension of moduleExtensions) {
    candidates.push(graphPathJoin(importPath, `index${moduleExtension}`));
  }

  return [...new Set(candidates)];
}

function resolveLocalImport(
  importerPath: string,
  specifier: string,
  modulePaths: Set<string>,
): string | undefined {
  const relativeImportPath = normalizedRelativeImportPath(importerPath, specifier);
  if (!relativeImportPath) {
    return undefined;
  }

  return candidateImportPaths(relativeImportPath).find((candidate) => modulePaths.has(candidate));
}

function moduleNode(graphPath: string): GraphNode {
  return {
    id: `module-file:${graphPath}`,
    kind: "module-file",
    label: graphPath,
    evidencePath: graphPath,
  };
}

export const moduleImportsDetector: GraphDetector = {
  name: "module-imports",
  async detect(cwd) {
    const moduleFiles = await walkFiles(cwd, moduleExtensionSet);
    const modulePaths = moduleFiles.map((file) => toGraphPath(cwd, file));
    const modulePathSet = new Set(modulePaths);
    const nodes: GraphNode[] = modulePaths.map(moduleNode);
    const edges: GraphEdge[] = [];

    for (const moduleFile of moduleFiles) {
      const importerPath = toGraphPath(cwd, moduleFile);
      const source = await readFile(moduleFile, "utf8");

      for (const specifier of importSpecifiers(source)) {
        const importedPath = resolveLocalImport(importerPath, specifier, modulePathSet);

        if (!importedPath) {
          continue;
        }

        edges.push({
          from: `module-file:${importerPath}`,
          to: `module-file:${importedPath}`,
          kind: "imports-file",
          evidencePath: importerPath,
        });
      }
    }

    return { nodes, edges };
  },
};
