import yargs from 'yargs';
import { hideBin } from 'yargs/helpers';
import { analyzePullRequestsByDateRangeMultiRepo, formatDateRangeAnalysisResult } from './analyzer.js';

async function main() {
  try {
    const argv = await yargs(hideBin(process.argv))
      .option('repo', {
        alias: 'r',
        type: 'array',
        description: 'GitHub repository in format "owner/repo". Multiple repositories can be specified.',
        demandOption: true,
      })
      .option('start-date', {
        alias: 's',
        type: 'string',
        description: 'Start date for PR search (ISO format: YYYY-MM-DD)',
        demandOption: true,
      })
      .option('end-date', {
        alias: 'e',
        type: 'string',
        description: 'End date for PR search (ISO format: YYYY-MM-DD)',
        demandOption: true,
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
      .option('verbose', {
        alias: 'v',
        type: 'boolean',
        description: 'Enable verbose logging (shows detailed progress information)',
        default: false,
      })
      .check((argv) => {
        // Validate repository format
        const repos = argv.repo as string[];
        for (const repo of repos) {
          if (!repo.includes('/') || repo.split('/').length !== 2) {
            throw new Error(`Invalid repository format: "${repo}". Expected format: "owner/repo"`);
          }
        }

        // Validate date format
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

        return true;
      })
      .help()
      .alias('help', 'h')
      .example(
        '$0 --repo WillBooster/gen-pr --start-date 2024-01-01 --end-date 2024-01-31',
        'Analyze all PRs from single repository in January 2024'
      )
      .example('$0 -r WillBooster/gen-pr -s 2024-01-01 -e 2024-01-31', 'Same as above using short options')
      .example(
        '$0 -r WillBooster/gen-pr WillBooster/calc-ai-contrib -s 2024-01-01 -e 2024-01-31',
        'Analyze PRs from multiple repositories in January 2024'
      )
      .example(
        '$0 -r WillBooster/gen-pr -s 2024-01-01 -e 2024-01-31 --exclude-files "*.md" "test/**" --exclude-users "bot"',
        'Analyze PRs excluding markdown files, test directory, and bot user'
      )
      .example(
        '$0 -r WillBooster/gen-pr -s 2024-01-01 -e 2024-01-31 --exclude-emails "bot@example.com" --exclude-commit-messages "auto-generated"',
        'Analyze PRs excluding specific email and commits with "auto-generated" text'
      )
      .example(
        '$0 -r WillBooster/gen-pr -s 2024-01-01 -e 2024-01-31 --ai-emails "bot@willbooster.com" "ai@example.com"',
        'Analyze PRs with human vs AI breakdown, identifying specified emails as AI'
      )
      .parse();

    const {
      repo: repos,
      startDate,
      endDate,
      excludeFiles,
      excludeUsers,
      excludeEmails,
      excludeCommitMessages,
      aiEmails,
      verbose,
    } = argv;

    // Parse repository specifications
    const repositories = (repos as string[]).map((repoSpec) => {
      const [owner, repo] = repoSpec.split('/');
      return { owner, repo };
    });

    // Build exclusion options
    const exclusionOptions = {
      excludeFiles: excludeFiles as string[] | undefined,
      excludeUsers: excludeUsers as string[] | undefined,
      excludeEmails: excludeEmails as string[] | undefined,
      excludeCommitMessages: excludeCommitMessages as string[] | undefined,
      aiEmails: aiEmails as string[] | undefined,
    };

    // Log exclusion options if any are provided and verbose mode is enabled
    const hasExclusions =
      exclusionOptions.excludeFiles?.length ||
      exclusionOptions.excludeUsers?.length ||
      exclusionOptions.excludeEmails?.length ||
      exclusionOptions.excludeCommitMessages?.length ||
      exclusionOptions.aiEmails?.length;

    if (hasExclusions && verbose) {
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

    console.log(`Analyzing PRs from ${repositories.length} repositories between ${startDate} and ${endDate}...`);
    console.log('Note: Set GH_TOKEN environment variable for higher rate limits.');

    const result = await analyzePullRequestsByDateRangeMultiRepo(
      repositories,
      startDate,
      endDate,
      exclusionOptions,
      verbose
    );
    console.log(`\n${formatDateRangeAnalysisResult(result, exclusionOptions)}`);
  } catch (error) {
    console.error('Error analyzing PR:', error);
  }
}

await main();
