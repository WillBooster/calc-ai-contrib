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

const octokit = new Octokit({
  auth: process.env.GH_TOKEN,
});

type GitHubCommit = Awaited<ReturnType<typeof octokit.rest.pulls.listCommits>>['data'][0];

export async function analyzePullRequest(
  owner: string,
  repo: string,
  prNumber: number,
  exclusionOptions: ExclusionOptions = {}
): Promise<PRAnalysisResult> {
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

  console.log('Fetching PR commits...');
  const allCommits = await getPRCommits(owner, repo, prNumber);
  console.log(`Found ${allCommits.length} commits in PR`);

  const filteredCommits = allCommits.filter((commit) => {
    const commitMessage = commit.commit?.message || '';
    return !shouldExcludeCommit(commitMessage, exclusionOptions.excludeCommitMessages);
  });

  if (filteredCommits.length !== allCommits.length) {
    console.log(`Filtered out ${allCommits.length - filteredCommits.length} commits based on exclusion criteria`);
  }

  const filteredFiles = files.filter((file) => {
    return !shouldExcludeFile(file.filename, exclusionOptions.excludeFiles);
  });

  if (filteredFiles.length !== files.length) {
    console.log(`Filtered out ${files.length - filteredFiles.length} files based on exclusion criteria`);
  }

  for (const file of filteredFiles) {
    console.log(`Processing file: ${file.filename} (+${file.additions}/-${file.deletions})`);
    _totalAdditions += file.additions;
    _totalDeletions += file.deletions;

    const fileContributors = distributeFileContributions(filteredCommits, file);

    for (const [author, stats] of fileContributors) {
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

      if (!currentStats.name && stats.name) {
        currentStats.name = stats.name;
      }
      if (!currentStats.email && stats.email) {
        currentStats.email = stats.email;
      }
      userStats.set(author, currentStats);
    }
  }

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

  const actualTotalEditLines = userContributions.reduce((sum, contrib) => sum + contrib.totalLines, 0);

  for (const contribution of userContributions) {
    contribution.percentage =
      actualTotalEditLines > 0 ? Math.round((contribution.totalLines / actualTotalEditLines) * 100) : 0;
  }

  userContributions.sort((a, b) => b.totalLines - a.totalLines);

  const actualTotalAdditions = userContributions.reduce((sum, contrib) => sum + contrib.additions, 0);
  const actualTotalDeletions = userContributions.reduce((sum, contrib) => sum + contrib.deletions, 0);

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

// Helper function to format header for different result types
function formatHeader(result: PRAnalysisResult | DateRangeAnalysisResult, hasAIEmails: boolean): string[] {
  const lines: string[] = [];

  lines.push('╔══════════════════════════════════════════════════╗');
  lines.push('║           CONTRIBUTION ANALYSIS REPORT           ║');
  lines.push('╠══════════════════════════════════════════════════╣');

  if ('prNumber' in result) {
    // PR Analysis Result
    lines.push(
      `║ PR #${result.prNumber.toString().padEnd(4)}                     │ Edits: ${result.totalEditLines.toLocaleString().padEnd(6)} ║`
    );
    lines.push(
      `║ Total: +${result.totalAdditions.toLocaleString().padEnd(6)} -${result.totalDeletions.toLocaleString().padEnd(6)}                           ║`
    );
  } else {
    // Date Range Analysis Result
    lines.push(
      `║ Date: ${result.startDate} to ${result.endDate.padEnd(12)} │ PRs: ${result.totalPRs.toString().padEnd(3)} ║`
    );
    lines.push(
      `║ Total Edits: ${result.totalEditLines.toLocaleString().padEnd(8)} │ +${result.totalAdditions.toLocaleString().padEnd(6)} -${result.totalDeletions.toLocaleString().padEnd(6)} ║`
    );
  }

  // Add Human vs AI info to header if available
  if (hasAIEmails) {
    const humanPercentage = result.humanContributions.percentage;
    const aiPercentage = result.aiContributions.percentage;
    const barLength = 24;
    const humanBars = Math.round((humanPercentage / 100) * barLength);
    const aiBars = barLength - humanBars;

    lines.push('╠══════════════════════════════════════════════════════════════════╣');
    lines.push(`║ Human vs AI: [${'█'.repeat(humanBars) + '░'.repeat(aiBars)}] ${humanPercentage}%/${aiPercentage}% ║`);
    lines.push(
      `║ Contributors: ${result.humanContributions.peopleCount} Human, ${result.aiContributions.peopleCount} AI${' '.repeat(Math.max(0, 25 - result.humanContributions.peopleCount.toString().length - result.aiContributions.peopleCount.toString().length))} ║`
    );
  }

  lines.push('╚══════════════════════════════════════════════════════════════════╝');
  lines.push('');

  return lines;
}

// Helper function to format detailed breakdown section
function formatDetailedBreakdown(result: BaseAnalysisResult, hasAIEmails: boolean): string[] {
  const lines: string[] = [];

  if (hasAIEmails) {
    lines.push('📊 DETAILED BREAKDOWN');
    lines.push('─'.repeat(40));
    lines.push(
      `👥 Human: +${result.humanContributions.totalAdditions.toLocaleString()} -${result.humanContributions.totalDeletions.toLocaleString()} (${result.humanContributions.totalEditLines.toLocaleString()} total)`
    );
    lines.push(
      `🤖 AI: +${result.aiContributions.totalAdditions.toLocaleString()} -${result.aiContributions.totalDeletions.toLocaleString()} (${result.aiContributions.totalEditLines.toLocaleString()} total)`
    );
    lines.push('');
  }

  return lines;
}

// Helper function to format individual contributions section
function formatIndividualContributions(result: PRAnalysisResult | DateRangeAnalysisResult): string[] {
  const lines: string[] = [];

  lines.push('👤 INDIVIDUAL CONTRIBUTIONS');
  lines.push('─'.repeat(40));

  if (result.userContributions.length === 0) {
    const message =
      'startDate' in result ? 'No contributions found in the specified date range.' : 'No contributions found.';
    lines.push(message);
  } else {
    for (const contribution of result.userContributions) {
      const userInfo = contribution.user;
      const nameInfo = contribution.name ? ` (${contribution.name})` : '';
      const emailInfo = contribution.email ? ` <${contribution.email}>` : '';

      const userBarLength = 16;
      const userBars = Math.round((contribution.percentage / 100) * userBarLength);
      const userBar = '█'.repeat(userBars) + '░'.repeat(userBarLength - userBars);

      lines.push(`${userInfo}${nameInfo}${emailInfo}: [${userBar}] ${contribution.percentage}%`);
      lines.push(
        `  +${contribution.additions.toLocaleString()} -${contribution.deletions.toLocaleString()} (${contribution.totalLines.toLocaleString()} total)`
      );
      lines.push('');
    }
  }

  return lines;
}

export function formatAnalysisResult(
  result: PRAnalysisResult | DateRangeAnalysisResult,
  exclusionOptions: ExclusionOptions = {}
): string {
  const hasAIEmails = Boolean(exclusionOptions.aiEmails && exclusionOptions.aiEmails.length > 0);

  const lines: string[] = [
    ...formatHeader(result, hasAIEmails),
    ...formatDetailedBreakdown(result, hasAIEmails),
    ...formatIndividualContributions(result),
  ];

  return lines.join('\n');
}

// Legacy function for backward compatibility - now just calls the unified function
export function formatDateRangeAnalysisResult(
  result: DateRangeAnalysisResult,
  exclusionOptions: ExclusionOptions = {}
): string {
  return formatAnalysisResult(result, exclusionOptions);
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
    contributions.set('Unknown', { additions: file.additions, deletions: file.deletions });
    return contributions;
  }

  const authorsMap = new Map<string, Pick<UserStats, 'name' | 'email'>>();

  for (const commit of commits) {
    const author = commit.author?.login || commit.commit?.author?.name || 'Unknown';
    const name = commit.commit?.author?.name;
    const email = commit.commit?.author?.email;

    if (!authorsMap.has(author)) {
      authorsMap.set(author, { name, email });
    }
  }

  const authors = Array.from(authorsMap.keys());
  const additionsPerAuthor = Math.floor(file.additions / authors.length);
  const deletionsPerAuthor = Math.floor(file.deletions / authors.length);

  for (let i = 0; i < authors.length; i++) {
    const author = authors[i];
    const authorInfo = authorsMap.get(author);
    const isLast = i === authors.length - 1;

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
      if (!pr.merged_at) {
        continue;
      }

      const mergedDate = new Date(pr.merged_at);
      const start = new Date(startDate);
      const end = new Date(endDate);

      end.setHours(23, 59, 59, 999);

      if (mergedDate >= start && mergedDate <= end) {
        prNumbers.push(pr.number);
        console.log(`Found PR #${pr.number} merged on ${pr.merged_at}`);
      } else if (mergedDate < start) {
        foundOlderPR = true;
        break;
      }
    }

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

      for (const contribution of prResult.userContributions) {
        const currentStats = aggregatedUserStats.get(contribution.user) || {
          additions: 0,
          deletions: 0,
          name: contribution.name,
          email: contribution.email,
        };

        currentStats.additions += contribution.additions;
        currentStats.deletions += contribution.deletions;

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
    }
  }

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

  if (excludeUsers.includes(user)) {
    return true;
  }
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
