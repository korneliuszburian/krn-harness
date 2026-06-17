import { readTemplate } from "./read-template.js";

export const runtimeSkillTemplatePath =
  "packages/codex-adapter/src/templates/skills/krn-harness/SKILL.md.tmpl";
const runtimeSkillTemplateUrl = new URL(
  "./templates/skills/krn-harness/SKILL.md.tmpl",
  import.meta.url,
);
const runtimeSkillOpenAiYamlTemplateUrl = new URL(
  "./templates/skills/krn-harness/agents/openai.yaml.tmpl",
  import.meta.url,
);
const runtimeSkillWorkflowReferenceTemplateUrl = new URL(
  "./templates/skills/krn-harness/references/workflow.md.tmpl",
  import.meta.url,
);

export interface RuntimeSkillTemplateFile {
  path: string;
  content: string;
  markerStyle: "markdown" | "yaml";
}

export function generateRuntimeSkillTemplate(): string {
  return readTemplate(runtimeSkillTemplateUrl);
}

export function generateRuntimeSkillTemplateFiles(): RuntimeSkillTemplateFile[] {
  return [
    {
      path: ".agents/skills/krn-harness/SKILL.md",
      content: generateRuntimeSkillTemplate(),
      markerStyle: "markdown",
    },
    {
      path: ".agents/skills/krn-harness/agents/openai.yaml",
      content: readTemplate(runtimeSkillOpenAiYamlTemplateUrl),
      markerStyle: "yaml",
    },
    {
      path: ".agents/skills/krn-harness/references/workflow.md",
      content: readTemplate(runtimeSkillWorkflowReferenceTemplateUrl),
      markerStyle: "markdown",
    },
  ];
}
