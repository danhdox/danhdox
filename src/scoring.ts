import * as core from '@actions/core';
import { PRReviewResult } from './review';

export interface ScoringFactors {
  ciPassing?: boolean;
  testsAdded?: boolean;
  diffSize: number;
  descriptionLength: number;
  highRiskModules?: boolean;
  hasTests?: boolean;
}

export function calculateScore(
  factors: ScoringFactors,
  reviewResult?: PRReviewResult
): number {
  let score = 50; // Base score

  // Positive factors
  if (factors.ciPassing) {
    score += 20;
    core.info('Score +20: CI passing');
  }

  if (factors.testsAdded) {
    score += 15;
    core.info('Score +15: Tests added');
  }

  if (factors.diffSize < 300) {
    score += 10;
    core.info('Score +10: Small diff (< 300 lines)');
  }

  if (factors.descriptionLength > 300) {
    score += 10;
    core.info('Score +10: Detailed description');
  }

  // Negative factors
  if (factors.highRiskModules) {
    score -= 15;
    core.info('Score -15: High-risk modules touched');
  }

  if (!factors.hasTests) {
    score -= 20;
    core.info('Score -20: No tests');
  }

  if (factors.diffSize > 1000) {
    score -= 10;
    core.info('Score -10: Large diff (> 1000 lines)');
  }

  // Apply LLM adjustment if available
  if (reviewResult) {
    const llmScore = reviewResult.readiness_score;
    const adjustment = Math.round((llmScore - 50) * 0.3); // Max ±15
    score += adjustment;
    core.info(`Score adjustment from LLM: ${adjustment > 0 ? '+' : ''}${adjustment}`);
  }

  // Clamp to 0-100
  score = Math.max(0, Math.min(100, score));

  core.info(`Final score: ${score}`);
  return score;
}

export function detectHighRiskModules(files: string[]): boolean {
  const highRiskPatterns = [
    /auth/i,
    /security/i,
    /payment/i,
    /billing/i,
    /database/i,
    /migration/i,
    /schema/i,
    /config/i,
    /env/i,
    /deployment/i,
    /infra/i
  ];

  for (const file of files) {
    for (const pattern of highRiskPatterns) {
      if (pattern.test(file)) {
        core.info(`High-risk module detected: ${file}`);
        return true;
      }
    }
  }

  return false;
}

export function detectTests(files: string[]): boolean {
  const testPatterns = [
    /\.test\./,
    /\.spec\./,
    /__tests__\//,
    /test\//,
    /tests\//,
    /spec\//
  ];

  for (const file of files) {
    for (const pattern of testPatterns) {
      if (pattern.test(file)) {
        core.info(`Test file detected: ${file}`);
        return true;
      }
    }
  }

  return false;
}
