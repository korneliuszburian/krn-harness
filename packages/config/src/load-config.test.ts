import { mkdtemp, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import type { ValidationError } from "../../core/src/index.js";
import { loadConfig } from "./load-config.js";

const packageRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const fixturesRoot = path.join(packageRoot, "fixtures");

describe("loadConfig", () => {
  it("loads a valid fixture config and preserves deterministic fields", async () => {
    const loaded = await loadConfig(path.join(fixturesRoot, "valid"));

    expect(loaded.source).toBe("file");
    expect(loaded.path).toBe(path.join(fixturesRoot, "valid", "krn.config.json"));
    expect(loaded.config).toEqual({
      version: 1,
      project: {
        name: "valid-fixture",
      },
      runtime: {
        dir: ".krn-fixture",
      },
      verify: {
        commands: ["pnpm test"],
      },
    });
  });

  it("returns the default config when no fixture config exists", async () => {
    const loaded = await loadConfig(path.join(fixturesRoot, "missing"));

    expect(loaded).toEqual({
      source: "default",
      config: {
        version: 1,
        runtime: {
          dir: ".krn",
        },
      },
    });
  });

  it("throws a typed validation error for an invalid config shape", async () => {
    await expect(loadConfig(path.join(fixturesRoot, "invalid-shape"))).rejects.toMatchObject({
      name: "ValidationError",
      code: "KRN_VALIDATION_ERROR",
      message: "krn.config.json is invalid: runtime.dir must be a string",
    } satisfies Partial<ValidationError>);
  });

  it("throws a typed validation error for invalid JSON", async () => {
    const cwd = await mkdtemp(path.join(os.tmpdir(), "krn-config-invalid-json-"));
    await writeFile(path.join(cwd, "krn.config.json"), '{ "version": 1, "runtime": }', "utf8");

    await expect(loadConfig(cwd)).rejects.toMatchObject({
      name: "ValidationError",
      code: "KRN_VALIDATION_ERROR",
      message: "krn.config.json must be valid JSON",
    } satisfies Partial<ValidationError>);
  });

  it("loads valid verify profiles with command objects and limits", async () => {
    const loaded = await loadConfig(path.join(fixturesRoot, "verify-profile-valid"));

    expect(loaded.config.verify).toEqual({
      defaultProfile: "unit",
      mode: "record-only",
      timeoutMs: 30000,
      maxOutputBytes: 4096,
      profiles: {
        unit: {
          commands: [
            {
              command: "node",
              args: ["src/index.test.ts"],
              label: "fixture unit test",
            },
          ],
        },
        quality: {
          commands: ["pnpm lint", "pnpm typecheck", "pnpm test"],
        },
      },
    });
  });

  it("throws a typed validation error for invalid verify profile shape", async () => {
    await expect(
      loadConfig(path.join(fixturesRoot, "verify-profile-invalid")),
    ).rejects.toMatchObject({
      name: "ValidationError",
      code: "KRN_VALIDATION_ERROR",
      message:
        "krn.config.json is invalid: verify.profiles.unit.commands[0].args must be an array of strings; verify.profiles.unit.timeoutMs must be a positive integer; verify.defaultProfile must reference a configured profile",
    } satisfies Partial<ValidationError>);
  });

  it("loads unsafe verify commands so verify policy can block them", async () => {
    const loaded = await loadConfig(path.join(fixturesRoot, "verify-profile-unsafe"));

    expect(loaded.config.verify?.profiles?.unsafe?.commands).toEqual(["pnpm test && rm -rf .krn"]);
  });
});
