import { readFile } from "node:fs/promises";
import type { GraphDetector, GraphEdge, GraphNode } from "../graph-types.js";
import { toGraphPath, walkFiles } from "../path-utils.js";

const cssClassDefinitionPattern = /\.([_a-zA-Z]+[_a-zA-Z0-9-]*)\b/g;
const classAttributePattern = /class\s*=\s*["']([^"']+)["']/g;

function uniqueSorted(values: Iterable<string>): string[] {
  return [...new Set(values)].sort((left, right) => left.localeCompare(right));
}

export const cssClassDetector: GraphDetector = {
  name: "css-class",
  async detect(cwd) {
    const cssPaths = await walkFiles(cwd, new Set([".css", ".scss"]));
    const markupPaths = await walkFiles(cwd, new Set([".php", ".html", ".tsx", ".jsx"]));
    const nodes: GraphNode[] = [];
    const edges: GraphEdge[] = [];
    const definedClasses = new Map<string, string[]>();

    for (const cssPath of cssPaths) {
      const graphPath = toGraphPath(cwd, cssPath);
      const content = await readFile(cssPath, "utf8");
      const classes = uniqueSorted(
        [...content.matchAll(cssClassDefinitionPattern)].flatMap((match) =>
          match[1] ? [match[1]] : [],
        ),
      );
      const fileId = `file:${graphPath}`;

      nodes.push({ id: fileId, kind: "stylesheet", label: graphPath, evidencePath: graphPath });

      for (const className of classes) {
        const classId = `css-class:${className}`;
        definedClasses.set(className, [...(definedClasses.get(className) ?? []), fileId]);
        nodes.push({ id: classId, kind: "css-class", label: className, evidencePath: graphPath });
        edges.push({
          from: fileId,
          to: classId,
          kind: "defines-css-class",
          evidencePath: graphPath,
        });
      }
    }

    for (const markupPath of markupPaths) {
      const graphPath = toGraphPath(cwd, markupPath);
      const content = await readFile(markupPath, "utf8");
      const classes = uniqueSorted(
        [...content.matchAll(classAttributePattern)].flatMap(
          (match) => match[1]?.split(/\s+/) ?? [],
        ),
      );
      const fileId = `file:${graphPath}`;

      if (classes.length > 0) {
        nodes.push({ id: fileId, kind: "markup", label: graphPath, evidencePath: graphPath });
      }

      for (const className of classes) {
        const classId = `css-class:${className}`;
        nodes.push({ id: classId, kind: "css-class", label: className, evidencePath: graphPath });
        edges.push({ from: fileId, to: classId, kind: "uses-css-class", evidencePath: graphPath });

        for (const stylesheetId of definedClasses.get(className) ?? []) {
          edges.push({
            from: fileId,
            to: stylesheetId,
            kind: "style-related-to",
            evidencePath: graphPath,
          });
        }
      }
    }

    return { nodes, edges };
  },
};
