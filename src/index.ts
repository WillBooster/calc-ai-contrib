import ansis from 'ansis';
import yargs from 'yargs';
import { hideBin } from 'yargs/helpers';
import { analyzePullRequestsByNumbersMultiRepo } from './analyzer.js';
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
        description:
          'Additional email addresses to identify as AI contributors (includes aider@aider.chat and noreply@anthropic.com by default)',
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
        validatePRNumbers(argv['pr-numbers'] as string[]);
        return true;
      })
      .help()
      .alias('help', 'h')
      .example('$0 --repo WillBooster/gen-pr --pr-numbers 123 456 789', 'Analyze specific PRs from single repository')
      .example('$0 -r WillBooster/gen-pr -p 123 456', 'Same as above using short options')
      .example(
        '$0 -r WillBooster/gen-pr WillBooster/calc-ai-contrib -p 123 456',
        'Analyze specific PRs from multiple repositories'
      )
      .example(
        '$0 -r WillBooster/gen-pr -p 123 456 --exclude-files "*.md" "test/**" --exclude-users "bot"',
        'Analyze PRs excluding markdown files, test directory, and bot user'
      )
      .example(
        '$0 -r WillBooster/gen-pr -p 123 456 --exclude-emails "bot@example.com" --exclude-commit-messages "auto-generated"',
        'Analyze PRs excluding specific email and commits with "auto-generated" text'
      )
      .example(
        '$0 -r WillBooster/gen-pr -p 123 456 --ai-emails "bot@willbooster.com" "ai@example.com"',
        'Analyze PRs with human vs AI breakdown (includes default AI emails plus specified ones)'
      )
      .parse();

    const {
      repo: repos,
      prNumbers,
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

    // Convert PR numbers to numbers
    const prNumbersArray = (prNumbers as string[]).map(Number);

    console.log(ansis.blue(`Analyzing PRs ${prNumbersArray.join(', ')} from ${repositories.length} repositories...`));
    console.log(ansis.yellow('Note: Set GH_TOKEN environment variable for higher rate limits.'));

    const result = await analyzePullRequestsByNumbersMultiRepo(repositories, prNumbersArray, exclusionOptions, verbose);
    console.log(`\n${formatAnalysisResult(result, exclusionOptions)}`);
  } catch (error) {
    console.error(ansis.red('Error analyzing PR:'), error);
  }
}

await main();
