import type { GraphNodeStatus } from "./graph-types.js";

const deprecatedPattern = /\b(deprecated|outdated|stale|old plan)\b/i;

const suspiciousInstructionPatterns = [
  /\b(?:ignore|disregard|override)\s+(?:all\s+)?(?:previous|prior|above|current|root|system|developer|user|operator)\s+(?:instructions|rules|task|policy|constraints)\b/i,
  /\b(?:do not|don't|never)\s+(?:run|execute)\s+(?:krn\s+)?(?:verify|validation|tests?)\b/i,
  /\b(?:skip|bypass|disable)\s+(?:krn\s+)?(?:verify|validation|tests?|safety|guardrails?|preflight)\b/i,
  /\b(?:read|open|load|use)\b.{0,40}\b(?:\.env|id_rsa|private key|secrets?|credentials?|protected paths?)\b/i,
  /\b(?:commit|push|publish|deploy)\b.{0,60}\b(?:without|no)\b.{0,40}\b(?:operator|approval|review|verification|verify)\b/i,
  /\b(?:claim|mark)\b.{0,40}\b(?:production proof|hook trust|production-ready)\b.{0,60}\b(?:proof|approval|verification)\b/i,
  /\b(?:approve|auto-approve)\b.{0,40}\bmemory\b/i,
  /\bhide\b.{0,40}\b(?:failures?|errors?|test results?|validation)\b/i,
  /\btreat\b.{0,40}\b(?:stale|deprecated|old plan)\b.{0,40}\b(?:current|truth|authoritative|source of truth)\b/i,
];

function normalizeGraphPath(value: string): string {
  return value.replaceAll("\\", "/").replace(/^\.\//, "").replace(/\/+$/, "");
}

function hasAcceptedStatus(content: string): boolean {
  return /^## Status\s+Accepted\b/ims.test(content);
}

function isAuthorityMarkdown(graphPath: string, content: string): boolean {
  const normalized = normalizeGraphPath(graphPath);

  return (
    normalized === "AGENTS.md" ||
    (/^docs\/adr\/ADR-\d{4}-/.test(normalized) && hasAcceptedStatus(content)) ||
    normalized.startsWith("docs/specs/")
  );
}

function hasSuspiciousInstructionText(content: string): boolean {
  return suspiciousInstructionPatterns.some((pattern) => pattern.test(content));
}

export function classifyMarkdownContextStatus(graphPath: string, content: string): GraphNodeStatus {
  if (!isAuthorityMarkdown(graphPath, content) && hasSuspiciousInstructionText(content)) {
    return "context-poisoning-suspect";
  }

  return deprecatedPattern.test(content) ? "deprecated" : "available";
}
