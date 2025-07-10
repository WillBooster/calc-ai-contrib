import { config } from 'dotenv';
import micromatch from 'micromatch';
import { Octokit } from 'octokit';
import { Logger } from './logger.js';

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

export function formatDateRangeAnalysisResult(
  result: DateRangeAnalysisResult,
  exclusionOptions: ExclusionOptions = {}
): string {
  const lines: string[] = [];

  lines.push('╔══════════════════════════════════════════════════════════════════════════════════════╗');
  lines.push(`║                           CONTRIBUTION ANALYSIS REPORT                              ║`);
  lines.push('╠══════════════════════════════════════════════════════════════════════════════════════╣');
  lines.push(
    `║ Date Range: ${result.startDate} to ${result.endDate}${' '.repeat(Math.max(0, 47 - result.startDate.length - result.endDate.length))}║`
  );
  lines.push(
    `║ Total PRs:  ${result.totalPRs.toString().padEnd(10)} │ Total Edits: ${result.totalEditLines.toString().padEnd(25)}║`
  );
  lines.push(
    `║ PR Numbers: ${result.prNumbers.slice(0, 8).join(', ')}${result.prNumbers.length > 8 ? '...' : ''}${' '.repeat(Math.max(0, 65 - result.prNumbers.slice(0, 8).join(', ').length - (result.prNumbers.length > 8 ? 3 : 0)))}║`
  );
  lines.push('╚══════════════════════════════════════════════════════════════════════════════════════╝');
  lines.push('');

  lines.push('📊 SUMMARY STATISTICS');
  lines.push('─'.repeat(50));
  lines.push(`Total Additions: ${result.totalAdditions.toLocaleString()}`);
  lines.push(`Total Deletions: ${result.totalDeletions.toLocaleString()}`);
  lines.push(`Total Edit Lines: ${result.totalEditLines.toLocaleString()}`);
  lines.push('');

  const hasAIEmails = exclusionOptions.aiEmails && exclusionOptions.aiEmails.length > 0;
  if (hasAIEmails) {
    lines.push('🤖 HUMAN vs AI BREAKDOWN');
    lines.push('─'.repeat(50));

    const humanPercentage = result.humanContributions.percentage;
    const aiPercentage = result.aiContributions.percentage;
    const barLength = 40;
    const humanBars = Math.round((humanPercentage / 100) * barLength);
    const aiBars = barLength - humanBars;

    lines.push(`┌${'─'.repeat(barLength + 2)}┐`);
    lines.push(`│${'█'.repeat(humanBars)}${'░'.repeat(aiBars)}│`);
    lines.push(`└${'─'.repeat(barLength + 2)}┘`);
    lines.push(
      `  Human: ${humanPercentage}%${' '.repeat(Math.max(0, 30 - humanPercentage.toString().length))}AI: ${aiPercentage}%`
    );
    lines.push('');

    lines.push(`👥 Human Contributors: ${result.humanContributions.percentage}%`);
    lines.push(`   • Additions: +${result.humanContributions.totalAdditions.toLocaleString()}`);
    lines.push(`   • Deletions: -${result.humanContributions.totalDeletions.toLocaleString()}`);
    lines.push(`   • Total Edits: ${result.humanContributions.totalEditLines.toLocaleString()}`);
    lines.push(`   • Users: ${result.humanContributions.peopleCount}`);
    lines.push('');

    lines.push(`🤖 AI Contributors: ${result.aiContributions.percentage}%`);
    lines.push(`   • Additions: +${result.aiContributions.totalAdditions.toLocaleString()}`);
    lines.push(`   • Deletions: -${result.aiContributions.totalDeletions.toLocaleString()}`);
    lines.push(`   • Total Edits: ${result.aiContributions.totalEditLines.toLocaleString()}`);
    lines.push(`   • Users: ${result.aiContributions.peopleCount}`);
    lines.push('');
  }

  lines.push('👤 INDIVIDUAL CONTRIBUTIONS');
  lines.push('─'.repeat(50));

  if (result.userContributions.length === 0) {
    lines.push('No contributions found in the specified date range.');
  } else {
    for (const contribution of result.userContributions) {
      const userInfo = contribution.user;
      const nameInfo = contribution.name ? ` (${contribution.name})` : '';
      const emailInfo = contribution.email ? ` <${contribution.email}>` : '';

      const userBarLength = 20;
      const userBars = Math.round((contribution.percentage / 100) * userBarLength);
      const userBar = '█'.repeat(userBars) + '░'.repeat(userBarLength - userBars);

      lines.push(`${userInfo}${nameInfo}${emailInfo}:`);
      lines.push(`  [${userBar}] ${contribution.percentage}%`);
      lines.push(
        `  +${contribution.additions.toLocaleString()} / -${contribution.deletions.toLocaleString()} (${contribution.totalLines.toLocaleString()} total)`
      );
      lines.push('');
    }
  }

  return lines.join('\n');
}

