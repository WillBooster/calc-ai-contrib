import { config } from 'dotenv';

interface UserContribution {
  user: string;
  additions: number;
  deletions: number;
  totalLines: number;
  percentage: number;
}

interface PRAnalysisResult {
  prNumber: number;
  totalAdditions: number;
  totalDeletions: number;
  totalEditLines: number;
  userContributions: UserContribution[];
}

interface GitHubCommit {
  sha: string;
  url: string;
  author?: {
    login: string;
  };
  commit: {
    author: {
      name: string;
    };
  };
  files?: Array<{
    filename: string;
    additions: number;
    deletions: number;
  }>;
}

config();

const headers: HeadersInit = {
  Accept: 'application/vnd.github.v3+json',
};
if (process.env.GH_TOKEN) {
  headers.Authorization = `token ${process.env.GH_TOKEN}`;
}

export async function analyzePullRequest(owner: string, repo: string, prNumber: number): Promise<PRAnalysisResult> {
  // Get the files changed in the PR
  const filesResponse = await fetch(`https://api.github.com/repos/${owner}/${repo}/pulls/${prNumber}/files`, {
    headers,
  });
  if (!filesResponse.ok) {
    throw new Error(`Failed to fetch PR files: ${filesResponse.status} ${filesResponse.statusText}`);
  }

  const files = await filesResponse.json();

  let totalAdditions = 0;
  let totalDeletions = 0;
  const userStats = new Map<string, { additions: number; deletions: number }>();

  console.log(`Analyzing ${files.length} changed files...`);

  // Get all commits for the PR once (instead of per file)
  console.log('Fetching PR commits...');
  const allCommits = await getPRCommits(owner, repo, prNumber);
  console.log(`Found ${allCommits.length} commits in PR`);

  // Simple approach: distribute file changes proportionally among commit authors
  for (const file of files) {
    console.log(`Processing file: ${file.filename} (+${file.additions}/-${file.deletions})`);
    totalAdditions += file.additions;
    totalDeletions += file.deletions;

    // Find commits that likely touched this file based on the commit messages or use simple distribution
    const fileContributors = distributeFileContributions(allCommits, file);

    for (const [author, stats] of fileContributors) {
      const currentStats = userStats.get(author) || { additions: 0, deletions: 0 };
      currentStats.additions += stats.additions;
      currentStats.deletions += stats.deletions;
      userStats.set(author, currentStats);
    }
  }

  // Convert to result format
  const userContributions: UserContribution[] = [];

  for (const [user, stats] of userStats) {
    userContributions.push({
      user,
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

  return {
    prNumber,
    totalAdditions,
    totalDeletions,
    totalEditLines,
    userContributions,
  };
}

// Keep the old commit-based function for comparison
export function formatAnalysisResult(result: PRAnalysisResult): string {
  const lines = [
    `PR #${result.prNumber} Analysis:`,
    `Total additions: ${result.totalAdditions}`,
    `Total deletions: ${result.totalDeletions}`,
    `Total edit lines: ${result.totalEditLines}`,
    '',
    'User contributions:',
  ];

  for (const contribution of result.userContributions) {
    lines.push(
      `${contribution.user}: ${contribution.percentage}% ` +
        `(+${contribution.additions}, -${contribution.deletions}, ` +
        `total: ${contribution.totalLines})`
    );
  }

  return lines.join('\n');
}

async function getPRCommits(owner: string, repo: string, prNumber: number): Promise<GitHubCommit[]> {
  console.log('Making single API call to get PR commits...');
  const commitsResponse = await fetch(`https://api.github.com/repos/${owner}/${repo}/pulls/${prNumber}/commits`, {
    headers,
  });

  if (!commitsResponse.ok) {
    throw new Error(`Failed to fetch commits: ${commitsResponse.status}`);
  }

  const commits = await commitsResponse.json();
  console.log(`Retrieved ${commits.length} commits from API`);

  return commits;
}

function distributeFileContributions(
  commits: GitHubCommit[],
  file: { filename: string; additions: number; deletions: number }
): Map<string, { additions: number; deletions: number }> {
  const contributions = new Map<string, { additions: number; deletions: number }>();

  if (commits.length === 0) {
    // Fallback: attribute to unknown
    contributions.set('Unknown', { additions: file.additions, deletions: file.deletions });
    return contributions;
  }

  // Simple distribution: divide changes equally among all commit authors
  // This is a simplified approach that avoids excessive API calls
  const authorsSet = new Set<string>();

  for (const commit of commits) {
    const author = commit.author?.login || commit.commit?.author?.name || 'Unknown';
    authorsSet.add(author);
  }

  const authors = Array.from(authorsSet);
  const additionsPerAuthor = Math.floor(file.additions / authors.length);
  const deletionsPerAuthor = Math.floor(file.deletions / authors.length);

  // Distribute changes
  for (let i = 0; i < authors.length; i++) {
    const author = authors[i];
    const isLast = i === authors.length - 1;

    // Give remainder to last author
    const additions = isLast ? file.additions - additionsPerAuthor * (authors.length - 1) : additionsPerAuthor;
    const deletions = isLast ? file.deletions - deletionsPerAuthor * (authors.length - 1) : deletionsPerAuthor;

    contributions.set(author, { additions, deletions });
  }

  return contributions;
}
