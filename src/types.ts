export interface ExclusionOptions {
  excludeFiles?: string[];
  excludeUsers?: string[];
  excludeEmails?: string[];
  excludeCommitMessages?: string[];
  aiEmails?: string[];
}

export interface UserStats {
  additions: number;
  deletions: number;
  name?: string;
  email?: string;
}

export interface UserContribution {
  user: string;
  name?: string;
  email?: string;
  additions: number;
  deletions: number;
  totalLines: number;
  percentage: number;
}

export interface ContributionStats {
  totalAdditions: number;
  totalDeletions: number;
  totalEditLines: number;
  percentage: number;
  peopleCount: number;
}

export interface BaseAnalysisResult {
  totalAdditions: number;
  totalDeletions: number;
  totalEditLines: number;
  userContributions: UserContribution[];
  humanContributions: ContributionStats;
  aiContributions: ContributionStats;
}

export interface PRAnalysisResult extends BaseAnalysisResult {
  prNumber: number;
}

export interface DateRangeAnalysisResult extends BaseAnalysisResult {
  startDate: string;
  endDate: string;
  totalPRs: number;
  prNumbers: number[];
}

// GitHub API types
export interface GitHubAuthor {
  name?: string | null;
  email?: string | null;
  login?: string;
  date?: string;
}

export interface GitHubCommitData {
  author?: GitHubAuthor | null;
  message?: string;
}

export interface GitHubCommit {
  author?: GitHubAuthor | Record<string, unknown> | null;
  commit?: GitHubCommitData;
}

export interface GitHubFile {
  filename: string;
  additions: number;
  deletions: number;
}
