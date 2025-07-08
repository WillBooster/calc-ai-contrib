import { describe, expect, test } from 'bun:test';
import { analyzePullRequestByDiff, formatAnalysisResult } from './github-pr-analyzer.js';

describe('GitHub PR Analyzer', () => {
  test('analyze WillBooster/gen-pr PR #65 by diff (accurate per-line attribution)', async () => {
    const owner = 'WillBooster';
    const repo = 'gen-pr';
    const prNumber = 65;

    const result = await analyzePullRequestByDiff(owner, repo, prNumber);

    console.log('\nDiff-based Analysis Result (Per-line attribution):');
    console.log(formatAnalysisResult(result));

    expect(result.prNumber).toBe(65);
    expect(result.totalEditLines).toBeGreaterThan(0);
    expect(result.totalAdditions).toBeGreaterThanOrEqual(0);
    expect(result.totalDeletions).toBeGreaterThanOrEqual(0);
    expect(result.totalEditLines).toBe(result.totalAdditions + result.totalDeletions);

    expect(result.userContributions.length).toBeGreaterThanOrEqual(1);

    const totalPercentage = result.userContributions.reduce(
      (sum: number, contribution) => sum + contribution.percentage,
      0
    );
    expect(totalPercentage).toBeGreaterThanOrEqual(98);
    expect(totalPercentage).toBeLessThanOrEqual(100);

    for (const contribution of result.userContributions) {
      expect(contribution.user).toBeTruthy();
      expect(contribution.totalLines).toBe(contribution.additions + contribution.deletions);
      expect(contribution.percentage).toBeGreaterThanOrEqual(0);
      expect(contribution.percentage).toBeLessThanOrEqual(100);
    }
  }, 60000);
});
