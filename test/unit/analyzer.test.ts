import { describe, expect, test } from 'bun:test';
import { analyzePullRequestsByDateRangeMultiRepo } from '../../src/analyzer.js';

describe('GitHub PR Analyzer', () => {
  test('analyze WillBooster/gen-pr PR #65 by diff (accurate per-line attribution)', async () => {
    const repositories = [{ owner: 'WillBooster', repo: 'gen-pr' }];
    const startDate = '2025-06-10';
    const endDate = '2025-06-10';

    const result = await analyzePullRequestsByDateRangeMultiRepo(repositories, startDate, endDate);

    expect(result.totalPRs).toBe(1);
    expect(result.prNumbers).toEqual([65]);
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
    const repositories = [{ owner: 'WillBooster', repo: 'gen-pr' }];
    const startDate = '2025-06-01';
    const endDate = '2025-06-10';

    const result = await analyzePullRequestsByDateRangeMultiRepo(repositories, startDate, endDate);

    expect(result.startDate).toBe(startDate);
    expect(result.endDate).toBe(endDate);
    expect(result.totalPRs).toBe(8);
    expect(result.prNumbers).toEqual([55, 56, 57, 58, 59, 62, 63, 65]);
    expect(result.totalAdditions).toBe(1249);
    expect(result.totalDeletions).toBe(624);
    expect(result.totalEditLines).toBe(1873);
    expect(result.userContributions.length).toBe(3);

    // Check specific user contributions
    const exkazuuContrib = result.userContributions.find((c) => c.user === 'exKAZUu');
    const botContrib = result.userContributions.find((c) => c.user === 'WillBooster-bot');
    const renovateContrib = result.userContributions.find((c) => c.user === 'renovate[bot]');

    expect(exkazuuContrib).toBeDefined();
    expect(exkazuuContrib?.additions).toBe(793);
    expect(exkazuuContrib?.deletions).toBe(389);
    expect(exkazuuContrib?.totalLines).toBe(1182);
    expect(exkazuuContrib?.percentage).toBe(63);
    expect(exkazuuContrib?.name).toBe('Sakamoto, Kazunori');
    expect(exkazuuContrib?.email).toBe('exkazuu@gmail.com');

    expect(botContrib).toBeDefined();
    expect(botContrib?.additions).toBe(430);
    expect(botContrib?.deletions).toBe(183);
    expect(botContrib?.totalLines).toBe(613);
    expect(botContrib?.percentage).toBe(33);
    expect(botContrib?.name).toBe('WillBooster Inc.');
    expect(botContrib?.email).toBe('bot@willbooster.com');

    expect(renovateContrib).toBeDefined();
    expect(renovateContrib?.additions).toBe(26);
    expect(renovateContrib?.deletions).toBe(52);
    expect(renovateContrib?.totalLines).toBe(78);
    expect(renovateContrib?.percentage).toBe(4);
    expect(renovateContrib?.name).toBe('renovate[bot]');
    expect(renovateContrib?.email).toBe('29139614+renovate[bot]@users.noreply.github.com');
  }, 120000);

  test('analyze PR with exclusion options', async () => {
    const repositories = [{ owner: 'WillBooster', repo: 'gen-pr' }];
    const startDate = '2025-06-10';
    const endDate = '2025-06-10';

    // Test excluding a user
    const resultWithUserExclusion = await analyzePullRequestsByDateRangeMultiRepo(repositories, startDate, endDate, {
      excludeUsers: ['WillBooster-bot'],
    });

    expect(resultWithUserExclusion.totalPRs).toBe(1);
    expect(resultWithUserExclusion.prNumbers).toEqual([65]);
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
    const resultWithFileExclusion = await analyzePullRequestsByDateRangeMultiRepo(repositories, startDate, endDate, {
      excludeFiles: ['*.md', 'package*.json'],
    });

    expect(resultWithFileExclusion.totalPRs).toBe(1);
    expect(resultWithFileExclusion.prNumbers).toEqual([65]);
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
    const resultWithMultipleExclusions = await analyzePullRequestsByDateRangeMultiRepo(
      repositories,
      startDate,
      endDate,
      {
        excludeUsers: ['WillBooster-bot'],
        excludeFiles: ['*.md'],
      }
    );

    expect(resultWithMultipleExclusions.totalPRs).toBe(1);
    expect(resultWithMultipleExclusions.prNumbers).toEqual([65]);
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
    const resultWithEmailExclusion = await analyzePullRequestsByDateRangeMultiRepo(repositories, startDate, endDate, {
      excludeEmails: ['bot@willbooster.com'],
    });

    expect(resultWithEmailExclusion.totalPRs).toBe(1);
    expect(resultWithEmailExclusion.prNumbers).toEqual([65]);
    expect(resultWithEmailExclusion.totalAdditions).toBe(106);
    expect(resultWithEmailExclusion.totalDeletions).toBe(47);
    expect(resultWithEmailExclusion.totalEditLines).toBe(153);
    expect(resultWithEmailExclusion.userContributions.length).toBe(1);
    expect(resultWithEmailExclusion.userContributions[0].user).toBe('exKAZUu');
    expect(resultWithEmailExclusion.userContributions[0].percentage).toBe(100);
  }, 60000);

  test('analyze PR with AI emails for human vs AI breakdown', async () => {
    const repositories = [{ owner: 'WillBooster', repo: 'gen-pr' }];
    const startDate = '2025-06-10';
    const endDate = '2025-06-10';

    // Test with AI email specified
    const resultWithAI = await analyzePullRequestsByDateRangeMultiRepo(repositories, startDate, endDate, {
      aiEmails: ['bot@willbooster.com'],
    });

    expect(resultWithAI.totalPRs).toBe(1);
    expect(resultWithAI.prNumbers).toEqual([65]);
    expect(resultWithAI.totalAdditions).toBe(203);
    expect(resultWithAI.totalDeletions).toBe(87);
    expect(resultWithAI.totalEditLines).toBe(290);
    expect(resultWithAI.userContributions.length).toBe(2);

    // Check human contributions
    expect(resultWithAI.humanContributions.totalAdditions).toBe(106);
    expect(resultWithAI.humanContributions.totalDeletions).toBe(47);
    expect(resultWithAI.humanContributions.totalEditLines).toBe(153);
    expect(resultWithAI.humanContributions.percentage).toBe(53);
    expect(resultWithAI.humanContributions.peopleCount).toBe(1);

    // Check AI contributions
    expect(resultWithAI.aiContributions.totalAdditions).toBe(97);
    expect(resultWithAI.aiContributions.totalDeletions).toBe(40);
    expect(resultWithAI.aiContributions.totalEditLines).toBe(137);
    expect(resultWithAI.aiContributions.percentage).toBe(47);
    expect(resultWithAI.aiContributions.peopleCount).toBe(1);

    // Verify percentages add up to 100
    expect(resultWithAI.humanContributions.percentage + resultWithAI.aiContributions.percentage).toBe(100);

    // Test with no AI emails specified (should have zero AI contributions)
    const resultWithoutAI = await analyzePullRequestsByDateRangeMultiRepo(repositories, startDate, endDate);

    expect(resultWithoutAI.humanContributions.totalEditLines).toBe(290);
    expect(resultWithoutAI.humanContributions.percentage).toBe(100);
    expect(resultWithoutAI.humanContributions.peopleCount).toBe(2);

    expect(resultWithoutAI.aiContributions.totalEditLines).toBe(0);
    expect(resultWithoutAI.aiContributions.percentage).toBe(0);
    expect(resultWithoutAI.aiContributions.peopleCount).toBe(0);
  }, 60000);

  test('analyze date range with AI emails for human vs AI breakdown', async () => {
    const repositories = [{ owner: 'WillBooster', repo: 'gen-pr' }];
    const startDate = '2025-06-01';
    const endDate = '2025-06-10';

    // Test with AI email specified
    const resultWithAI = await analyzePullRequestsByDateRangeMultiRepo(repositories, startDate, endDate, {
      aiEmails: ['bot@willbooster.com'],
    });

    expect(resultWithAI.totalEditLines).toBe(1873);
    expect(resultWithAI.userContributions.length).toBe(3);

    // Check human contributions (should include exKAZUu and renovate[bot])
    expect(resultWithAI.humanContributions.totalAdditions).toBe(819);
    expect(resultWithAI.humanContributions.totalDeletions).toBe(441);
    expect(resultWithAI.humanContributions.totalEditLines).toBe(1260);
    expect(resultWithAI.humanContributions.percentage).toBe(67);
    expect(resultWithAI.humanContributions.peopleCount).toBe(2);

    // Check AI contributions (should include WillBooster-bot)
    expect(resultWithAI.aiContributions.totalAdditions).toBe(430);
    expect(resultWithAI.aiContributions.totalDeletions).toBe(183);
    expect(resultWithAI.aiContributions.totalEditLines).toBe(613);
    expect(resultWithAI.aiContributions.percentage).toBe(33);
    expect(resultWithAI.aiContributions.peopleCount).toBe(1);

    // Verify percentages add up to 100
    expect(resultWithAI.humanContributions.percentage + resultWithAI.aiContributions.percentage).toBe(100);
  }, 120000);
});
