import ansis from 'ansis';
import yargs from 'yargs';
import { hideBin } from 'yargs/helpers';
import { analyzePullRequestsByDateRangeMultiRepo, analyzePullRequestsByNumbersMultiRepo } from './analyzer.js';
import { hasExclusionOptions } from './exclusions.js';
import { formatAnalysisResult, logExclusionOptions } from './format.js';
import { parseRepositories, validatePRNumbers, validateRepositoryFormat } from './utils.js';

async function main() {
  try {
    const argv = await yargs(hideBin(process.argv))
      .option('repo', {
        alias: 'r',
        type: 'array',
        description: 'GitHub repository in format "owner/repo". Multiple repositories can be specified.',
        demandOption: true,
      })
      .option('pr-numbers', {
        alias: 'p',
        type: 'array',
        description: 'PR numbers to analyze (e.g., --pr-numbers 123 456 789)',
      })
      .option('start-date', {
        alias: 's',
        type: 'string',
        description: 'Start date for analysis (YYYY-MM-DD format)',
      })
      .option('end-date', {
        alias: 'e',
        type: 'string',
        description: 'End date for analysis (YYYY-MM-DD format)',
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
        description:
          'Additional email addresses to identify as AI contributors (aider@aider.chat and noreply@anthropic.com are always included)',
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

        const hasPrNumbers = argv['pr-numbers'] && (argv['pr-numbers'] as string[]).length > 0;
        const hasDateRange = argv['start-date'] && argv['end-date'];

        if (!hasPrNumbers && !hasDateRange) {
          throw new Error('Either --pr-numbers or both --start-date and --end-date must be provided');
        }

        if (hasPrNumbers && hasDateRange) {
          throw new Error('Cannot use both --pr-numbers and date range options at the same time');
        }

        if (hasPrNumbers) {
          validatePRNumbers(argv['pr-numbers'] as string[]);
        }

        if (hasDateRange) {
          const startDate = argv['start-date'] as string;
          const endDate = argv['end-date'] as string;

          if (!startDate || !endDate) {
            throw new Error('Both --start-date and --end-date are required for date range analysis');
          }

          // Validate date format (YYYY-MM-DD)
          const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
          if (!dateRegex.test(startDate) || !dateRegex.test(endDate)) {
            throw new Error('Dates must be in YYYY-MM-DD format');
          }

          if (new Date(startDate) > new Date(endDate)) {
            throw new Error('Start date must be before or equal to end date');
          }
        }

        return true;
      })
      .help()
      .alias('help', 'h')
      .example('$0 --repo WillBooster/gen-pr --pr-numbers 123 456 789', 'Analyze specific PRs from single repository')
      .example('$0 -r WillBooster/gen-pr -p 123 456', 'Same as above using short options')
      .example('$0 -r WillBooster/gen-pr -s 2024-01-01 -e 2024-01-31', 'Analyze PRs by date range')
      .example(
        '$0 -r WillBooster/gen-pr WillBooster/calc-ai-contrib -s 2024-01-01 -e 2024-01-31',
        'Analyze date range from multiple repositories'
      )
      .example(
        '$0 -r WillBooster/gen-pr -p 123 456 --exclude-files "*.md" "test/**" --exclude-users "bot"',
        'Analyze PRs excluding markdown files, test directory, and bot user'
      )
      .example(
        '$0 -r WillBooster/gen-pr -s 2024-01-01 -e 2024-01-31 --ai-emails "bot@willbooster.com"',
        'Analyze date range with human vs AI breakdown (includes default AI emails plus specified ones)'
      )
      .parse();

    const {
      repo: repos,
      prNumbers,
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
    const aiEmailsSet = new Set<string>([
      ...(aiEmails?.map((e) => String(e)) ?? []),
      'aider@aider.chat',
      'noreply@anthropic.com',
    ]);

    const exclusionOptions = {
      excludeFiles: excludeFiles as string[] | undefined,
      excludeUsers: excludeUsers as string[] | undefined,
      excludeEmails: excludeEmails as string[] | undefined,
      excludeCommitMessages: excludeCommitMessages as string[] | undefined,
      aiEmails: aiEmailsSet,
    };

    // Log exclusion options if any are provided and verbose mode is enabled
    if (hasExclusionOptions(exclusionOptions) && verbose) {
      logExclusionOptions(exclusionOptions, ansis);
    }

    console.log(ansis.yellow('Note: Set GH_TOKEN environment variable for higher rate limits.'));

    if (prNumbers && (prNumbers as string[]).length > 0) {
      // PR numbers mode
      const prNumbersArray = (prNumbers as string[]).map(Number);
      console.log(ansis.blue(`Analyzing PRs ${prNumbersArray.join(', ')} from ${repositories.length} repositories...`));
      const result = await analyzePullRequestsByNumbersMultiRepo(
        repositories,
        prNumbersArray,
        exclusionOptions,
        verbose
      );
      console.log(`\n${formatAnalysisResult(result, exclusionOptions)}`);
    } else {
      // Date range mode
      const start = startDate as string;
      const end = endDate as string;
      console.log(ansis.blue(`Analyzing PRs from ${start} to ${end} across ${repositories.length} repositories...`));
      const result = await analyzePullRequestsByDateRangeMultiRepo(repositories, start, end, exclusionOptions, verbose);
      console.log(`\n${formatAnalysisResult(result, exclusionOptions)}`);
    }
  } catch (error) {
    console.error(ansis.red('Error analyzing PR:'), error);
  }
}

await main();
