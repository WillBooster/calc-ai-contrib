import ansis from 'ansis';
import yargs from 'yargs';
import { hideBin } from 'yargs/helpers';
import { analyzePullRequestsByDateRangeMultiRepo } from './analyzer.js';
import { hasExclusionOptions } from './exclusions.js';
import { formatAnalysisResult, logExclusionOptions } from './format.js';
import { parseRepositories, validateDateRange, validateRepositoryFormat } from './utils.js';

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
        description: 'Glob patterns for files to exclude (default: "**/dist/**")',
        default: ['**/dist/**'],
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
        const repos = argv.repo as string[];
        validateRepositoryFormat(repos);
        validateDateRange(argv['start-date'], argv['end-date']);
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
    const repositories = parseRepositories(repos as string[]);

    // Build exclusion options
    const exclusionOptions = {
      excludeFiles: excludeFiles as string[] | undefined,
      excludeUsers: excludeUsers as string[] | undefined,
      excludeEmails: excludeEmails as string[] | undefined,
      excludeCommitMessages: excludeCommitMessages as string[] | undefined,
      aiEmails: aiEmails as string[] | undefined,
    };

    // Log exclusion options if any are provided and verbose mode is enabled
    if (hasExclusionOptions(exclusionOptions) && verbose) {
      logExclusionOptions(exclusionOptions, ansis);
    }

    console.log(
      ansis.blue(`Analyzing PRs from ${repositories.length} repositories between ${startDate} and ${endDate}...`)
    );
    console.log(ansis.yellow('Note: Set GH_TOKEN environment variable for higher rate limits.'));

    const result = await analyzePullRequestsByDateRangeMultiRepo(
      repositories,
      startDate,
      endDate,
      exclusionOptions,
      verbose
    );
    console.log(`\n${formatAnalysisResult(result, exclusionOptions)}`);
  } catch (error) {
    console.error(ansis.red('Error analyzing PR:'), error);
  }
}

await main();
