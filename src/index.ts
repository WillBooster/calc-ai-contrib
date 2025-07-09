import yargs from 'yargs';
import { hideBin } from 'yargs/helpers';
import { analyzePullRequest, formatAnalysisResult } from './analyzer.js';

async function main() {
  try {
    const argv = await yargs(hideBin(process.argv))
      .option('owner', {
        alias: 'o',
        type: 'string',
        description: 'GitHub repository owner',
        demandOption: true,
      })
      .option('repo', {
        alias: 'r',
        type: 'string',
        description: 'GitHub repository name',
        demandOption: true,
      })
      .option('pr-number', {
        alias: 'p',
        type: 'number',
        description: 'Pull request number',
        demandOption: true,
      })
      .help()
      .alias('help', 'h')
      .example('$0 --owner WillBooster --repo gen-pr --pr-number 65', 'Analyze PR #65 from WillBooster/gen-pr')
      .example('$0 -o WillBooster -r gen-pr -p 65', 'Same as above using short options')
      .parse();

    const { owner, repo, prNumber } = argv;

    console.log(`Analyzing PR #${prNumber} from ${owner}/${repo} using diff-based analysis...`);
    console.log('This method uses git blame to accurately attribute each line to its actual author.');
    console.log('Note: Set GH_TOKEN environment variable for higher rate limits.');

    const result = await analyzePullRequest(owner, repo, prNumber);
    console.log(`\n${formatAnalysisResult(result)}`);
  } catch (error) {
    console.error('Error analyzing PR:', error);
  }
}

await main();
