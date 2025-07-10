import yargs from 'yargs';
import { hideBin } from 'yargs/helpers';
import {
  analyzePullRequest,
  analyzePullRequestsByDateRange,
  formatAnalysisResult,
  formatDateRangeAnalysisResult,
} from './analyzer.js';

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
        description: 'Pull request number (required if start-date and end-date are not provided)',
      })
      .option('start-date', {
        alias: 's',
        type: 'string',
        description: 'Start date for PR search (ISO format: YYYY-MM-DD)',
      })
      .option('end-date', {
        alias: 'e',
        type: 'string',
        description: 'End date for PR search (ISO format: YYYY-MM-DD)',
      })
      .option('exclude-files', {
        type: 'array',
        description: 'Glob patterns for files to exclude (e.g., "*.md" "test/**")',
      })
      .option('exclude-users', {
        type: 'array',
        description: 'Usernames to exclude from contribution analysis',
      })
      .option('exclude-emails', {
        type: 'array',
        description: 'Email addresses to exclude from contribution analysis',
      })
      .option('exclude-commit-messages', {
        type: 'array',
        description: 'Text patterns to exclude commits containing these strings',
      })
      .option('ai-emails', {
        type: 'array',
        description: 'Email addresses to identify as AI contributors for human vs AI breakdown',
      })
      .check((argv) => {
        const hasPrNumber = argv['pr-number'] !== undefined;
        const hasDateRange = argv['start-date'] !== undefined && argv['end-date'] !== undefined;

        if (!hasPrNumber && !hasDateRange) {
          throw new Error('Either --pr-number or both --start-date and --end-date must be provided');
        }

        if (hasPrNumber && hasDateRange) {
          throw new Error('Cannot specify both --pr-number and date range options');
        }

        if ((argv['start-date'] !== undefined) !== (argv['end-date'] !== undefined)) {
          throw new Error('Both --start-date and --end-date must be provided together');
        }

        // Validate date format
        if (argv['start-date'] && argv['end-date']) {
          const startDate = new Date(argv['start-date']);
          const endDate = new Date(argv['end-date']);

          if (Number.isNaN(startDate.getTime())) {
            throw new Error('Invalid start-date format. Use YYYY-MM-DD');
          }

          if (Number.isNaN(endDate.getTime())) {
            throw new Error('Invalid end-date format. Use YYYY-MM-DD');
          }

          if (startDate > endDate) {
            throw new Error('start-date must be before or equal to end-date');
          }
        }

        return true;
      })
      .help()
      .alias('help', 'h')
      .example('$0 --owner WillBooster --repo gen-pr --pr-number 65', 'Analyze PR #65 from WillBooster/gen-pr')
      .example('$0 -o WillBooster -r gen-pr -p 65', 'Same as above using short options')
      .example(
        '$0 --owner WillBooster --repo gen-pr --start-date 2024-01-01 --end-date 2024-01-31',
        'Analyze all PRs in January 2024'
      )
      .example('$0 -o WillBooster -r gen-pr -s 2024-01-01 -e 2024-01-31', 'Same as above using short options')
      .example(
        '$0 -o WillBooster -r gen-pr -p 65 --exclude-files "*.md" "test/**" --exclude-users "bot"',
        'Analyze PR #65 excluding markdown files, test directory, and bot user'
      )
      .example(
        '$0 -o WillBooster -r gen-pr -p 65 --exclude-emails "bot@example.com" --exclude-commit-messages "auto-generated"',
        'Analyze PR #65 excluding specific email and commits with "auto-generated" text'
      )
      .example(
        '$0 -o WillBooster -r gen-pr -p 65 --ai-emails "bot@willbooster.com" "ai@example.com"',
        'Analyze PR #65 with human vs AI breakdown, identifying specified emails as AI'
      )
      .parse();

    const {
      owner,
      repo,
      prNumber,
      startDate,
      endDate,
      excludeFiles,
      excludeUsers,
      excludeEmails,
      excludeCommitMessages,
      aiEmails,
    } = argv;

    // Build exclusion options
    const exclusionOptions = {
      excludeFiles: excludeFiles as string[] | undefined,
      excludeUsers: excludeUsers as string[] | undefined,
      excludeEmails: excludeEmails as string[] | undefined,
      excludeCommitMessages: excludeCommitMessages as string[] | undefined,
      aiEmails: aiEmails as string[] | undefined,
    };

    // Log exclusion options if any are provided
    const hasExclusions =
      exclusionOptions.excludeFiles?.length ||
      exclusionOptions.excludeUsers?.length ||
      exclusionOptions.excludeEmails?.length ||
      exclusionOptions.excludeCommitMessages?.length ||
      exclusionOptions.aiEmails?.length;

    if (hasExclusions) {
      console.log('\nOptions:');
      if (exclusionOptions.excludeFiles?.length) {
        console.log(`  Exclude files: ${exclusionOptions.excludeFiles.join(', ')}`);
      }
      if (exclusionOptions.excludeUsers?.length) {
        console.log(`  Exclude users: ${exclusionOptions.excludeUsers.join(', ')}`);
      }
      if (exclusionOptions.excludeEmails?.length) {
        console.log(`  Exclude emails: ${exclusionOptions.excludeEmails.join(', ')}`);
      }
      if (exclusionOptions.excludeCommitMessages?.length) {
        console.log(`  Exclude commit messages containing: ${exclusionOptions.excludeCommitMessages.join(', ')}`);
      }
      if (exclusionOptions.aiEmails?.length) {
        console.log(`  AI emails: ${exclusionOptions.aiEmails.join(', ')}`);
      }
      console.log('');
    }

    if (prNumber) {
      console.log(`Analyzing PR #${prNumber} from ${owner}/${repo} using diff-based analysis...`);
      console.log('This method uses git blame to accurately attribute each line to its actual author.');
      console.log('Note: Set GH_TOKEN environment variable for higher rate limits.');

      const result = await analyzePullRequest(owner, repo, prNumber, exclusionOptions);
      console.log(`\n${formatAnalysisResult(result, exclusionOptions)}`);
    } else if (startDate && endDate) {
      console.log(`Analyzing PRs from ${owner}/${repo} between ${startDate} and ${endDate}...`);
      console.log('This method uses git blame to accurately attribute each line to its actual author.');
      console.log('Note: Set GH_TOKEN environment variable for higher rate limits.');

      const result = await analyzePullRequestsByDateRange(owner, repo, startDate, endDate, exclusionOptions);
      console.log(`\n${formatDateRangeAnalysisResult(result, exclusionOptions)}`);
    }
  } catch (error) {
    console.error('Error analyzing PR:', error);
  }
}

await main();
