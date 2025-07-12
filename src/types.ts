import type { Octokit } from 'octokit';

export interface ExclusionOptions {
  excludeFiles?: string[];
  excludeUsers?: string[];
  excludeEmails?: string[];
  excludeCommitMessages?: string[];
  aiEmails?: Set<string>;
}

export interface UserStats {
  additions: number;
  deletions: number;
  pairAdditions: number;
  pairDeletions: number;
  name?: string;
  email?: string;
}

export interface CommitAuthor {
  name?: string;
  email?: string;
}

export interface CommitContributors {
  author: CommitAuthor;
  coAuthors: CommitAuthor[];
}

export interface UserContribution {
  user: string;
  name?: string;
  email?: string;
  additions: number;
  deletions: number;
  pairAdditions: number;
  pairDeletions: number;
  totalLines: number;
  pairLines: number;
  soloLines: number;
  percentage: number;
  pairPercentage: number;
  soloPercentage: number;
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
  pairContributions: ContributionStats;
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

export interface PRNumbersAnalysisResult extends BaseAnalysisResult {
  totalPRs: number;
  prNumbers: number[];
}

export type GitHubCommit = Awaited<ReturnType<Octokit['rest']['pulls']['listCommits']>>['data'][0];
export type GitHubFile = Awaited<ReturnType<Octokit['rest']['pulls']['listFiles']>>['data'][0];
