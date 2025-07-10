import type { BaseAnalysisResult, DateRangeAnalysisResult, ExclusionOptions, PRAnalysisResult } from './types.js';

export function formatAnalysisResult(
  result: PRAnalysisResult | DateRangeAnalysisResult,
  exclusionOptions: ExclusionOptions = {}
): string {
  const hasAIEmails = Boolean(exclusionOptions.aiEmails && exclusionOptions.aiEmails.length > 0);

  const lines: string[] = [
    ...formatHeader(result, hasAIEmails),
    ...formatDetailedBreakdown(result, hasAIEmails),
    ...formatIndividualContributions(result),
  ];

  return lines.join('\n');
}

function formatHeader(result: PRAnalysisResult | DateRangeAnalysisResult, hasAIEmails: boolean): string[] {
  const lines: string[] = [];

  lines.push('╔══════════════════════════════════════════════════╗');
  lines.push('║           CONTRIBUTION ANALYSIS REPORT           ║');
  lines.push('╠══════════════════════════════════════════════════╣');

  if ('prNumber' in result) {
    // PR Analysis Result
    lines.push(`║ ${`PR #${result.prNumber.toString()}`.padEnd(48)} ║`);
  } else {
    // Date Range Analysis Result
    lines.push(
      `║ ${`Date: ${result.startDate} to ${result.endDate} (PRs: ${result.totalPRs.toString()})`.padEnd(48)} ║`
    );
  }
  lines.push(
    `║ ${`Total Edits: ${result.totalEditLines.toLocaleString()} (+${result.totalAdditions.toLocaleString()} / -${result.totalDeletions.toLocaleString()})`.padEnd(48)} ║`
  );

  // Add AI vs Human info to header if available
  if (hasAIEmails) {
    const humanPercentage = result.humanContributions.percentage;
    const aiPercentage = result.aiContributions.percentage;
    const barLength = 22;
    const aiBars = Math.round((aiPercentage / 100) * barLength);
    const humanBars = barLength - aiBars;

    lines.push('╠══════════════════════════════════════════════════╣');
    lines.push(
      `║ ${`AI vs Human: [${'█'.repeat(aiBars) + '░'.repeat(humanBars)}] ${aiPercentage}% / ${humanPercentage}%`.padEnd(48)} ║`
    );
    lines.push(
      `║ ${`Contributors: ${result.aiContributions.peopleCount} AI, ${result.humanContributions.peopleCount} Human`.padEnd(48)} ║`
    );
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
    lines.push(
      `🤖 AI   : ${result.aiContributions.totalEditLines.toLocaleString().padStart(6)} Edits (+${result.aiContributions.totalAdditions.toLocaleString()} / -${result.aiContributions.totalDeletions.toLocaleString()})`
    );
    lines.push(
      `👥 Human: ${result.humanContributions.totalEditLines.toLocaleString().padStart(6)} Edits (+${result.humanContributions.totalAdditions.toLocaleString()} / -${result.humanContributions.totalDeletions.toLocaleString()})`
    );
    lines.push('');
  }

  return lines;
}

function formatIndividualContributions(result: PRAnalysisResult | DateRangeAnalysisResult): string[] {
  const lines: string[] = [];

  lines.push('👤 INDIVIDUAL CONTRIBUTIONS');
  lines.push('─'.repeat(40));

  if (result.userContributions.length === 0) {
    const message =
      'startDate' in result ? 'No contributions found in the specified date range.' : 'No contributions found.';
    lines.push(message);
  } else {
    for (const contribution of result.userContributions) {
      const userInfo = contribution.user;
      const nameInfo = contribution.name ? ` (${contribution.name})` : '';
      const emailInfo = contribution.email ? ` <${contribution.email}>` : '';

      const userBarLength = 16;
      const userBars = Math.round((contribution.percentage / 100) * userBarLength);
      const userBar = '█'.repeat(userBars) + '░'.repeat(userBarLength - userBars);

      lines.push(`${userInfo}${nameInfo}${emailInfo}:`);
      lines.push(
        `  [${userBar}] ${contribution.percentage}% | ${contribution.totalLines.toLocaleString().padStart(6)} Edits: (+${contribution.additions.toLocaleString()} / -${contribution.deletions.toLocaleString()})`
      );
      lines.push('');
    }
  }

  return lines;
}
