import { analyzePullRequestByDiff, formatAnalysisResult } from './github-pr-analyzer.js';

async function main() {
  try {
    const owner = 'WillBooster';
    const repo = 'gen-pr';
    const prNumber = 65;

    console.log(`Analyzing PR #${prNumber} from ${owner}/${repo} using diff-based analysis...`);
    console.log('This method uses git blame to accurately attribute each line to its actual author.');
    console.log('Note: Set GH_TOKEN environment variable for higher rate limits.');

    // Token is automatically read from process.env.GH_TOKEN if not provided
    const result = await analyzePullRequestByDiff(owner, repo, prNumber);

    console.log(`\n${formatAnalysisResult(result)}`);
  } catch (error) {
    console.error('Error analyzing PR:', error);
  }
}

if (import.meta.main) {
  main();
}
