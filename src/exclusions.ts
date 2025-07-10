import micromatch from 'micromatch';
import type { Logger } from './logger.js';
import type { ExclusionOptions, GitHubCommit, GitHubFile } from './types.js';

/**
 * Check if any exclusion options are provided
 */
export function hasExclusionOptions(options: ExclusionOptions): boolean {
  return Boolean(
    options.excludeFiles?.length ||
      options.excludeUsers?.length ||
      options.excludeEmails?.length ||
      options.excludeCommitMessages?.length ||
      options.aiEmails?.length
  );
}

/**
 * Check if a file should be excluded based on glob patterns
 */
export function shouldExcludeFile(filename: string, excludePatterns: string[] = []): boolean {
  return excludePatterns.some((pattern) => micromatch.isMatch(filename, pattern));
}

/**
 * Check if a user should be excluded based on exclusion criteria
 */
export function shouldExcludeUser(
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

/**
 * Check if a commit should be excluded based on message patterns
 */
export function shouldExcludeCommit(commitMessage: string, excludePatterns: string[] = []): boolean {
  return excludePatterns.some((pattern) => commitMessage.includes(pattern));
}

/**
 * Filter commits based on exclusion criteria
 */
export function filterCommits(
  commits: GitHubCommit[],
  exclusionOptions: ExclusionOptions,
  logger: Logger
): GitHubCommit[] {
  const filteredCommits = commits.filter((commit) => {
    const commitMessage = commit.commit?.message || '';
    return !shouldExcludeCommit(commitMessage, exclusionOptions.excludeCommitMessages);
  });

  if (filteredCommits.length !== commits.length) {
    logger.log(`Filtered out ${commits.length - filteredCommits.length} commits based on exclusion criteria`);
  }

  return filteredCommits;
}

/**
 * Filter files based on exclusion criteria
 */
export function filterFiles(files: GitHubFile[], exclusionOptions: ExclusionOptions, logger: Logger): GitHubFile[] {
  const filteredFiles = files.filter((file) => {
    return !shouldExcludeFile(file.filename, exclusionOptions.excludeFiles);
  });

  if (filteredFiles.length !== files.length) {
    logger.log(`Filtered out ${files.length - filteredFiles.length} files based on exclusion criteria`);
  }

  return filteredFiles;
}
