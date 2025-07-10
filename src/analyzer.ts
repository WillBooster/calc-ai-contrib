import { config } from 'dotenv';
import micromatch from 'micromatch';
import { Octokit } from 'octokit';

interface ExclusionOptions {
  excludeFiles?: string[];
  excludeUsers?: string[];
  excludeEmails?: string[];
  excludeCommitMessages?: string[];
  aiEmails?: string[];
}

interface UserStats {
  additions: number;
  deletions: number;
  name?: string;
  email?: string;
}

interface UserContribution {
  user: string;
  name?: string;
  email?: string;
  additions: number;
  deletions: number;
  totalLines: number;
  percentage: number;
}

interface ContributionStats {
  totalAdditions: number;
  totalDeletions: number;
  totalEditLines: number;
  percentage: number;
  peopleCount: number;
}

interface BaseAnalysisResult {
  totalAdditions: number;
  totalDeletions: number;
  totalEditLines: number;
  userContributions: UserContribution[];
  humanContributions: ContributionStats;
  aiContributions: ContributionStats;
}

interface PRAnalysisResult extends BaseAnalysisResult {
  prNumber: number;
}

interface DateRangeAnalysisResult extends BaseAnalysisResult {
  startDate: string;
  endDate: string;
  totalPRs: number;
  prNumbers: number[];
}

config();

// Initialize Octokit with authentication
const octokit = new Octokit({
  auth: process.env.GH_TOKEN,
});

// Use Octokit's built-in types for commits
type GitHubCommit = Awaited<ReturnType<typeof octokit.rest.pulls.listCommits>>['data'][0];

