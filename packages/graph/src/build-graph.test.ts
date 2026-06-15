import { mkdir, mkdtemp, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { buildGraph } from "./build-graph.js";
import { graphPathExclusionFor } from "./scan-policy.js";

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
    expect(graph.nodes).toContainEqual(
      expect.objectContaining({
        id: "package:fixtures/repos/downstream-basic",
        kind: "package",
        label: "downstream-basic",
        evidencePath: "fixtures/repos/downstream-basic",
      }),
    );
    expect(graph.nodes).toContainEqual(
      expect.objectContaining({
        id: "source-file:fixtures/repos/downstream-basic/src/index.ts",
        kind: "source-file",
      }),
    );
    expect(graph.nodes).toContainEqual(
      expect.objectContaining({
        id: "module-file:fixtures/repos/downstream-basic/src/index.test.ts",
        kind: "module-file",
      }),
    );
    expect(graph.nodes).toContainEqual(
      expect.objectContaining({
        id: "test-file:fixtures/repos/downstream-basic/src/index.test.ts",
        kind: "test-file",
      }),
    );
    expect(graph.edges).toContainEqual(
      expect.objectContaining({
        from: "package-json:package.json",
        to: "package-script:package.json#test",
        kind: "declares-script",
        evidencePath: "package.json",
      }),
    );
    expect(graph.edges).toContainEqual(
      expect.objectContaining({
        from: "package:fixtures/repos/downstream-basic",
        to: "source-file:fixtures/repos/downstream-basic/src/index.ts",
        kind: "owns-source",
        evidencePath: "fixtures/repos/downstream-basic/src/index.ts",
      }),
    );
    expect(graph.edges).toContainEqual(
      expect.objectContaining({
        from: "package:fixtures/repos/downstream-basic",
        to: "test-file:fixtures/repos/downstream-basic/src/index.test.ts",
        kind: "owns-test",
        evidencePath: "fixtures/repos/downstream-basic/src/index.test.ts",
      }),
    );
    expect(graph.edges).toContainEqual(
      expect.objectContaining({
        from: "test-file:fixtures/repos/downstream-basic/src/index.test.ts",
        to: "source-file:fixtures/repos/downstream-basic/src/index.ts",
        kind: "tests-source",
        evidencePath: "fixtures/repos/downstream-basic/src/index.test.ts",
      }),
    );
    expect(graph.edges).toContainEqual(
      expect.objectContaining({
        from: "module-file:fixtures/repos/downstream-basic/src/index.test.ts",
        to: "module-file:fixtures/repos/downstream-basic/src/index.ts",
        kind: "imports-file",
        evidencePath: "fixtures/repos/downstream-basic/src/index.test.ts",
      }),
    );
    expect(graph.edges).toContainEqual(
      expect.objectContaining({
        from: "package:fixtures/repos/downstream-basic",
        to: "doc:fixtures/repos/downstream-basic/docs/overview.md",
        kind: "owns-doc",
      }),
    );
    expect(graph.edges).toContainEqual(
      expect.objectContaining({
        from: "package:fixtures/repos/downstream-basic",
        to: "config-file:fixtures/repos/downstream-basic/krn.config.json",
        kind: "owns-config",
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
    expect(graph.nodes).toContainEqual(
      expect.objectContaining({
        id: "acf-group:group_hero",
        kind: "acf-group",
        evidencePath: "fixtures/repos/wordpress-acf-theme/acf/group_hero.json",
        status: "available",
      }),
    );
    expect(graph.nodes).toContainEqual(
      expect.objectContaining({
        id: "acf-group:group_legacy_hero",
        kind: "acf-group",
        evidencePath: "fixtures/repos/wordpress-acf-theme/acf/legacy_group.json",
        status: "deprecated",
      }),
    );
    expect(graph.edges).toContainEqual(
      expect.objectContaining({
        from: "wordpress-site:fixtures/repos/wordpress-acf-theme",
        to: "file:fixtures/repos/wordpress-acf-theme/acf/group_hero.json",
        kind: "has-acf-json",
      }),
    );
    expect(graph.edges).toContainEqual(
      expect.objectContaining({
        from: "wordpress-site:fixtures/repos/wordpress-acf-theme",
        to: "file:fixtures/repos/wordpress-acf-theme/src/theme/template-parts/hero.php",
        kind: "has-theme-file",
      }),
    );
    expect(graph.edges).toContainEqual(
      expect.objectContaining({
        from: "package:fixtures/repos/wordpress-acf-theme",
        to: "source-file:fixtures/repos/wordpress-acf-theme/src/theme/assets/hero.js",
        kind: "owns-source",
      }),
    );
  });

  it("detects root downstream tests as package-owned proof files", async () => {
    const graph = await buildGraph(path.join(repoRoot, "fixtures/repos/wordpress-acf-theme"));

    expect(graph.nodes).toContainEqual(
      expect.objectContaining({
        id: "package:.",
        kind: "package",
        label: "wordpress-acf-theme",
        evidencePath: ".",
      }),
    );
    expect(graph.edges).toContainEqual(
      expect.objectContaining({
        from: "package:.",
        to: "test-file:tests/theme.test.js",
        kind: "owns-test",
        evidencePath: "tests/theme.test.js",
      }),
    );
    expect(graph.edges).toContainEqual(
      expect.objectContaining({
        from: "package:.",
        to: "source-file:src/theme/assets/hero.js",
        kind: "owns-source",
        evidencePath: "src/theme/assets/hero.js",
      }),
    );
  });

  it("excludes task do-not-use paths before content-reading detectors run", async () => {
    const cwd = await mkdtemp(path.join(os.tmpdir(), "krn-graph-policy-"));
    await mkdir(path.join(cwd, "raw", "acf-json"), { recursive: true });
    await writeFile(path.join(cwd, "raw", "acf-json", "broken.json"), "{not json", "utf8");
    await writeFile(path.join(cwd, "README.md"), "# Fixture\n", "utf8");

    const graph = await buildGraph(cwd, undefined, {
      excludePathPatterns: ["raw/**"],
    });

    expect(
      graphPathExclusionFor("raw/acf-json/broken.json", { excludePathPatterns: ["raw/**"] }),
    ).toEqual({
      reason: "task-do-not-use",
      pattern: "raw/**",
    });
    expect(graph.nodes.map((node) => node.evidencePath).join("\n")).not.toContain(
      "raw/acf-json/broken.json",
    );
  });

  it("excludes protected-looking paths before content-reading detectors run", async () => {
    const cwd = await mkdtemp(path.join(os.tmpdir(), "krn-graph-protected-"));
    await mkdir(path.join(cwd, "acf-json"), { recursive: true });
    await writeFile(path.join(cwd, "acf-json", "private-secret.json"), "{not json", "utf8");
    await writeFile(path.join(cwd, "README.md"), "# Fixture\n", "utf8");

    const graph = await buildGraph(cwd);

    expect(graphPathExclusionFor("acf-json/private-secret.json")).toEqual({
      reason: "protected-looking",
    });
    expect(graph.nodes.map((node) => node.evidencePath).join("\n")).not.toContain(
      "acf-json/private-secret.json",
    );
  });
});
