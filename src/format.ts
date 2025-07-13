import type ansis from 'ansis';
import type {
  BaseAnalysisResult,
  DateRangeAnalysisResult,
  ExclusionOptions,
  PRAnalysisResult,
  PRNumbersAnalysisResult,
} from './types.js';

/**
 * Format user information string
 */
export function formatUserInfo(user: string, name?: string, email?: string): string {
  const nameInfo = name ? ` (${name})` : '';
  const emailInfo = email ? ` <${email}>` : '';
  return `${user}${nameInfo}${emailInfo}`;
}

/**
 * Create a progress bar string
 */
export function createProgressBar(percentage: number, length: number = 16): string {
  const bars = Math.round((percentage / 100) * length);
  return '█'.repeat(bars) + '░'.repeat(length - bars);
}

/**
 * Log exclusion options if any are provided
 */
export function logExclusionOptions(options: ExclusionOptions, ansiColors: typeof ansis): void {
  console.info(ansiColors.dim('\nOptions:'));
  if (options.excludeFiles?.length) {
    console.info(ansiColors.dim(`  Exclude files: ${options.excludeFiles.join(', ')}`));
  }
  if (options.excludeUsers?.length) {
    console.info(ansiColors.dim(`  Exclude users: ${options.excludeUsers.join(', ')}`));
  }
  if (options.excludeEmails?.length) {
    console.info(ansiColors.dim(`  Exclude emails: ${options.excludeEmails.join(', ')}`));
  }
  if (options.excludeCommitMessages?.length) {
    console.info(ansiColors.dim(`  Exclude commit messages containing: ${options.excludeCommitMessages.join(', ')}`));
  }
  if (options.aiEmails?.size) {
    console.info(ansiColors.dim(`  AI emails: ${Array.from(options.aiEmails).join(', ')}`));
  }
  console.info('');
}

export function formatAnalysisResult(
  result: PRAnalysisResult | DateRangeAnalysisResult | PRNumbersAnalysisResult,
  exclusionOptions: ExclusionOptions = {}
): string {
  const hasAIEmails = Boolean(exclusionOptions.aiEmails && exclusionOptions.aiEmails.size > 0);

  const lines: string[] = [
    ...formatHeader(result, hasAIEmails),
    ...formatDetailedBreakdown(result, hasAIEmails),
    ...formatIndividualContributions(result),
  ];

  return lines.join('\n');
}