export async function analyzePullRequest(
  owner: string,
  repo: string,
  prNumber: number,
  exclusionOptions: ExclusionOptions = {}
): Promise<PRAnalysisResult> {
  // Get the files changed in the PR
  const filesResponse = await octokit.rest.pulls.listFiles({
    owner,
    repo,
    pull_number: prNumber,
  });

  const files = filesResponse.data;

  let _totalAdditions = 0;
  let _totalDeletions = 0;
  const userStats = new Map<string, UserStats>();

  console.log(`Analyzing ${files.length} changed files...`);

  // Get all commits for the PR once (instead of per file)
  console.log('Fetching PR commits...');
  const allCommits = await getPRCommits(owner, repo, prNumber);
  console.log(`Found ${allCommits.length} commits in PR`);

  // Filter commits based on exclusion options
  const filteredCommits = allCommits.filter((commit) => {
    const commitMessage = commit.commit?.message || '';
    return !shouldExcludeCommit(commitMessage, exclusionOptions.excludeCommitMessages);
  });

  if (filteredCommits.length !== allCommits.length) {
    console.log(`Filtered out ${allCommits.length - filteredCommits.length} commits based on exclusion criteria`);
  }

  // Filter files based on exclusion options
  const filteredFiles = files.filter((file) => {
    return !shouldExcludeFile(file.filename, exclusionOptions.excludeFiles);
  });

  if (filteredFiles.length !== files.length) {
    console.log(`Filtered out ${files.length - filteredFiles.length} files based on exclusion criteria`);
  }

  // Simple approach: distribute file changes proportionally among commit authors
  for (const file of filteredFiles) {
    console.log(`Processing file: ${file.filename} (+${file.additions}/-${file.deletions})`);
    _totalAdditions += file.additions;
    _totalDeletions += file.deletions;

    // Find commits that likely touched this file based on the commit messages or use simple distribution
    const fileContributors = distributeFileContributions(filteredCommits, file);

    for (const [author, stats] of fileContributors) {
      // Check if user should be excluded
      if (shouldExcludeUser(author, stats.name, stats.email, exclusionOptions)) {
        console.log(`Excluding user: ${author} (${stats.name || 'no name'}) <${stats.email || 'no email'}>`);
        continue;
      }

      const currentStats = userStats.get(author) || {
        additions: 0,
        deletions: 0,
        name: stats.name,
        email: stats.email,
      };
      currentStats.additions += stats.additions;
      currentStats.deletions += stats.deletions;
      // Update name and email if not already set or if we have better information
      if (!currentStats.name && stats.name) {
        currentStats.name = stats.name;
      }
      if (!currentStats.email && stats.email) {
        currentStats.email = stats.email;
      }
      userStats.set(author, currentStats);
    }
  }

  // Convert to result format
  const userContributions: UserContribution[] = [];

  for (const [user, stats] of userStats) {
    userContributions.push({
      user,
      name: stats.name,
      email: stats.email,
      additions: stats.additions,
      deletions: stats.deletions,
      totalLines: stats.additions + stats.deletions,
      percentage: 0,
    });
  }

  // Calculate total edit lines from actual user contributions (after exclusions)
  const actualTotalEditLines = userContributions.reduce((sum, contrib) => sum + contrib.totalLines, 0);

  for (const contribution of userContributions) {
    contribution.percentage =
      actualTotalEditLines > 0 ? Math.round((contribution.totalLines / actualTotalEditLines) * 100) : 0;
  }

  userContributions.sort((a, b) => b.totalLines - a.totalLines);

  // Calculate actual totals from user contributions (after exclusions)
  const actualTotalAdditions = userContributions.reduce((sum, contrib) => sum + contrib.additions, 0);
  const actualTotalDeletions = userContributions.reduce((sum, contrib) => sum + contrib.deletions, 0);

  // Calculate AI vs Human contributions
  const aiContribs = userContributions.filter((contrib) => isAIUser(contrib.email, exclusionOptions.aiEmails));
  const humanContribs = userContributions.filter((contrib) => !isAIUser(contrib.email, exclusionOptions.aiEmails));

  const aiTotalAdditions = aiContribs.reduce((sum, contrib) => sum + contrib.additions, 0);
  const aiTotalDeletions = aiContribs.reduce((sum, contrib) => sum + contrib.deletions, 0);
  const aiTotalEditLines = aiTotalAdditions + aiTotalDeletions;

  const humanTotalAdditions = humanContribs.reduce((sum, contrib) => sum + contrib.additions, 0);
  const humanTotalDeletions = humanContribs.reduce((sum, contrib) => sum + contrib.deletions, 0);
  const humanTotalEditLines = humanTotalAdditions + humanTotalDeletions;

  const aiPercentage = actualTotalEditLines > 0 ? Math.round((aiTotalEditLines / actualTotalEditLines) * 100) : 0;
  const humanPercentage = actualTotalEditLines > 0 ? Math.round((humanTotalEditLines / actualTotalEditLines) * 100) : 0;

  return {
    prNumber,
    totalAdditions: actualTotalAdditions,
    totalDeletions: actualTotalDeletions,
    totalEditLines: actualTotalEditLines,
    userContributions,
    humanContributions: {
      totalAdditions: humanTotalAdditions,
      totalDeletions: humanTotalDeletions,
      totalEditLines: humanTotalEditLines,
      percentage: humanPercentage,
      peopleCount: humanContribs.length,
    },
    aiContributions: {
      totalAdditions: aiTotalAdditions,
      totalDeletions: aiTotalDeletions,
      totalEditLines: aiTotalEditLines,
      percentage: aiPercentage,
      peopleCount: aiContribs.length,
    },
  };
}

// Keep the old commit-based function for comparison
export function formatAnalysisResult(result: PRAnalysisResult, exclusionOptions: ExclusionOptions = {}): string {
  const lines = [
    `PR #${result.prNumber} Analysis:`,
    `Total additions: ${result.totalAdditions}`,
    `Total deletions: ${result.totalDeletions}`,
    `Total edit lines: ${result.totalEditLines}`,
    '',
  ];

  // Add AI vs Human breakdown only if AI emails were specified
  const hasAIEmails = exclusionOptions.aiEmails && exclusionOptions.aiEmails.length > 0;
  if (hasAIEmails) {
    lines.push('Human vs AI Breakdown:');
    lines.push(
      `Human: ${result.humanContributions.percentage}% ` +
        `(+${result.humanContributions.totalAdditions}, -${result.humanContributions.totalDeletions}, ` +
        `total: ${result.humanContributions.totalEditLines}, people: ${result.humanContributions.peopleCount})`
    );
    lines.push(
      `AI: ${result.aiContributions.percentage}% ` +
        `(+${result.aiContributions.totalAdditions}, -${result.aiContributions.totalDeletions}, ` +
        `total: ${result.aiContributions.totalEditLines}, people: ${result.aiContributions.peopleCount})`
    );
    lines.push('');
  }

  lines.push('User contributions:');

  for (const contribution of result.userContributions) {
    const userInfo = contribution.user;
    const nameInfo = contribution.name ? ` (${contribution.name})` : '';
    const emailInfo = contribution.email ? ` <${contribution.email}>` : '';

    lines.push(
      `${userInfo}${nameInfo}${emailInfo}: ${contribution.percentage}% ` +
        `(+${contribution.additions}, -${contribution.deletions}, ` +
        `total: ${contribution.totalLines})`
    );
  }

  return lines.join('\n');
}

