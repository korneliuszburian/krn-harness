import { readFile } from "node:fs/promises";
import path from "node:path";
import type { GraphDetector, GraphEdge, GraphNode } from "../graph-types.js";
import { graphPathJoin, toGraphPath, walkFiles } from "../path-utils.js";

const sourceExtensions = new Set([".css", ".js", ".jsx", ".php", ".ts", ".tsx"]);
const configFileNames = new Set(["composer.json", "krn.config.json", "package.json"]);

interface PackageJsonShape {
  name?: string;
}

interface PackageSummary {
  root: string;
  label: string;
}

function uniqueSorted(values: Iterable<string>): string[] {
  return [...new Set(values)].sort((left, right) => left.localeCompare(right));
}

function basenameWithoutKnownTestSuffix(filePath: string): string | undefined {
  const basename = path.posix.basename(filePath);
  const extension = path.posix.extname(basename);
  const stem = basename.slice(0, -extension.length);
  const sourceStem = stem.replace(/\.(test|spec)$/, "");

  if (sourceStem === stem) {
    return undefined;
  }

  return `${sourceStem}${extension}`;
}

function packageRootFor(graphPath: string): string | undefined {
  const parts = graphPath.split("/");

  if (parts[0] === "packages" && parts[1]) {
    return graphPathJoin(parts[0], parts[1]);
  }

  if (parts[0] === "fixtures" && parts[1] === "repos" && parts[2]) {
    return graphPathJoin(parts[0], parts[1], parts[2]);
  }

  if (
    parts[0] === "src" ||
    parts[0] === "docs" ||
    parts[0] === "test" ||
    parts[0] === "tests" ||
    parts[0] === "__tests__" ||
    graphPath === "README.md" ||
    configFileNames.has(path.posix.basename(graphPath))
  ) {
    return ".";
  }

  return undefined;
}

function isTestPath(graphPath: string): boolean {
  const basename = path.posix.basename(graphPath);
  return (
    graphPath.includes("/__tests__/") ||
    graphPath.includes("/test/") ||
    graphPath.includes("/tests/") ||
    /\.(test|spec)\.[cm]?[jt]sx?$/.test(basename)
  );
}

function isDocPath(graphPath: string): boolean {
  return graphPath.endsWith(".md");
}

function isConfigPath(graphPath: string): boolean {
  return configFileNames.has(path.posix.basename(graphPath));
}

function isSourcePath(graphPath: string): boolean {
  const extension = path.posix.extname(graphPath);
  return sourceExtensions.has(extension) && !isTestPath(graphPath);
}

function packageRelativePath(packageRoot: string, graphPath: string): string {
  return packageRoot === "." ? graphPath : graphPath.slice(packageRoot.length + 1);
}

async function packageLabelFor(
  cwd: string,
  packageRoot: string,
  packageJsonPaths: Set<string>,
): Promise<string> {
  const packageJsonPath = packageRoot === "." ? "package.json" : `${packageRoot}/package.json`;

  if (!packageJsonPaths.has(packageJsonPath)) {
    return packageRoot === "." ? "root" : packageRoot;
  }

  try {
    const pkg = JSON.parse(
      await readFile(path.join(cwd, packageJsonPath), "utf8"),
    ) as PackageJsonShape;
    return pkg.name ?? (packageRoot === "." ? "root" : packageRoot);
  } catch {
    return packageRoot === "." ? "root" : packageRoot;
  }
}

function packageNode(summary: PackageSummary): GraphNode {
  return {
    id: `package:${summary.root}`,
    kind: "package",
    label: summary.label,
    evidencePath: summary.root,
  };
}

function ownedNode(kind: string, graphPath: string): GraphNode {
  const idPrefix = kind === "doc" ? "doc" : kind;

  return {
    id: `${idPrefix}:${graphPath}`,
    kind,
    label: graphPath,
    evidencePath: graphPath,
  };
}

export const packageConventionsDetector: GraphDetector = {
  name: "package-conventions",
  async detect(cwd) {
    const graphPaths = (await walkFiles(cwd)).map((file) => toGraphPath(cwd, file));
    const packageJsonPaths = new Set(
      graphPaths.filter((graphPath) => path.posix.basename(graphPath) === "package.json"),
    );
    const packageRoots = uniqueSorted(
      graphPaths.flatMap((graphPath) => {
        const packageRoot = packageRootFor(graphPath);
        return packageRoot ? [packageRoot] : [];
      }),
    );
    const packageSummaries = await Promise.all(
      packageRoots.map(async (root) => ({
        root,
        label: await packageLabelFor(cwd, root, packageJsonPaths),
      })),
    );
    const nodes: GraphNode[] = packageSummaries.map(packageNode);
    const edges: GraphEdge[] = [];
    const sourcePaths = new Set(graphPaths.filter(isSourcePath));

    for (const graphPath of graphPaths) {
      const packageRoot = packageRootFor(graphPath);
      if (!packageRoot) {
        continue;
      }

      const packageId = `package:${packageRoot}`;
      const relativePath = packageRelativePath(packageRoot, graphPath);

      if (isDocPath(graphPath)) {
        edges.push({
          from: packageId,
          to: `doc:${graphPath}`,
          kind: "owns-doc",
          evidencePath: graphPath,
        });
        continue;
      }

      if (isConfigPath(graphPath)) {
        nodes.push(ownedNode("config-file", graphPath));
        edges.push({
          from: packageId,
          to: `config-file:${graphPath}`,
          kind: "owns-config",
          evidencePath: graphPath,
        });
        continue;
      }

      if (isTestPath(graphPath)) {
        nodes.push(ownedNode("test-file", graphPath));
        edges.push({
          from: packageId,
          to: `test-file:${graphPath}`,
          kind: "owns-test",
          evidencePath: graphPath,
        });

        const sourceBasename = basenameWithoutKnownTestSuffix(relativePath);
        if (sourceBasename) {
          const sourceRelativePath = graphPathJoin(
            path.posix.dirname(relativePath),
            sourceBasename,
          );
          const sourceGraphPath =
            packageRoot === "."
              ? sourceRelativePath
              : graphPathJoin(packageRoot, sourceRelativePath);

          if (sourcePaths.has(sourceGraphPath)) {
            edges.push({
              from: `test-file:${graphPath}`,
              to: `source-file:${sourceGraphPath}`,
              kind: "tests-source",
              evidencePath: graphPath,
            });
          }
        }
        continue;
      }

      if (isSourcePath(graphPath)) {
        nodes.push(ownedNode("source-file", graphPath));
        edges.push({
          from: packageId,
          to: `source-file:${graphPath}`,
          kind: "owns-source",
          evidencePath: graphPath,
        });
      }
    }

    return { nodes, edges };
  },
};
