import { formatAnalysisResult } from '../src/format.js';
import type {
  DateRangeAnalysisResult,
  ExclusionOptions,
  PRAnalysisResult,
  PRNumbersAnalysisResult,
  UserContribution,
} from '../src/types.js';

const userContributions: UserContribution[] = [
  {
    user: 'alice-dev',
    name: 'Alice Developer',
    email: 'alice@company.com',
    additions: 150,
    deletions: 50,
    pairAdditions: 30,
    pairDeletions: 10,
    totalLines: 240,
    pairLines: 40,
    soloLines: 200,
    percentage: 80,
    pairPercentage: 17,
    soloPercentage: 83,
  },
  {
    user: 'bot-assistant',
    name: 'AI Assistant Bot',
    email: 'bot@willbooster.com',
    additions: 75,
    deletions: 25,
    pairAdditions: 0,
    pairDeletions: 0,
    totalLines: 100,
    pairLines: 0,
    soloLines: 100,
    percentage: 33,
    pairPercentage: 0,
    soloPercentage: 100,
  },
];

const multipleUserContributions: UserContribution[] = [
  {
    user: 'john-doe',
    name: 'John Doe',
    email: 'john@company.com',
    additions: 120,
    deletions: 30,
    pairAdditions: 20,
    pairDeletions: 5,
    totalLines: 175,
    pairLines: 25,
    soloLines: 150,
    percentage: 58,
    pairPercentage: 14,
    soloPercentage: 86,
  },
  {
    user: 'jane-smith',
    name: 'Jane Smith',
    email: 'jane@company.com',
    additions: 80,
    deletions: 20,
    pairAdditions: 15,
    pairDeletions: 5,
    totalLines: 120,
    pairLines: 20,
    soloLines: 100,
    percentage: 40,
    pairPercentage: 17,
    soloPercentage: 83,
  },
  {
    user: 'ai-helper',
    name: 'AI Helper',
    email: 'ai@example.com',
    additions: 40,
    deletions: 10,
    pairAdditions: 0,
    pairDeletions: 0,
    totalLines: 50,
    pairLines: 0,
    soloLines: 50,
    percentage: 17,
    pairPercentage: 0,
    soloPercentage: 100,
  },
];

function calculateContributions(userContributions: UserContribution[], aiEmails: Set<string> = new Set()) {
  const totalAdditions = userContributions.reduce((sum, contrib) => sum + contrib.additions, 0);
  const totalDeletions = userContributions.reduce((sum, contrib) => sum + contrib.deletions, 0);
  const totalEditLines = totalAdditions + totalDeletions;

  const humanContribs = userContributions.filter((contrib) => !aiEmails.has(contrib.email || ''));
  const aiContribs = userContributions.filter((contrib) => aiEmails.has(contrib.email || ''));

  const humanTotalAdditions = humanContribs.reduce((sum, contrib) => sum + contrib.additions, 0);
  const humanTotalDeletions = humanContribs.reduce((sum, contrib) => sum + contrib.deletions, 0);
  const humanTotalEditLines = humanTotalAdditions + humanTotalDeletions;

  const aiTotalAdditions = aiContribs.reduce((sum, contrib) => sum + contrib.additions, 0);
  const aiTotalDeletions = aiContribs.reduce((sum, contrib) => sum + contrib.deletions, 0);
  const aiTotalEditLines = aiTotalAdditions + aiTotalDeletions;

  const humanPercentage = totalEditLines > 0 ? Math.round((humanTotalEditLines / totalEditLines) * 100) : 0;
  const aiPercentage = totalEditLines > 0 ? Math.round((aiTotalEditLines / totalEditLines) * 100) : 0;

  return {
    totalAdditions,
    totalDeletions,
    totalEditLines,
    humanContributions: {
      totalAdditions: humanTotalAdditions,
      totalDeletions: humanTotalDeletions,
      totalEditLines: humanTotalEditLines,
      percentage: humanPercentage,
      peopleCount: humanContribs.length,
    },
    aiContributions: {
      totalAdditions: aiTotalAdditions,
      totalDeletions: aiTotalDeletions,
      totalEditLines: aiTotalEditLines,
      percentage: aiPercentage,
      peopleCount: aiContribs.length,
    },
    pairContributions: {
      totalAdditions: 0,
      totalDeletions: 0,
      totalEditLines: 0,
      percentage: 0,
      peopleCount: 0,
    },
  };
}

