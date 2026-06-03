import { readFileSync } from "node:fs";

export function readTemplate(templateUrl: URL): string {
  return readFileSync(templateUrl, "utf8");
}
