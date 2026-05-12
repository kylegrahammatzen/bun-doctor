import {
  BLOCKER_RULE_PENALTY,
  MIGRATION_RULE_PENALTY,
  PERFECT_SCORE,
  RISK_RULE_PENALTY,
  SCORE_CLOSE_THRESHOLD,
  SCORE_READY_THRESHOLD,
  SCORE_RISKY_THRESHOLD,
} from "./constants.js";
import type { Diagnostic, FindingLevel, ScanSummary, ScoreResult } from "./types.js";

const getScoreLabel = (score: number): ScoreResult["label"] => {
  if (score >= SCORE_READY_THRESHOLD) return "Ready";
  if (score >= SCORE_CLOSE_THRESHOLD) return "Close";
  if (score >= SCORE_RISKY_THRESHOLD) return "Risky";
  return "Blocked";
};

const collectUniqueRuleCounts = (diagnostics: Diagnostic[]): Record<FindingLevel, Set<string>> => {
  const counts: Record<FindingLevel, Set<string>> = {
    blocker: new Set(),
    risk: new Set(),
    migration: new Set(),
    win: new Set(),
  };

  for (const diagnostic of diagnostics) {
    counts[diagnostic.level].add(diagnostic.ruleId);
  }

  return counts;
};

export const calculateScore = (diagnostics: Diagnostic[]): ScoreResult => {
  const counts = collectUniqueRuleCounts(diagnostics);
  const penalty =
    counts.blocker.size * BLOCKER_RULE_PENALTY +
    counts.risk.size * RISK_RULE_PENALTY +
    counts.migration.size * MIGRATION_RULE_PENALTY;
  const score = Math.max(0, Math.round(PERFECT_SCORE - penalty));
  return { score, label: getScoreLabel(score) };
};

export const summarizeDiagnostics = (diagnostics: Diagnostic[]): ScanSummary => ({
  blockers: diagnostics.filter((diagnostic) => diagnostic.level === "blocker").length,
  risks: diagnostics.filter((diagnostic) => diagnostic.level === "risk").length,
  migrations: diagnostics.filter((diagnostic) => diagnostic.level === "migration").length,
  wins: diagnostics.filter((diagnostic) => diagnostic.level === "win").length,
});
