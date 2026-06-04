import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { buildGraph } from "./build-graph.js";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../..");

describe("graph-lite detector v0", () => {
  it("detects filesystem, docs status, scripts, CSS class, and tiny WordPress/ACF fixture relations", async () => {
    const graph = await buildGraph(repoRoot);

    expect(graph.nodes).toContainEqual(
      expect.objectContaining({ id: "fs:fixtures", kind: "directory", evidencePath: "fixtures" }),
    );
    expect(graph.nodes).toContainEqual(
      expect.objectContaining({ id: "package-script:package.json#test", kind: "package-script" }),
    );
    expect(graph.edges).toContainEqual(
      expect.objectContaining({
        from: "package-json:package.json",
        to: "package-script:package.json#test",
        kind: "declares-script",
        evidencePath: "package.json",
      }),
    );
    expect(graph.nodes).toContainEqual(
      expect.objectContaining({
        id: "composer-json:fixtures/repos/wordpress-acf-basic/composer.json",
        kind: "composer-json",
        label: "fixture/wordpress-acf-basic",
      }),
    );
    expect(graph.edges).toContainEqual(
      expect.objectContaining({
        from: "composer-json:fixtures/repos/wordpress-acf-basic/composer.json",
        to: "composer-script:fixtures/repos/wordpress-acf-basic/composer.json#test",
        kind: "declares-script",
      }),
    );
    expect(graph.edges).toContainEqual(
      expect.objectContaining({
        from: "file:fixtures/repos/frontend-section-context/theme/templates/section.php",
        to: "file:fixtures/repos/frontend-section-context/theme/assets/section.css",
        kind: "style-related-to",
      }),
    );
    expect(graph.nodes).toContainEqual(
      expect.objectContaining({
        id: "acf-group:group_fixture_section",
        kind: "acf-group",
        evidencePath: "fixtures/repos/frontend-section-context/acf-json/section.json",
      }),
    );
    expect(graph.edges).toContainEqual(
      expect.objectContaining({
        from: "acf-group:group_fixture_section",
        to: "acf-field:heading",
        kind: "declares-acf-field",
      }),
    );
    expect(graph.nodes).toContainEqual(
      expect.objectContaining({
        id: "doc:fixtures/repos/docs-heavy-stale/docs/old-plan.md",
        kind: "doc",
        status: "deprecated",
      }),
    );
    expect(graph.edges).toContainEqual(
      expect.objectContaining({
        from: "wordpress-site:fixtures/repos/frontend-section-context",
        to: "file:fixtures/repos/frontend-section-context/acf-json/section.json",
        kind: "has-acf-json",
      }),
    );
  });
});