export function formatDateRangeAnalysisResult(
  result: DateRangeAnalysisResult,
  exclusionOptions: ExclusionOptions = {}
): string {
  const lines = [
    `Date Range Analysis (${result.startDate} to ${result.endDate}):`,
    `Total PRs analyzed: ${result.totalPRs}`,
    `PR numbers: ${result.prNumbers.join(', ')}`,
    `Total additions: ${result.totalAdditions}`,
    `Total deletions: ${result.totalDeletions}`,
    `Total edit lines: ${result.totalEditLines}`,
    '',
  ];

  // Add AI vs Human breakdown only if AI emails were specified
  const hasAIEmails = exclusionOptions.aiEmails && exclusionOptions.aiEmails.length > 0;
  if (hasAIEmails) {
    lines.push('Human vs AI Breakdown:');
    lines.push(
      `Human: ${result.humanContributions.percentage}% ` +
        `(+${result.humanContributions.totalAdditions}, -${result.humanContributions.totalDeletions}, ` +
        `total: ${result.humanContributions.totalEditLines}, people: ${result.humanContributions.peopleCount})`
    );
    lines.push(
      `AI: ${result.aiContributions.percentage}% ` +
        `(+${result.aiContributions.totalAdditions}, -${result.aiContributions.totalDeletions}, ` +
        `total: ${result.aiContributions.totalEditLines}, people: ${result.aiContributions.peopleCount})`
    );
    lines.push('');
  }

  lines.push('Aggregated user contributions:');

  if (result.userContributions.length === 0) {
    lines.push('No contributions found in the specified date range.');
  } else {
    for (const contribution of result.userContributions) {
      const userInfo = contribution.user;
      const nameInfo = contribution.name ? ` (${contribution.name})` : '';
      const emailInfo = contribution.email ? ` <${contribution.email}>` : '';

      lines.push(
        `${userInfo}${nameInfo}${emailInfo}: ${contribution.percentage}% ` +
          `(+${contribution.additions}, -${contribution.deletions}, ` +
          `total: ${contribution.totalLines})`
      );
    }
  }

  return lines.join('\n');
}

async function getPRCommits(owner: string, repo: string, prNumber: number): Promise<GitHubCommit[]> {
  console.log('Making single API call to get PR commits...');
  const commitsResponse = await octokit.rest.pulls.listCommits({
    owner,
    repo,
    pull_number: prNumber,
  });

  const commits = commitsResponse.data;
  console.log(`Retrieved ${commits.length} commits from API`);

  return commits;
}

