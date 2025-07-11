import { config } from 'dotenv';
import { Octokit } from 'octokit';
import { calculateContributionStats, convertToUserContributions, processFileContributions } from './contributions.js';
import { filterCommits, filterFiles } from './exclusions.js';
import { Logger } from './logger.js';
import type {
  BaseAnalysisResult,
  DateRangeAnalysisResult,
  ExclusionOptions,
  GitHubCommit,
  PRNumbersAnalysisResult,
  UserStats,
} from './types.js';
import type { Repository } from './utils.js';

config();

const octokit = new Octokit({
  auth: process.env.GH_TOKEN,
});

export async function analyzePullRequestsByDateRangeMultiRepo(
  repositories: Repository[],
  startDate: string,
  endDate: string,
  exclusionOptions: ExclusionOptions = {},
  verbose: boolean = false
): Promise<DateRangeAnalysisResult> {
  const { allPrNumbers, ...rest } = await analyzePullRequestsCore(
    repositories,
    async (owner: string, repo: string, logger: Logger) => {
      const prNumbers = await findPRsByDateRange(owner, repo, startDate, endDate, logger);
      if (prNumbers.length > 0) {
        logger.success(`Found ${prNumbers.length} PRs in the specified date range`);
      }
      return prNumbers;
    },
    exclusionOptions,
    verbose
  );

  return {
    ...rest,
    startDate,
    endDate,
    totalPRs: allPrNumbers.length,
    prNumbers: allPrNumbers,
  };
}

export async function analyzePullRequestsByNumbersMultiRepo(
  repositories: Repository[],
  prNumbers: number[],
  exclusionOptions: ExclusionOptions = {},
  verbose: boolean = false
): Promise<PRNumbersAnalysisResult> {
  const { allPrNumbers, ...rest } = await analyzePullRequestsCore(
    repositories,
    async (owner: string, repo: string, logger: Logger) => {
      const validPrNumbers = await validatePRsExist(owner, repo, prNumbers, logger);
      if (validPrNumbers.length > 0) {
        logger.success(`Found ${validPrNumbers.length} valid PRs`);
      }
      return validPrNumbers;
    },
    exclusionOptions,
    verbose
  );

  return {
    ...rest,
    totalPRs: allPrNumbers.length,
    prNumbers: allPrNumbers,
  };
}

/**
 * Core analysis function that processes PRs from multiple repositories
 */
async function analyzePullRequestsCore(
  repositories: Repository[],
  getPRNumbersForRepo: (owner: string, repo: string, logger: Logger) => Promise<number[]>,
  exclusionOptions: ExclusionOptions = {},
  verbose: boolean = false
): Promise<BaseAnalysisResult & { allPrNumbers: number[] }> {
  const logger = new Logger(verbose);
  logger.info(`Analyzing ${repositories.length} repositories...`);

  let totalAdditions = 0;
  let totalDeletions = 0;
  let totalPairAdditions = 0;
  let totalPairDeletions = 0;
  const aggregatedUserStats = new Map<string, UserStats>();
  const allPrNumbers: number[] = [];

  for (const { owner, repo } of repositories) {
    logger.repository(`\nProcessing repository: ${owner}/${repo}`);

    try {
      // Get PR numbers for this repository using the provided strategy
      const prNumbers = await getPRNumbersForRepo(owner, repo, logger);

      if (prNumbers.length === 0) {
        logger.info(`No PRs found for ${owner}/${repo}`);
        continue;
      }

      logger.success(`Found ${prNumbers.length} PRs`);
      allPrNumbers.push(...prNumbers);

      logger.progress(`Analyzing ${prNumbers.length} PRs...`);
      for (let i = 0; i < prNumbers.length; i++) {
        const prNumber = prNumbers[i];
        logger.log(`\n[${i + 1}/${prNumbers.length}] Analyzing PR #${prNumber}...`);

        try {
          const filesResponse = await octokit.rest.pulls.listFiles({
            owner,
            repo,
            pull_number: prNumber,
          });

          const files = filesResponse.data;
          logger.log(`Analyzing ${files.length} changed files...`);

          logger.log('Fetching PR commits...');
          const allCommits = await getPRCommits(owner, repo, prNumber, logger);
          logger.log(`Found ${allCommits.length} commits in PR`);
          const filteredCommits = filterCommits(allCommits, exclusionOptions, logger);
          const filteredFiles = filterFiles(files, exclusionOptions, logger);
          for (const file of filteredFiles) {
            logger.log(`Processing file: ${file.filename} (+${file.additions}/-${file.deletions})`);

            const { additionsIncluded, deletionsIncluded, pairAdditions, pairDeletions } = processFileContributions(
              file,
              filteredCommits,
              aggregatedUserStats,
              exclusionOptions,
              logger
            );

            totalAdditions += additionsIncluded;
            totalDeletions += deletionsIncluded;
            totalPairAdditions += pairAdditions;
            totalPairDeletions += pairDeletions;
          }
        } catch (error) {
          logger.error(`Error analyzing PR #${prNumber}:`, error);
        }

        if (!logger.verbose) {
          process.stdout.write('.');
        }
      }

      // Add newline after processing all PRs in this repository
      showProgressIndicator(logger.verbose, prNumbers.length);
    } catch (error) {
      logger.error(`Error analyzing repository ${owner}/${repo}:`, error);
      // Continue with other repositories
    }
  }

  const totalPairEditLines = totalPairAdditions + totalPairDeletions;
  const totalEditLines = totalAdditions + totalDeletions + totalPairEditLines;

  // Convert aggregated stats to user contributions
  const userContributions = convertToUserContributions(aggregatedUserStats, totalEditLines);

  // Calculate human vs AI contributions (excluding pair programming)
  const aiEmails = exclusionOptions.aiEmails || new Set<string>();
  const humanContribs = userContributions.filter((contrib) => !aiEmails.has(contrib.email || ''));
  const aiContribs = userContributions.filter((contrib) => aiEmails.has(contrib.email || ''));

  const humanContributions = calculateContributionStats(humanContribs, totalEditLines);
  const aiContributions = calculateContributionStats(aiContribs, totalEditLines);

  // Calculate pair programming contributions
  const pairContributions = {
    totalAdditions: totalPairAdditions,
    totalDeletions: totalPairDeletions,
    totalEditLines: totalPairEditLines,
    percentage: totalEditLines > 0 ? Math.round((totalPairEditLines / totalEditLines) * 100) : 0,
    peopleCount: 0, // Pair programming doesn't count as individual people
  };

  return {
    totalAdditions: totalAdditions + totalPairAdditions,
    totalDeletions: totalDeletions + totalPairDeletions,
    totalEditLines,
    userContributions,
    humanContributions,
    aiContributions,
    pairContributions,
    allPrNumbers: allPrNumbers.sort((a, b) => a - b),
  };
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

function showProgressIndicator(verbose: boolean, prCount: number): void {
  if (!verbose && prCount > 0) {
    console.log(''); // Add newline after dots
  }
}

async function validatePRsExist(owner: string, repo: string, prNumbers: number[], logger: Logger): Promise<number[]> {
  const validPrNumbers: number[] = [];

  for (const prNumber of prNumbers) {
    try {
      logger.log(`Checking if PR #${prNumber} exists...`);
      await octokit.rest.pulls.get({
        owner,
        repo,
        pull_number: prNumber,
      });
      validPrNumbers.push(prNumber);
      logger.log(`PR #${prNumber} exists`);
    } catch (error) {
      logger.error(`PR #${prNumber} not found in ${owner}/${repo}:`, error);
    }
  }

  return validPrNumbers;
}
