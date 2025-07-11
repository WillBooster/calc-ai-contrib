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

/**
 * Parse co-authors from commit message
 */
export function parseCoAuthors(commitMessage: string): Array<{ name?: string; email?: string }> {
  const coAuthorRegex = /^Co-authored-by:\s*(.+?)\s*<(.+?)>\s*$/gm;
  const coAuthors: Array<{ name?: string; email?: string }> = [];

  let match: RegExpExecArray | null;
  // biome-ignore lint/suspicious/noAssignInExpressions: This is a common pattern for regex matching
  while ((match = coAuthorRegex.exec(commitMessage)) !== null) {
    const name = match[1]?.trim();
    const email = match[2]?.trim();
    if (name && email) {
      coAuthors.push({ name, email });
    }
  }

  return coAuthors;
}

/**
 * Determine if a commit represents pair programming (both AI and human contributors)
 */
export function isPairProgrammingCommit(
  authorEmail: string | undefined,
  coAuthorEmails: string[],
  aiEmails: string[]
): boolean {
  const allEmails = [authorEmail, ...coAuthorEmails].filter((email): email is string => Boolean(email));

  if (allEmails.length <= 1) {
    return false; // Single contributor, not pair programming
  }

  const hasAI = allEmails.some((email) => aiEmails.includes(email));
  const hasHuman = allEmails.some((email) => !aiEmails.includes(email));

  return hasAI && hasHuman;
}