function distributeFileContributions(
  commits: GitHubCommit[],
  file: { filename: string; additions: number; deletions: number }
): Map<string, UserStats> {
  const contributions = new Map<string, UserStats>();

  if (commits.length === 0) {
    // Fallback: attribute to unknown
    contributions.set('Unknown', { additions: file.additions, deletions: file.deletions });
    return contributions;
  }

  // Simple distribution: divide changes equally among all commit authors
  // This is a simplified approach that avoids excessive API calls
  const authorsMap = new Map<string, Pick<UserStats, 'name' | 'email'>>();

  for (const commit of commits) {
    const author = commit.author?.login || commit.commit?.author?.name || 'Unknown';
    const name = commit.commit?.author?.name;
    const email = commit.commit?.author?.email;

    // Store the first occurrence of name and email for each author
    if (!authorsMap.has(author)) {
      authorsMap.set(author, { name, email });
    }
  }

  const authors = Array.from(authorsMap.keys());
  const additionsPerAuthor = Math.floor(file.additions / authors.length);
  const deletionsPerAuthor = Math.floor(file.deletions / authors.length);

  // Distribute changes
  for (let i = 0; i < authors.length; i++) {
    const author = authors[i];
    const authorInfo = authorsMap.get(author);
    const isLast = i === authors.length - 1;

    // Give remainder to last author
    const additions = isLast ? file.additions - additionsPerAuthor * (authors.length - 1) : additionsPerAuthor;
    const deletions = isLast ? file.deletions - deletionsPerAuthor * (authors.length - 1) : deletionsPerAuthor;

    contributions.set(author, {
      additions,
      deletions,
      name: authorInfo?.name,
      email: authorInfo?.email,
    });
  }

  return contributions;
}

async function findPRsByDateRange(owner: string, repo: string, startDate: string, endDate: string): Promise<number[]> {
  console.log(`Searching for PRs between ${startDate} and ${endDate}...`);

  const prNumbers: number[] = [];
  let page = 1;
  const perPage = 100;

  while (true) {
    console.log(`Fetching PRs page ${page}...`);

    const response = await octokit.rest.pulls.list({
      owner,
      repo,
      state: 'closed',
      sort: 'updated',
      direction: 'desc',
      per_page: perPage,
      page,
    });

    const prs = response.data;

    if (prs.length === 0) {
      break;
    }

    let foundOlderPR = false;

    for (const pr of prs) {
      // Only consider merged PRs
      if (!pr.merged_at) {
        continue;
      }

      const mergedDate = new Date(pr.merged_at);
      const start = new Date(startDate);
      const end = new Date(endDate);

      // Set end date to end of day
      end.setHours(23, 59, 59, 999);

      if (mergedDate >= start && mergedDate <= end) {
        prNumbers.push(pr.number);
        console.log(`Found PR #${pr.number} merged on ${pr.merged_at}`);
      } else if (mergedDate < start) {
        // PRs are sorted by updated date desc, so if we find a PR older than start date,
        // we can stop searching (assuming no more recent PRs will be found)
        foundOlderPR = true;
        break;
      }
    }

    // If we found a PR older than our start date, we can stop
    if (foundOlderPR || prs.length < perPage) {
      break;
    }

    page++;
  }

  console.log(`Found ${prNumbers.length} PRs in the specified date range`);
  return prNumbers.sort((a, b) => a - b);
}