function formatHeader(
  result: PRAnalysisResult | DateRangeAnalysisResult | PRNumbersAnalysisResult,
  hasAIEmails: boolean
): string[] {
  const lines: string[] = [];

  lines.push('╔══════════════════════════════════════════════════╗');
  lines.push('║           CONTRIBUTION ANALYSIS REPORT           ║');
  lines.push('╠══════════════════════════════════════════════════╣');

  if ('prNumber' in result) {
    // PR Analysis Result
    lines.push(`║ ${`PR #${result.prNumber.toString()}`.padEnd(48)} ║`);
  } else if ('startDate' in result) {
    // Date Range Analysis Result
    lines.push(
      `║ ${`Date: ${result.startDate} to ${result.endDate} (PRs: ${result.totalPRs.toString()})`.padEnd(48)} ║`
    );
  } else {
    // PR Numbers Analysis Result
    const prNumbersStr = result.prNumbers.join(', ');
    const displayStr = prNumbersStr.length > 40 ? `${prNumbersStr.substring(0, 37)}...` : prNumbersStr;
    lines.push(`║ ${`PRs: ${displayStr} (Total: ${result.totalPRs.toString()})`.padEnd(48)} ║`);
  }
  lines.push(
    `║ ${`Total Edits: ${result.totalEditLines.toLocaleString()} (+${result.totalAdditions.toLocaleString()} / -${result.totalDeletions.toLocaleString()})`.padEnd(48)} ║`
  );

  // Add AI vs Human info to header if available
  if (hasAIEmails) {
    const humanPercentage = result.humanContributions.percentage;
    const aiPercentage = result.aiContributions.percentage;
    const pairPercentage = result.pairContributions.percentage;
    const progressBar = createProgressBar(aiPercentage, 22);

    lines.push('╠══════════════════════════════════════════════════╣');
    if (pairPercentage > 0) {
      lines.push(`║ ${`AI: ${aiPercentage}% | Pair: ${pairPercentage}% | Human: ${humanPercentage}%`.padEnd(48)} ║`);
      lines.push(
        `║ ${`Contributors: ${result.aiContributions.peopleCount} AI, ${result.humanContributions.peopleCount} Human`.padEnd(48)} ║`
      );
    } else {
      lines.push(`║ ${`AI vs Human: [${progressBar}] ${aiPercentage}% / ${humanPercentage}%`.padEnd(48)} ║`);
      lines.push(
        `║ ${`Contributors: ${result.aiContributions.peopleCount} AI, ${result.humanContributions.peopleCount} Human`.padEnd(48)} ║`
      );
    }
  }

  lines.push('╚══════════════════════════════════════════════════╝');
  lines.push('');

  return lines;
}

function formatDetailedBreakdown(result: BaseAnalysisResult, hasAIEmails: boolean): string[] {
  const lines: string[] = [];

  if (hasAIEmails) {
    lines.push('📊 DETAILED BREAKDOWN');
    lines.push('─'.repeat(40));
    lines.push('🤖 AI: Commits authored by AI assistants');
    lines.push('🤝 Pair: Commits with both AI and human co-authors');
    lines.push('👥 Human: Commits authored by humans only');
    lines.push('');

    // Create progress bars for each category
    const aiBar = createProgressBar(result.aiContributions.percentage);
    const pairBar = createProgressBar(result.pairContributions.percentage);
    const humanBar = createProgressBar(result.humanContributions.percentage);

    lines.push(
      `🤖 AI   : [${aiBar}] ${result.aiContributions.percentage.toString().padStart(3)}% | ${result.aiContributions.totalEditLines.toLocaleString().padStart(8)} Edits (+${result.aiContributions.totalAdditions.toLocaleString()} / -${result.aiContributions.totalDeletions.toLocaleString()})`
    );
    if (result.pairContributions.percentage > 0) {
      lines.push(
        `🤝 Pair : [${pairBar}] ${result.pairContributions.percentage.toString().padStart(3)}% | ${result.pairContributions.totalEditLines.toLocaleString().padStart(8)} Edits (+${result.pairContributions.totalAdditions.toLocaleString()} / -${result.pairContributions.totalDeletions.toLocaleString()})`
      );
    }
    lines.push(
      `👥 Human: [${humanBar}] ${result.humanContributions.percentage.toString().padStart(3)}% | ${result.humanContributions.totalEditLines.toLocaleString().padStart(8)} Edits (+${result.humanContributions.totalAdditions.toLocaleString()} / -${result.humanContributions.totalDeletions.toLocaleString()})`
    );

    lines.push('');
  }

  return lines;
}

function formatIndividualContributions(
  result: PRAnalysisResult | DateRangeAnalysisResult | PRNumbersAnalysisResult
): string[] {
  const lines: string[] = [];

  lines.push('👤 INDIVIDUAL CONTRIBUTIONS');
  lines.push('─'.repeat(40));

  if (result.userContributions.length === 0) {
    const message =
      'startDate' in result ? 'No contributions found in the specified date range.' : 'No contributions found.';
    lines.push(message);
  } else {
    for (const contribution of result.userContributions) {
      const userInfo = formatUserInfo(contribution.user, contribution.name, contribution.email);
      const userBar = createProgressBar(contribution.percentage);

      lines.push(`${userInfo}:`);

      // Calculate total additions and deletions (individual + pair)
      const totalAdditions = contribution.additions + contribution.pairAdditions;
      const totalDeletions = contribution.deletions + contribution.pairDeletions;

      lines.push(
        `  [${userBar}] ${contribution.percentage.toLocaleString().padStart(3)}% | ${contribution.totalLines.toLocaleString().padStart(8)} Edits: (+${totalAdditions.toLocaleString()} / -${totalDeletions.toLocaleString()})`
      );

      // Show Pair vs Human ratio if there are both pair and solo contributions
      if (contribution.pairLines > 0 && contribution.soloLines > 0) {
        const pairBar = createProgressBar(contribution.pairPercentage, 12);
        lines.push(
          `    Pair vs Human: [${pairBar}] ${contribution.pairPercentage}% Pair / ${contribution.soloPercentage}% Human`
        );
      } else if (contribution.pairLines > 0) {
        lines.push('    100% Pair Programming');
      } else if (contribution.soloLines > 0) {
        lines.push('    100% Individual Work');
      }

      lines.push('');
    }
  }

  return lines;
}