function createPRAnalysisResult(
  userContributions: UserContribution[],
  aiEmails: Set<string> = new Set()
): PRAnalysisResult {
  const contributions = calculateContributions(userContributions, aiEmails);
  return {
    prNumber: 123,
    userContributions,
    ...contributions,
  };
}

function createDateRangeAnalysisResult(
  userContributions: UserContribution[],
  aiEmails: Set<string> = new Set()
): DateRangeAnalysisResult {
  const contributions = calculateContributions(userContributions, aiEmails);
  return {
    startDate: '2024-01-01',
    endDate: '2024-01-31',
    totalPRs: 5,
    prNumbers: [101, 102, 103, 104, 105],
    userContributions,
    ...contributions,
  };
}

function createPRNumbersAnalysisResult(
  userContributions: UserContribution[],
  aiEmails: Set<string> = new Set()
): PRNumbersAnalysisResult {
  const contributions = calculateContributions(userContributions, aiEmails);
  return {
    totalPRs: 3,
    prNumbers: [123, 456, 789],
    userContributions,
    ...contributions,
  };
}

function runTests() {
  console.info('🧪 Testing formatAnalysisResult\n');
  console.info('='.repeat(80));

  console.info('\n📋 TEST 1: PR Analysis (Basic)');
  console.info('-'.repeat(50));
  const prResult1 = createPRAnalysisResult(userContributions);
  console.info(formatAnalysisResult(prResult1, {}));

  console.info('\n📋 TEST 2: PR Analysis (With AI emails)');
  console.info('-'.repeat(50));
  const aiEmails = new Set(['bot@willbooster.com', 'ai@example.com']);
  const prResult2 = createPRAnalysisResult(userContributions, aiEmails);
  console.info(formatAnalysisResult(prResult2, { aiEmails }));

  console.info('\n📋 TEST 3: Date Range Analysis (Basic)');
  console.info('-'.repeat(50));
  const dateRangeResult1 = createDateRangeAnalysisResult(multipleUserContributions);
  console.info(formatAnalysisResult(dateRangeResult1, {}));

  console.info('\n📋 TEST 4: Date Range Analysis (With AI emails)');
  console.info('-'.repeat(50));
  const dateRangeResult2 = createDateRangeAnalysisResult(multipleUserContributions, new Set(['ai@example.com']));
  const exclusionOptions: ExclusionOptions = {
    aiEmails: new Set(['ai@example.com']),
    excludeFiles: ['*.md', 'test/**'],
    excludeUsers: ['bot-user'],
  };
  console.info(formatAnalysisResult(dateRangeResult2, exclusionOptions));

  console.info('\n📋 TEST 5: Empty Contributions');
  console.info('-'.repeat(50));
  const emptyPRResult = createPRAnalysisResult([]);
  console.info(formatAnalysisResult(emptyPRResult, {}));

  console.info('\n📋 TEST 6: Date Range with Empty Contributions');
  console.info('-'.repeat(50));
  const emptyDateRangeResult = createDateRangeAnalysisResult([]);
  console.info(formatAnalysisResult(emptyDateRangeResult, {}));

  console.info('\n📋 TEST 7: PR Numbers Analysis (Basic)');
  console.info('-'.repeat(50));
  const prNumbersResult1 = createPRNumbersAnalysisResult(multipleUserContributions);
  console.info(formatAnalysisResult(prNumbersResult1, {}));

  console.info('\n📋 TEST 8: PR Numbers Analysis (With AI emails)');
  console.info('-'.repeat(50));
  const prNumbersResult2 = createPRNumbersAnalysisResult(multipleUserContributions, new Set(['ai@example.com']));
  console.info(formatAnalysisResult(prNumbersResult2, exclusionOptions));

  console.info(`\n${'='.repeat(80)}`);
  console.info('✅ All tests completed successfully!');
}

runTests();