export async function analyzePullRequestsByDateRange(
  owner: string,
  repo: string,
  startDate: string,
  endDate: string,
  exclusionOptions: ExclusionOptions = {}
): Promise<DateRangeAnalysisResult> {
  const prNumbers = await findPRsByDateRange(owner, repo, startDate, endDate);

  if (prNumbers.length === 0) {
    return {
      startDate,
      endDate,
      totalPRs: 0,
      prNumbers: [],
      totalAdditions: 0,
      totalDeletions: 0,
      totalEditLines: 0,
      userContributions: [],
      humanContributions: {
        totalAdditions: 0,
        totalDeletions: 0,
        totalEditLines: 0,
        percentage: 0,
        peopleCount: 0,
      },
      aiContributions: {
        totalAdditions: 0,
        totalDeletions: 0,
        totalEditLines: 0,
        percentage: 0,
        peopleCount: 0,
      },
    };
  }

  console.log(`\nAnalyzing ${prNumbers.length} PRs...`);

  let totalAdditions = 0;
  let totalDeletions = 0;
  const aggregatedUserStats = new Map<string, UserStats>();

  for (let i = 0; i < prNumbers.length; i++) {
    const prNumber = prNumbers[i];
    console.log(`\n[${i + 1}/${prNumbers.length}] Analyzing PR #${prNumber}...`);

    try {
      const prResult = await analyzePullRequest(owner, repo, prNumber, exclusionOptions);

      totalAdditions += prResult.totalAdditions;
      totalDeletions += prResult.totalDeletions;

      // Aggregate user contributions
      for (const contribution of prResult.userContributions) {
        const currentStats = aggregatedUserStats.get(contribution.user) || {
          additions: 0,
          deletions: 0,
          name: contribution.name,
          email: contribution.email,
        };

        currentStats.additions += contribution.additions;
        currentStats.deletions += contribution.deletions;

        // Update name and email if not already set
        if (!currentStats.name && contribution.name) {
          currentStats.name = contribution.name;
        }
        if (!currentStats.email && contribution.email) {
          currentStats.email = contribution.email;
        }

        aggregatedUserStats.set(contribution.user, currentStats);
      }
    } catch (error) {
      console.error(`Error analyzing PR #${prNumber}:`, error);
      // Continue with other PRs
    }
  }

  // Convert to result format
  const userContributions: UserContribution[] = [];

  for (const [user, stats] of aggregatedUserStats) {
    userContributions.push({
      user,
      name: stats.name,
      email: stats.email,
      additions: stats.additions,
      deletions: stats.deletions,
      totalLines: stats.additions + stats.deletions,
      percentage: 0,
    });
  }

  const totalEditLines = totalAdditions + totalDeletions;

  for (const contribution of userContributions) {
    contribution.percentage = totalEditLines > 0 ? Math.round((contribution.totalLines / totalEditLines) * 100) : 0;
  }

  userContributions.sort((a, b) => b.totalLines - a.totalLines);

  // Calculate AI vs Human contributions
  const aiContribs = userContributions.filter((contrib) => isAIUser(contrib.email, exclusionOptions.aiEmails));
  const humanContribs = userContributions.filter((contrib) => !isAIUser(contrib.email, exclusionOptions.aiEmails));

  const aiTotalAdditions = aiContribs.reduce((sum, contrib) => sum + contrib.additions, 0);
  const aiTotalDeletions = aiContribs.reduce((sum, contrib) => sum + contrib.deletions, 0);
  const aiTotalEditLines = aiTotalAdditions + aiTotalDeletions;

  const humanTotalAdditions = humanContribs.reduce((sum, contrib) => sum + contrib.additions, 0);
  const humanTotalDeletions = humanContribs.reduce((sum, contrib) => sum + contrib.deletions, 0);
  const humanTotalEditLines = humanTotalAdditions + humanTotalDeletions;

  const aiPercentage = totalEditLines > 0 ? Math.round((aiTotalEditLines / totalEditLines) * 100) : 0;
  const humanPercentage = totalEditLines > 0 ? Math.round((humanTotalEditLines / totalEditLines) * 100) : 0;

  return {
    startDate,
    endDate,
    totalPRs: prNumbers.length,
    prNumbers,
    totalAdditions,
    totalDeletions,
    totalEditLines,
    userContributions,
    humanContributions: {
      totalAdditions: humanTotalAdditions,
      totalDeletions: humanTotalDeletions,
      totalEditLines: humanTotalEditLines,
      percentage: humanPercentage,
      peopleCount: humanContribs.length,
    },
    aiContributions: {
      totalAdditions: aiTotalAdditions,
      totalDeletions: aiTotalDeletions,
      totalEditLines: aiTotalEditLines,
      percentage: aiPercentage,
      peopleCount: aiContribs.length,
    },
  };
}

// Helper functions for exclusion filtering
function shouldExcludeFile(filename: string, excludePatterns: string[] = []): boolean {
  return excludePatterns.some((pattern) => micromatch.isMatch(filename, pattern));
}

function shouldExcludeUser(
  user: string,
  _name: string | undefined,
  email: string | undefined,
  exclusionOptions: ExclusionOptions
): boolean {
  const { excludeUsers = [], excludeEmails = [] } = exclusionOptions;

  // Check if user should be excluded by username
  if (excludeUsers.includes(user)) {
    return true;
  }

  // Check if user should be excluded by email
  if (email && excludeEmails.includes(email)) {
    return true;
  }

  return false;
}

function shouldExcludeCommit(commitMessage: string, excludePatterns: string[] = []): boolean {
  return excludePatterns.some((pattern) => commitMessage.includes(pattern));
}

function isAIUser(email: string | undefined, aiEmails: string[] = []): boolean {
  if (!email) {
    return false;
  }
  return aiEmails.includes(email);
}
