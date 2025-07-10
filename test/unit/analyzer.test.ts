import { describe, expect, test } from 'bun:test';
import { analyzePullRequest } from '../../src/analyzer.js';

describe('GitHub PR Analyzer', () => {
  test('analyze WillBooster/gen-pr PR #65 by diff (accurate per-line attribution)', async () => {
    const owner = 'WillBooster';
    const repo = 'gen-pr';
    const prNumber = 65;

    const result = await analyzePullRequest(owner, repo, prNumber);

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
    expect(exkazuuContrib?.name).toBe('Sakamoto, Kazunori');
    expect(exkazuuContrib?.email).toBe('exkazuu@gmail.com');

    expect(botContrib).toBeDefined();
    expect(botContrib?.additions).toBe(97);
    expect(botContrib?.deletions).toBe(40);
    expect(botContrib?.totalLines).toBe(137);
    expect(botContrib?.percentage).toBe(47);
    expect(botContrib?.name).toBe('WillBooster Inc. (aider)');
    expect(botContrib?.email).toBe('bot@willbooster.com');
  }, 60000);

  test('analyze PRs by date range (basic functionality)', async () => {
    const owner = 'WillBooster';
    const repo = 'gen-pr';
    const startDate = '2024-01-01';
    const endDate = '2024-12-31';

    // Import the function dynamically to avoid import issues
    const { analyzePullRequestsByDateRange } = await import('../../src/analyzer.js');

    const result = await analyzePullRequestsByDateRange(owner, repo, startDate, endDate);

    expect(result.startDate).toBe(startDate);
    expect(result.endDate).toBe(endDate);
    expect(result.totalPRs).toBe(0);
    expect(result.prNumbers).toEqual([]);
    expect(result.totalAdditions).toBe(0);
    expect(result.totalDeletions).toBe(0);
    expect(result.totalEditLines).toBe(0);
    expect(result.userContributions).toEqual([]);
  }, 120000);

  test('analyze PR with exclusion options', async () => {
    const owner = 'WillBooster';
    const repo = 'gen-pr';
    const prNumber = 65;

    // Test excluding a user
    const resultWithUserExclusion = await analyzePullRequest(owner, repo, prNumber, {
      excludeUsers: ['WillBooster-bot'],
    });

    expect(resultWithUserExclusion.prNumber).toBe(65);
    expect(resultWithUserExclusion.totalAdditions).toBe(106);
    expect(resultWithUserExclusion.totalDeletions).toBe(47);
    expect(resultWithUserExclusion.totalEditLines).toBe(153);
    expect(resultWithUserExclusion.userContributions.length).toBe(1);
    expect(resultWithUserExclusion.userContributions[0].user).toBe('exKAZUu');
    expect(resultWithUserExclusion.userContributions[0].additions).toBe(106);
    expect(resultWithUserExclusion.userContributions[0].deletions).toBe(47);
    expect(resultWithUserExclusion.userContributions[0].totalLines).toBe(153);
    expect(resultWithUserExclusion.userContributions[0].percentage).toBe(100);
    expect(resultWithUserExclusion.userContributions[0].name).toBe('Sakamoto, Kazunori');
    expect(resultWithUserExclusion.userContributions[0].email).toBe('exkazuu@gmail.com');

    // Test excluding files with glob pattern
    const resultWithFileExclusion = await analyzePullRequest(owner, repo, prNumber, {
      excludeFiles: ['*.md', 'package*.json'],
    });

    expect(resultWithFileExclusion.prNumber).toBe(65);
    expect(resultWithFileExclusion.totalAdditions).toBe(201);
    expect(resultWithFileExclusion.totalDeletions).toBe(87);
    expect(resultWithFileExclusion.totalEditLines).toBe(288);
    expect(resultWithFileExclusion.userContributions.length).toBe(2);

    // Check specific user contributions after file exclusion
    const exkazuuContribFileExcl = resultWithFileExclusion.userContributions.find((c) => c.user === 'exKAZUu');
    const botContribFileExcl = resultWithFileExclusion.userContributions.find((c) => c.user === 'WillBooster-bot');

    expect(exkazuuContribFileExcl).toBeDefined();
    expect(exkazuuContribFileExcl?.additions).toBe(105);
    expect(exkazuuContribFileExcl?.deletions).toBe(47);
    expect(exkazuuContribFileExcl?.totalLines).toBe(152);
    expect(exkazuuContribFileExcl?.percentage).toBe(53);

    expect(botContribFileExcl).toBeDefined();
    expect(botContribFileExcl?.additions).toBe(96);
    expect(botContribFileExcl?.deletions).toBe(40);
    expect(botContribFileExcl?.totalLines).toBe(136);
    expect(botContribFileExcl?.percentage).toBe(47);

    // Test multiple exclusions
    const resultWithMultipleExclusions = await analyzePullRequest(owner, repo, prNumber, {
      excludeUsers: ['WillBooster-bot'],
      excludeFiles: ['*.md'],
    });

    expect(resultWithMultipleExclusions.prNumber).toBe(65);
    expect(resultWithMultipleExclusions.totalAdditions).toBe(105);
    expect(resultWithMultipleExclusions.totalDeletions).toBe(47);
    expect(resultWithMultipleExclusions.totalEditLines).toBe(152);
    expect(resultWithMultipleExclusions.userContributions.length).toBe(1);
    expect(resultWithMultipleExclusions.userContributions[0].user).toBe('exKAZUu');
    expect(resultWithMultipleExclusions.userContributions[0].additions).toBe(105);
    expect(resultWithMultipleExclusions.userContributions[0].deletions).toBe(47);
    expect(resultWithMultipleExclusions.userContributions[0].totalLines).toBe(152);
    expect(resultWithMultipleExclusions.userContributions[0].percentage).toBe(100);
    expect(resultWithMultipleExclusions.userContributions[0].name).toBe('Sakamoto, Kazunori');
    expect(resultWithMultipleExclusions.userContributions[0].email).toBe('exkazuu@gmail.com');

    // Test excluding by email
    const resultWithEmailExclusion = await analyzePullRequest(owner, repo, prNumber, {
      excludeEmails: ['bot@willbooster.com'],
    });

    expect(resultWithEmailExclusion.prNumber).toBe(65);
    expect(resultWithEmailExclusion.totalAdditions).toBe(106);
    expect(resultWithEmailExclusion.totalDeletions).toBe(47);
    expect(resultWithEmailExclusion.totalEditLines).toBe(153);
    expect(resultWithEmailExclusion.userContributions.length).toBe(1);
    expect(resultWithEmailExclusion.userContributions[0].user).toBe('exKAZUu');
    expect(resultWithEmailExclusion.userContributions[0].percentage).toBe(100);
  }, 60000);
});
