import { analyzePullRequestByDiff, analyzePullRequestCommits, formatAnalysisResult } from './github-pr-analyzer.js';

async function main() {
  try {
    const owner = 'WillBooster';
    const repo = 'gen-pr';
    const prNumber = 65;

    console.log(`Comparing analysis methods for PR #${prNumber} from ${owner}/${repo}...`);
    console.log('Note: Set GH_TOKEN environment variable for higher rate limits.');
    console.log('');

    console.log('=== COMMIT-BASED ANALYSIS (Traditional method) ===');
    console.log('This method sums up additions/deletions from each commit.');
    console.log('If user A adds 100 lines and user B modifies 50 of them, both get credit.');
    console.log('');

    // Token is automatically read from process.env.GH_TOKEN if not provided
    const commitResult = await analyzePullRequestCommits(owner, repo, prNumber);
    console.log(formatAnalysisResult(commitResult));

    console.log('');
    console.log('=== DIFF-BASED ANALYSIS (Per-line attribution) ===');
    console.log('This method analyzes who actually authored each line in the final PR diff.');
    console.log("If user B completely rewrites user A's code, user B gets 100% attribution.");
    console.log('');

    // Token is automatically read from process.env.GH_TOKEN if not provided
    const diffResult = await analyzePullRequestByDiff(owner, repo, prNumber);
    console.log(formatAnalysisResult(diffResult));

    console.log('');
    console.log('=== COMPARISON SUMMARY ===');
    console.log(`Commit-based total: ${commitResult.totalEditLines} lines`);
    console.log(`Diff-based total: ${diffResult.totalEditLines} lines`);
    console.log('');
    console.log('Key differences:');
    console.log('• Commit-based: Attributes lines based on commit statistics');
    console.log('• Diff-based: Attributes lines to who actually wrote them in the final state');
    console.log('• Diff-based is more accurate for measuring actual code contribution');
    console.log("• If someone rewrites another person's code, diff-based gives credit to the rewriter");
  } catch (error) {
    console.error('Error analyzing PR:', error);
  }
}

if (import.meta.main) {
  main();
}
