/**
 * Repository specification interface
 */
export interface Repository {
  owner: string;
  repo: string;
}

/**
 * Parse repository specifications from string array
 */
export function parseRepositories(repos: string[]): Repository[] {
  return repos.map((repoSpec) => {
    const [owner, repo] = repoSpec.split('/');
    return { owner, repo };
  });
}

/**
 * Validate repository format
 */
export function validateRepositoryFormat(repos: string[]): void {
  for (const repo of repos) {
    if (!repo.includes('/') || repo.split('/').length !== 2) {
      throw new Error(`Invalid repository format: "${repo}". Expected format: "owner/repo"`);
    }
  }
}

/**
 * Validate date format and range
 */
export function validateDateRange(startDate: string, endDate: string): void {
  const start = new Date(startDate);
  const end = new Date(endDate);

  if (Number.isNaN(start.getTime())) {
    throw new Error('Invalid start-date format. Use YYYY-MM-DD');
  }

  if (Number.isNaN(end.getTime())) {
    throw new Error('Invalid end-date format. Use YYYY-MM-DD');
  }

  if (start > end) {
    throw new Error('start-date must be before or equal to end-date');
  }
}

/**
 * Validate PR numbers format
 */
export function validatePRNumbers(prNumbers: string[]): void {
  if (!prNumbers || prNumbers.length === 0) {
    throw new Error('At least one PR number must be specified');
  }

  for (const prNumber of prNumbers) {
    const num = Number(prNumber);
    if (Number.isNaN(num) || num <= 0 || !Number.isInteger(num)) {
      throw new Error(`Invalid PR number: "${prNumber}". PR numbers must be positive integers`);
    }
  }
}
