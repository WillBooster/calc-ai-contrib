interface PullRequestFile {
  filename: string;
  additions: number;
  deletions: number;
  patch?: string;
}

interface PullRequestData {
  number: number;
  title: string;
  user: {
    login: string;
  };
  files: PullRequestFile[];
}

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

export async function fetchPullRequestData(
  owner: string,
  repo: string,
  prNumber: number,
  token?: string
): Promise<PullRequestData> {
  const headers: HeadersInit = {
    Accept: 'application/vnd.github.v3+json',
  };

  if (token) {
    headers.Authorization = `token ${token}`;
  }

  const prResponse = await fetch(`https://api.github.com/repos/${owner}/${repo}/pulls/${prNumber}`, {
    headers,
  });

  if (!prResponse.ok) {
    throw new Error(`Failed to fetch PR data: ${prResponse.status} ${prResponse.statusText}`);
  }

  const prData = await prResponse.json();

  const filesResponse = await fetch(`https://api.github.com/repos/${owner}/${repo}/pulls/${prNumber}/files`, {
    headers,
  });

  if (!filesResponse.ok) {
    throw new Error(`Failed to fetch PR files: ${filesResponse.status} ${filesResponse.statusText}`);
  }

  const files = await filesResponse.json();

  return {
    number: prData.number,
    title: prData.title,
    user: prData.user,
    files,
  };
}

export async function analyzePullRequestCommits(
  owner: string,
  repo: string,
  prNumber: number,
  token?: string
): Promise<PRAnalysisResult> {
  const headers: HeadersInit = {
    Accept: 'application/vnd.github.v3+json',
  };

  if (token) {
    headers.Authorization = `token ${token}`;
  }

  const commitsResponse = await fetch(`https://api.github.com/repos/${owner}/${repo}/pulls/${prNumber}/commits`, {
    headers,
  });

  if (!commitsResponse.ok) {
    throw new Error(`Failed to fetch commits: ${commitsResponse.status} ${commitsResponse.statusText}`);
  }

  const commits = await commitsResponse.json();

  const userStats = new Map<string, { additions: number; deletions: number }>();

  for (const commit of commits) {
    const username = commit.author?.login || commit.commit.author.name || 'Unknown';

    const commitDetailResponse = await fetch(commit.url, { headers });
    if (!commitDetailResponse.ok) {
      console.warn(`Failed to fetch commit details for ${commit.sha}`);
      continue;
    }

    const commitDetail = await commitDetailResponse.json();
    const stats = commitDetail.stats || { additions: 0, deletions: 0 };

    const currentStats = userStats.get(username) || { additions: 0, deletions: 0 };
    currentStats.additions += stats.additions;
    currentStats.deletions += stats.deletions;
    userStats.set(username, currentStats);
  }

  let totalAdditions = 0;
  let totalDeletions = 0;

  const userContributions: UserContribution[] = [];

  for (const [user, stats] of userStats) {
    totalAdditions += stats.additions;
    totalDeletions += stats.deletions;

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
