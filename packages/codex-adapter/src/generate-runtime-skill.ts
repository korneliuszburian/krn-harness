import { readTemplate } from "./read-template.js";

export const runtimeSkillTemplatePath =
  "packages/codex-adapter/src/templates/skills/krn-harness/SKILL.md.tmpl";
const runtimeSkillTemplateUrl = new URL(
  "./templates/skills/krn-harness/SKILL.md.tmpl",
  import.meta.url,
);

export function generateRuntimeSkillTemplate(): string {
  return readTemplate(runtimeSkillTemplateUrl);
}
