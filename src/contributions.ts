import { shouldExcludeUser } from './exclusions.js';
import type { Logger } from './logger.js';
import type { ExclusionOptions, GitHubCommit, GitHubFile, UserContribution, UserStats } from './types.js';
import { parseCoAuthors } from './utils.js';

/**
 * Calculate contribution statistics for a group of users
 */
export function calculateContributionStats(
  userContributions: Array<{ additions: number; deletions: number; email?: string }>,
  totalEditLines: number
): {
  totalAdditions: number;
  totalDeletions: number;
  totalEditLines: number;
  percentage: number;
  peopleCount: number;
} {
  const totalAdditions = userContributions.reduce((sum, contrib) => sum + contrib.additions, 0);
  const totalDeletions = userContributions.reduce((sum, contrib) => sum + contrib.deletions, 0);
  const contributionEditLines = totalAdditions + totalDeletions;
  const percentage = totalEditLines > 0 ? Math.round((contributionEditLines / totalEditLines) * 100) : 0;

  return {
    totalAdditions,
    totalDeletions,
    totalEditLines: contributionEditLines,
    percentage,
    peopleCount: userContributions.length,
  };
}

/**
 * Merge user stats into aggregated map
 */
export function mergeUserStats(aggregatedStats: Map<string, UserStats>, author: string, stats: UserStats): void {
  const currentStats = aggregatedStats.get(author) || {
    additions: 0,
    deletions: 0,
    name: stats.name,
    email: stats.email,
  };

  currentStats.additions += stats.additions;
  currentStats.deletions += stats.deletions;

  // Update name and email if not already set
  if (!currentStats.name && stats.name) {
    currentStats.name = stats.name;
  }
  if (!currentStats.email && stats.email) {
    currentStats.email = stats.email;
  }

  aggregatedStats.set(author, currentStats);
}

/**
 * Convert aggregated user stats to user contributions array
 */
export function convertToUserContributions(
  aggregatedStats: Map<string, UserStats>,
  totalEditLines: number
): UserContribution[] {
  return Array.from(aggregatedStats.entries())
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
}

/**
 * Process file contributions and update aggregated stats
 */
export function processFileContributions(
  file: GitHubFile,
  commits: GitHubCommit[],
  aggregatedUserStats: Map<string, UserStats>,
  exclusionOptions: ExclusionOptions,
  logger: Logger
): {
  additionsIncluded: number;
  deletionsIncluded: number;
  pairAdditions: number;
  pairDeletions: number;
} {
  const { userContributions, pairContributions } = distributeFileContributionsWithPairTracking(
    commits,
    file,
    exclusionOptions
  );
  let fileAdditionsIncluded = 0;
  let fileDeletionsIncluded = 0;

  for (const [author, stats] of userContributions) {
    if (shouldExcludeUser(author, stats.name, stats.email, exclusionOptions)) {
      logger.log(`Excluding user: ${author} (${stats.name || 'no name'}) <${stats.email || 'no email'}>`);
      continue;
    }

    mergeUserStats(aggregatedUserStats, author, stats);
    fileAdditionsIncluded += stats.additions;
    fileDeletionsIncluded += stats.deletions;
  }

  return {
    additionsIncluded: fileAdditionsIncluded,
    deletionsIncluded: fileDeletionsIncluded,
    pairAdditions: pairContributions.additions,
    pairDeletions: pairContributions.deletions,
  };
}

/**
 * Distribute file contributions among commits, including co-authors
 */
