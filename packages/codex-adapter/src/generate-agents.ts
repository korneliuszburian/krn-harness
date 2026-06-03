import { readTemplate } from "./read-template.js";

export const downstreamAgentsTemplatePath = "packages/codex-adapter/src/templates/AGENTS.md.tmpl";
const downstreamAgentsTemplateUrl = new URL("./templates/AGENTS.md.tmpl", import.meta.url);

export function generateAgentsAdapter(): string {
  return readTemplate(downstreamAgentsTemplateUrl);
}
