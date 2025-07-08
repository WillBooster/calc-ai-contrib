import { config } from 'dotenv';

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

interface BlameData {
  author: string;
  lineCount: number;
}

interface PatchLineInfo {
  lineNumber: number;
  content: string;
}

config();

export async function analyzePullRequestByDiff(
  owner: string,
  repo: string,
  prNumber: number,
  token?: string
): Promise<PRAnalysisResult> {
  const authToken = token || process.env.GH_TOKEN;
  const headers: HeadersInit = {
    Accept: 'application/vnd.github.v3+json',
  };

  if (authToken) {
    headers.Authorization = `token ${authToken}`;
  }

  // Get PR data to get base and head SHA
  const prResponse = await fetch(`https://api.github.com/repos/${owner}/${repo}/pulls/${prNumber}`, {
    headers,
  });

  if (!prResponse.ok) {
    throw new Error(`Failed to fetch PR data: ${prResponse.status} ${prResponse.statusText}`);
  }

  const prData = await prResponse.json();
  const baseSha = prData.base.sha;
  const headSha = prData.head.sha;

  // Get the files changed in the PR
  const filesResponse = await fetch(`https://api.github.com/repos/${owner}/${repo}/pulls/${prNumber}/files`, {
    headers,
  });

  if (!filesResponse.ok) {
    throw new Error(`Failed to fetch PR files: ${filesResponse.status} ${filesResponse.statusText}`);
  }

  const files = await filesResponse.json();

  const userStats = new Map<string, { additions: number; deletions: number }>();
  let totalAdditions = 0;
  let totalDeletions = 0;

  for (const file of files) {
    if (!file.patch) continue;

    totalAdditions += file.additions;
    totalDeletions += file.deletions;

    // Parse the patch to get line-by-line changes
    const { addedLines, removedLines } = parsePatch(file.patch);

    // For added lines, we need to use git blame to find who authored them
    if (addedLines.length > 0) {
      try {
        const blameData = await getBlameForFile(owner, repo, headSha, file.filename, addedLines, authToken);

        for (const blame of blameData) {
          const username = blame.author;
          const currentStats = userStats.get(username) || { additions: 0, deletions: 0 };
          currentStats.additions += blame.lineCount;
          userStats.set(username, currentStats);
        }
      } catch (error) {
        console.warn(`Failed to get blame for ${file.filename}:`, error);
        // Fallback: attribute all additions to 'Unknown'
        const currentStats = userStats.get('Unknown') || { additions: 0, deletions: 0 };
        currentStats.additions += addedLines.length;
        userStats.set('Unknown', currentStats);
      }
    }

    // For removed lines, we need to use git blame on the base commit
    if (removedLines.length > 0) {
      try {
        const blameData = await getBlameForFile(owner, repo, baseSha, file.filename, removedLines, authToken);

        for (const blame of blameData) {
          const username = blame.author;
          const currentStats = userStats.get(username) || { additions: 0, deletions: 0 };
          currentStats.deletions += blame.lineCount;
          userStats.set(username, currentStats);
        }
      } catch (error) {
        console.warn(`Failed to get blame for ${file.filename}:`, error);
        // Fallback: attribute all deletions to 'Unknown'
        const currentStats = userStats.get('Unknown') || { additions: 0, deletions: 0 };
        currentStats.deletions += removedLines.length;
        userStats.set('Unknown', currentStats);
      }
    }
  }

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
export async function analyzePullRequestCommits(
  owner: string,
  repo: string,
  prNumber: number,
  token?: string
): Promise<PRAnalysisResult> {
  const authToken = token || process.env.GH_TOKEN;
  const headers: HeadersInit = {
    Accept: 'application/vnd.github.v3+json',
  };

  if (authToken) {
    headers.Authorization = `token ${authToken}`;
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

function parsePatch(patch: string): { addedLines: PatchLineInfo[]; removedLines: PatchLineInfo[] } {
  const lines = patch.split('\n');
  const addedLines: PatchLineInfo[] = [];
  const removedLines: PatchLineInfo[] = [];

  let currentLineNumber = 0;
  let baseLineNumber = 0;

  for (const line of lines) {
    if (line.startsWith('@@')) {
      // Parse hunk header to get line numbers
      const match = line.match(/@@ -(\d+)(?:,\d+)? \+(\d+)(?:,\d+)? @@/);
      if (match) {
        baseLineNumber = parseInt(match[1], 10);
        currentLineNumber = parseInt(match[2], 10);
      }
      continue;
    }

    if (line.startsWith('+') && !line.startsWith('+++')) {
      addedLines.push({
        lineNumber: currentLineNumber,
        content: line.substring(1),
      });
      currentLineNumber++;
    } else if (line.startsWith('-') && !line.startsWith('---')) {
      removedLines.push({
        lineNumber: baseLineNumber,
        content: line.substring(1),
      });
      baseLineNumber++;
    } else if (line.startsWith(' ')) {
      // Context line
      currentLineNumber++;
      baseLineNumber++;
    }
  }

  return { addedLines, removedLines };
}

async function getBlameForFile(
  owner: string,
  repo: string,
  sha: string,
  filename: string,
  lines: PatchLineInfo[],
  token?: string
): Promise<BlameData[]> {
  // For now, use a simplified approach that fetches commits for the file
  // This is less accurate than git blame but works without local git operations
  const authToken = token || process.env.GH_TOKEN;
  const headers: HeadersInit = {
    Accept: 'application/vnd.github.v3+json',
  };

  if (authToken) {
    headers.Authorization = `token ${authToken}`;
  }

  try {
    // Get commits that touched this file
    const commitsResponse = await fetch(
      `https://api.github.com/repos/${owner}/${repo}/commits?sha=${sha}&path=${filename}&per_page=100`,
      { headers }
    );

    if (!commitsResponse.ok) {
      throw new Error(`Failed to fetch commits for file: ${commitsResponse.status}`);
    }

    const commits = await commitsResponse.json();

    // For simplicity, attribute all lines to the most recent commit author
    // In a real implementation, you'd want to use actual git blame
    const mostRecentCommit = commits[0];
    const author = mostRecentCommit?.author?.login || mostRecentCommit?.commit?.author?.name || 'Unknown';

    // Return all lines attributed to the most recent author
    return [
      {
        author,
        lineCount: lines.length,
      },
    ];
  } catch (error) {
    console.warn(`Failed to get blame for ${filename}:`, error);
    // Fallback: attribute all lines to 'Unknown'
    return [
      {
        author: 'Unknown',
        lineCount: lines.length,
      },
    ];
  }
}