export function distributeFileContributions(commits: GitHubCommit[], file: GitHubFile): Map<string, UserStats> {
  const contributions = new Map<string, UserStats>();

  if (commits.length === 0) {
    contributions.set('Unknown', { additions: file.additions, deletions: file.deletions });
    return contributions;
  }

  const authorsMap = new Map<string, Pick<UserStats, 'name' | 'email'>>();

  for (const commit of commits) {
    // Main author
    const authorLogin = commit.author?.login;
    const author = authorLogin || commit.commit?.author?.name || 'Unknown';
    const name = commit.commit?.author?.name || undefined;
    const email = commit.commit?.author?.email || undefined;

    if (!authorsMap.has(author)) {
      authorsMap.set(author, { name, email });
    }

    // Co-authors from commit message
    const commitMessage = commit.commit?.message || '';
    const coAuthors = parseCoAuthors(commitMessage);

    for (const coAuthor of coAuthors) {
      const coAuthorKey = coAuthor.email || coAuthor.name || 'Unknown Co-author';
      if (!authorsMap.has(coAuthorKey)) {
        authorsMap.set(coAuthorKey, { name: coAuthor.name, email: coAuthor.email });
      }
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

/**
 * Determine if a commit represents pair programming (both AI and human contributors)
 */
export function isPairProgrammingCommit(
  authorEmail: string | undefined,
  coAuthorEmails: string[],
  aiEmails: Set<string>
): boolean {
  const allEmails = [authorEmail, ...coAuthorEmails].filter((email): email is string => Boolean(email));

  if (allEmails.length <= 1) {
    return false; // Single contributor, not pair programming
  }

  const hasAI = allEmails.some((email) => aiEmails.has(email));
  const hasHuman = allEmails.some((email) => !aiEmails.has(email));

  return hasAI && hasHuman;
}

/**
 * Distribute file contributions with pair programming tracking
 */
export function distributeFileContributionsWithPairTracking(
  commits: GitHubCommit[],
  file: GitHubFile,
  exclusionOptions: ExclusionOptions
): {
  userContributions: Map<string, UserStats>;
  pairContributions: { additions: number; deletions: number };
} {
  const userContributions = new Map<string, UserStats>();
  let pairAdditions = 0;
  let pairDeletions = 0;

  if (commits.length === 0) {
    userContributions.set('Unknown', { additions: file.additions, deletions: file.deletions });
    return { userContributions, pairContributions: { additions: 0, deletions: 0 } };
  }

  const aiEmails = exclusionOptions.aiEmails || new Set<string>();

  // Separate commits into pair programming and non-pair programming
  const pairCommits: GitHubCommit[] = [];
  const nonPairCommits: GitHubCommit[] = [];

  for (const commit of commits) {
    const authorEmail = commit.commit?.author?.email;
    const commitMessage = commit.commit?.message || '';
    const coAuthors = parseCoAuthors(commitMessage);
    const coAuthorEmails = coAuthors.map((ca) => ca.email).filter((email): email is string => Boolean(email));

    if (isPairProgrammingCommit(authorEmail, coAuthorEmails, aiEmails)) {
      pairCommits.push(commit);
    } else {
      nonPairCommits.push(commit);
    }
  }

  // Calculate contributions for pair programming commits
  if (pairCommits.length > 0) {
    const pairRatio = pairCommits.length / commits.length;
    pairAdditions = Math.floor(file.additions * pairRatio);
    pairDeletions = Math.floor(file.deletions * pairRatio);
  }

  // Calculate contributions for non-pair programming commits
  if (nonPairCommits.length > 0) {
    const nonPairAdditions = file.additions - pairAdditions;
    const nonPairDeletions = file.deletions - pairDeletions;

    const authorsMap = new Map<string, Pick<UserStats, 'name' | 'email'>>();

    for (const commit of nonPairCommits) {
      const authorLogin = commit.author?.login;
      const author = authorLogin || commit.commit?.author?.name || 'Unknown';
      const name = commit.commit?.author?.name || undefined;
      const email = commit.commit?.author?.email || undefined;

      if (!authorsMap.has(author)) {
        authorsMap.set(author, { name, email });
      }
    }

    const authors = Array.from(authorsMap.keys());
    const additionsPerAuthor = Math.floor(nonPairAdditions / authors.length);
    const deletionsPerAuthor = Math.floor(nonPairDeletions / authors.length);

    for (let i = 0; i < authors.length; i++) {
      const author = authors[i];
      const authorInfo = authorsMap.get(author);
      const isLast = i === authors.length - 1;

      const additions = isLast ? nonPairAdditions - additionsPerAuthor * (authors.length - 1) : additionsPerAuthor;
      const deletions = isLast ? nonPairDeletions - deletionsPerAuthor * (authors.length - 1) : deletionsPerAuthor;

      userContributions.set(author, {
        additions,
        deletions,
        name: authorInfo?.name,
        email: authorInfo?.email,
      });
    }
  }

  return {
    userContributions,
    pairContributions: { additions: pairAdditions, deletions: pairDeletions },
  };
}
