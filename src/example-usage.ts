import { analyzePullRequestCommits, formatAnalysisResult } from './github-pr-analyzer.js';

async function main() {
  try {
    const owner = 'WillBooster';
    const repo = 'gen-pr';
    const prNumber = 65;

    console.log(`Analyzing PR #${prNumber} from ${owner}/${repo}...`);

    const result = await analyzePullRequestCommits(owner, repo, prNumber);

    console.log(`\n${formatAnalysisResult(result)}`);
  } catch (error) {
    console.error('Error analyzing PR:', error);
  }
}

if (import.meta.main) {
  main();
}