async function getPRCommits(owner: string, repo: string, prNumber: number, logger: Logger): Promise<GitHubCommit[]> {
  logger.log('Making single API call to get PR commits...');
  const commitsResponse = await octokit.rest.pulls.listCommits({
    owner,
    repo,
    pull_number: prNumber,
  });

  const commits = commitsResponse.data;
  logger.log(`Retrieved ${commits.length} commits from API`);

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

async function findPRsByDateRange(
  owner: string,
  repo: string,
  startDate: string,
  endDate: string,
  logger: Logger
): Promise<number[]> {
  logger.log(`Searching for PRs between ${startDate} and ${endDate}...`);

  const prNumbers: number[] = [];
  let page = 1;
  const perPage = 100;

  while (true) {
    logger.log(`Fetching PRs page ${page}...`);

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
        logger.log(`Found PR #${pr.number} merged on ${pr.merged_at}`);
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

  logger.log(`Found ${prNumbers.length} PRs in the specified date range`);
  return prNumbers.sort((a, b) => a - b);
}

interface Repository {
  owner: string;
  repo: string;
}

export async function analyzePullRequestsByDateRangeMultiRepo(
  repositories: Repository[],
  startDate: string,
  endDate: string,
  exclusionOptions: ExclusionOptions = {},
  verbose: boolean = false
): Promise<DateRangeAnalysisResult> {
  const logger = new Logger(verbose);
  logger.info(`Analyzing ${repositories.length} repositories...`);

  let totalAdditions = 0;
  let totalDeletions = 0;
  const aggregatedUserStats = new Map<string, UserStats>();
  const allPrNumbers: number[] = [];

  for (const { owner, repo } of repositories) {
    logger.repository(`\nProcessing repository: ${owner}/${repo}`);

    try {
      // Find PRs in date range for this repository
      const prNumbers = await findPRsByDateRange(owner, repo, startDate, endDate, logger);

      if (prNumbers.length === 0) {
        logger.info(`No PRs found in the specified date range for ${owner}/${repo}`);
        continue;
      }

      logger.success(`Found ${prNumbers.length} PRs in the specified date range`);
      allPrNumbers.push(...prNumbers);

      logger.progress(`Analyzing ${prNumbers.length} PRs...`);

      // Analyze each PR directly
      for (let i = 0; i < prNumbers.length; i++) {
        const prNumber = prNumbers[i];
        logger.log(`\n[${i + 1}/${prNumbers.length}] Analyzing PR #${prNumber}...`);

        try {
          // Get PR files
          const filesResponse = await octokit.rest.pulls.listFiles({
            owner,
            repo,
            pull_number: prNumber,
          });

          const files = filesResponse.data;
          logger.log(`Analyzing ${files.length} changed files...`);

          // Get PR commits
          logger.log('Fetching PR commits...');
          const allCommits = await getPRCommits(owner, repo, prNumber, logger);
          logger.log(`Found ${allCommits.length} commits in PR`);

          // Filter commits by exclusion criteria
          const filteredCommits = allCommits.filter((commit) => {
            const commitMessage = commit.commit?.message || '';
            return !shouldExcludeCommit(commitMessage, exclusionOptions.excludeCommitMessages);
          });

          if (filteredCommits.length !== allCommits.length) {
            logger.log(
              `Filtered out ${allCommits.length - filteredCommits.length} commits based on exclusion criteria`
            );
          }

          // Filter files by exclusion criteria
          const filteredFiles = files.filter((file) => {
            return !shouldExcludeFile(file.filename, exclusionOptions.excludeFiles);
          });

          if (filteredFiles.length !== files.length) {
            logger.log(`Filtered out ${files.length - filteredFiles.length} files based on exclusion criteria`);
          }

          // Process each file
          for (const file of filteredFiles) {
            logger.log(`Processing file: ${file.filename} (+${file.additions}/-${file.deletions})`);

            const fileContributors = distributeFileContributions(filteredCommits, file);
            let fileAdditionsIncluded = 0;
            let fileDeletionsIncluded = 0;

            for (const [author, stats] of fileContributors) {
              if (shouldExcludeUser(author, stats.name, stats.email, exclusionOptions)) {
                logger.log(`Excluding user: ${author} (${stats.name || 'no name'}) <${stats.email || 'no email'}>`);
                continue;
              }

              const currentStats = aggregatedUserStats.get(author) || {
                additions: 0,
                deletions: 0,
                name: stats.name,
                email: stats.email,
              };
              currentStats.additions += stats.additions;
              currentStats.deletions += stats.deletions;
              fileAdditionsIncluded += stats.additions;
              fileDeletionsIncluded += stats.deletions;

              if (!currentStats.name && stats.name) {
                currentStats.name = stats.name;
              }
              if (!currentStats.email && stats.email) {
                currentStats.email = stats.email;
              }
              aggregatedUserStats.set(author, currentStats);
            }

            // Only count additions/deletions from non-excluded users
            totalAdditions += fileAdditionsIncluded;
            totalDeletions += fileDeletionsIncluded;
          }
        } catch (error) {
          logger.error(`Error analyzing PR #${prNumber}:`, error);
        }

        // Show progress indicator (one dot per PR processed)
        if (!logger.verbose) {
          process.stdout.write('.');
        }
      }

      // Add newline after processing all PRs in this repository
      if (!logger.verbose && prNumbers.length > 0) {
        console.log(''); // Add newline after dots
      }
    } catch (error) {
      logger.error(`Error analyzing repository ${owner}/${repo}:`, error);
      // Continue with other repositories
    }
  }

  const totalEditLines = totalAdditions + totalDeletions;

  // Convert aggregated stats to user contributions
  const userContributions: UserContribution[] = Array.from(aggregatedUserStats.entries())
    .map(([user, stats]) => ({
      user,
      name: stats.name,
      email: stats.email,
      additions: stats.additions,
      deletions: stats.deletions,
      totalLines: stats.additions + stats.deletions,
      percentage: totalEditLines > 0 ? Math.round(((stats.additions + stats.deletions) / totalEditLines) * 100) : 0,
    }))
    .sort((a, b) => b.totalLines - a.totalLines);

  // Calculate human vs AI contributions
  const aiEmails = exclusionOptions.aiEmails || [];
  const humanContribs = userContributions.filter((contrib) => !aiEmails.some((aiEmail) => contrib.email === aiEmail));
  const aiContribs = userContributions.filter((contrib) => aiEmails.some((aiEmail) => contrib.email === aiEmail));

  const humanTotalAdditions = humanContribs.reduce((sum, contrib) => sum + contrib.additions, 0);
  const humanTotalDeletions = humanContribs.reduce((sum, contrib) => sum + contrib.deletions, 0);
  const humanTotalEditLines = humanTotalAdditions + humanTotalDeletions;
  const humanPercentage = totalEditLines > 0 ? Math.round((humanTotalEditLines / totalEditLines) * 100) : 0;

  const aiTotalAdditions = aiContribs.reduce((sum, contrib) => sum + contrib.additions, 0);
  const aiTotalDeletions = aiContribs.reduce((sum, contrib) => sum + contrib.deletions, 0);
  const aiTotalEditLines = aiTotalAdditions + aiTotalDeletions;
  const aiPercentage = totalEditLines > 0 ? Math.round((aiTotalEditLines / totalEditLines) * 100) : 0;

  return {
    startDate,
    endDate,
    totalPRs: allPrNumbers.length,
    prNumbers: allPrNumbers.sort((a, b) => a - b),
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
