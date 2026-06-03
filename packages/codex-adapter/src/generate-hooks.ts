import { readTemplate } from "./read-template.js";

export const downstreamHooksTemplatePath = "packages/codex-adapter/src/templates/hooks.json.tmpl";
const downstreamHooksTemplateUrl = new URL("./templates/hooks.json.tmpl", import.meta.url);

export function generateHooksTemplate(): string {
  return readTemplate(downstreamHooksTemplateUrl);
}
