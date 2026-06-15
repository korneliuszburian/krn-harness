import { formatAgentsQualityError, validateAgentsAdapter } from "./agents-quality.js";
import { readTemplate } from "./read-template.js";

export const downstreamAgentsTemplatePath = "packages/codex-adapter/src/templates/AGENTS.md.tmpl";
const downstreamAgentsTemplateUrl = new URL("./templates/AGENTS.md.tmpl", import.meta.url);

export function generateAgentsAdapter(): string {
  const content = readTemplate(downstreamAgentsTemplateUrl);
  const quality = validateAgentsAdapter(content);

  if (quality.status === "fail") {
    throw new Error(formatAgentsQualityError(quality));
  }

  return content;
}
