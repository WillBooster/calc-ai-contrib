import { describe, expect, test } from 'bun:test';
import { analyzePullRequestCommits, formatAnalysisResult } from './github-pr-analyzer.js';

describe('GitHub PR Analyzer', () => {
  test('analyze WillBooster/gen-pr PR #65', async () => {
    const owner = 'WillBooster';
    const repo = 'gen-pr';
    const prNumber = 65;

    const result = await analyzePullRequestCommits(owner, repo, prNumber);

    console.log('\nAnalysis Result:');
    console.log(formatAnalysisResult(result));

    expect(result.prNumber).toBe(65);
    expect(result.totalEditLines).toBeGreaterThan(0);
    expect(result.totalAdditions).toBeGreaterThanOrEqual(0);
    expect(result.totalDeletions).toBeGreaterThanOrEqual(0);
    expect(result.totalEditLines).toBe(result.totalAdditions + result.totalDeletions);

    expect(result.userContributions).toHaveLength(2);

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
  }, 30000);
});
