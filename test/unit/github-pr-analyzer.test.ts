import { describe, expect, test } from 'bun:test';
import { analyzePullRequest, formatAnalysisResult } from '../../src/github-pr-analyzer.js';

describe('GitHub PR Analyzer', () => {
  test('analyze WillBooster/gen-pr PR #65 by diff (accurate per-line attribution)', async () => {
    const owner = 'WillBooster';
    const repo = 'gen-pr';
    const prNumber = 65;

    const result = await analyzePullRequest(owner, repo, prNumber);

    console.log('\nDiff-based Analysis Result (Per-line attribution):');
    console.log(formatAnalysisResult(result));

    expect(result.prNumber).toBe(65);
    expect(result.totalEditLines).toBe(290);
    expect(result.totalAdditions).toBe(203);
    expect(result.totalDeletions).toBe(87);
    expect(result.totalEditLines).toBe(result.totalAdditions + result.totalDeletions);

    expect(result.userContributions.length).toBe(2);

    const totalPercentage = result.userContributions.reduce(
      (sum: number, contribution) => sum + contribution.percentage,
      0
    );
    expect(totalPercentage).toBe(100);

    // Check specific user contributions
    const exkazuuContrib = result.userContributions.find((c) => c.user === 'exKAZUu');
    const botContrib = result.userContributions.find((c) => c.user === 'WillBooster-bot');

    expect(exkazuuContrib).toBeDefined();
    expect(exkazuuContrib?.additions).toBe(106);
    expect(exkazuuContrib?.deletions).toBe(47);
    expect(exkazuuContrib?.totalLines).toBe(153);
    expect(exkazuuContrib?.percentage).toBe(53);

    expect(botContrib).toBeDefined();
    expect(botContrib?.additions).toBe(97);
    expect(botContrib?.deletions).toBe(40);
    expect(botContrib?.totalLines).toBe(137);
    expect(botContrib?.percentage).toBe(47);

    for (const contribution of result.userContributions) {
      expect(contribution.user).toBeTruthy();
      expect(contribution.totalLines).toBe(contribution.additions + contribution.deletions);
    }
  }, 60000);
});
