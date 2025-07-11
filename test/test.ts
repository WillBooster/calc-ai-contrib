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
    totalLines: 200,
    percentage: 67,
  },
  {
    user: 'bot-assistant',
    name: 'AI Assistant Bot',
    email: 'bot@willbooster.com',
    additions: 75,
    deletions: 25,
    totalLines: 100,
    percentage: 33,
  },
];

const multipleUserContributions: UserContribution[] = [
  {
    user: 'john-doe',
    name: 'John Doe',
    email: 'john@company.com',
    additions: 120,
    deletions: 30,
    totalLines: 150,
    percentage: 50,
  },
  {
    user: 'jane-smith',
    name: 'Jane Smith',
    email: 'jane@company.com',
    additions: 80,
    deletions: 20,
    totalLines: 100,
    percentage: 33,
  },
  {
    user: 'ai-helper',
    name: 'AI Helper',
    email: 'ai@example.com',
    additions: 40,
    deletions: 10,
    totalLines: 50,
    percentage: 17,
  },
];

function calculateContributions(userContributions: UserContribution[], aiEmails: string[] = []) {
  const totalAdditions = userContributions.reduce((sum, contrib) => sum + contrib.additions, 0);
  const totalDeletions = userContributions.reduce((sum, contrib) => sum + contrib.deletions, 0);
  const totalEditLines = totalAdditions + totalDeletions;

  const humanContribs = userContributions.filter((contrib) => !aiEmails.includes(contrib.email || ''));
  const aiContribs = userContributions.filter((contrib) => aiEmails.includes(contrib.email || ''));

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

function createPRAnalysisResult(userContributions: UserContribution[], aiEmails: string[] = []): PRAnalysisResult {
  const contributions = calculateContributions(userContributions, aiEmails);
  return {
    prNumber: 123,
    userContributions,
    ...contributions,
  };
}

function createDateRangeAnalysisResult(
  userContributions: UserContribution[],
  aiEmails: string[] = []
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
  aiEmails: string[] = []
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
  console.log('🧪 Testing formatAnalysisResult\n');
  console.log('='.repeat(80));

  console.log('\n📋 TEST 1: PR Analysis (Basic)');
  console.log('-'.repeat(50));
  const prResult1 = createPRAnalysisResult(userContributions);
  console.log(formatAnalysisResult(prResult1, {}));

  console.log('\n📋 TEST 2: PR Analysis (With AI emails)');
  console.log('-'.repeat(50));
  const aiEmails = ['bot@willbooster.com', 'ai@example.com'];
  const prResult2 = createPRAnalysisResult(userContributions, aiEmails);
  console.log(formatAnalysisResult(prResult2, { aiEmails }));

  console.log('\n📋 TEST 3: Date Range Analysis (Basic)');
  console.log('-'.repeat(50));
  const dateRangeResult1 = createDateRangeAnalysisResult(multipleUserContributions);
  console.log(formatAnalysisResult(dateRangeResult1, {}));

  console.log('\n📋 TEST 4: Date Range Analysis (With AI emails)');
  console.log('-'.repeat(50));
  const dateRangeResult2 = createDateRangeAnalysisResult(multipleUserContributions, ['ai@example.com']);
  const exclusionOptions: ExclusionOptions = {
    aiEmails: ['ai@example.com'],
    excludeFiles: ['*.md', 'test/**'],
    excludeUsers: ['bot-user'],
  };
  console.log(formatAnalysisResult(dateRangeResult2, exclusionOptions));

  console.log('\n📋 TEST 5: Empty Contributions');
  console.log('-'.repeat(50));
  const emptyPRResult = createPRAnalysisResult([]);
  console.log(formatAnalysisResult(emptyPRResult, {}));

  console.log('\n📋 TEST 6: Date Range with Empty Contributions');
  console.log('-'.repeat(50));
  const emptyDateRangeResult = createDateRangeAnalysisResult([]);
  console.log(formatAnalysisResult(emptyDateRangeResult, {}));

  console.log('\n📋 TEST 7: PR Numbers Analysis (Basic)');
  console.log('-'.repeat(50));
  const prNumbersResult1 = createPRNumbersAnalysisResult(multipleUserContributions);
  console.log(formatAnalysisResult(prNumbersResult1, {}));

  console.log('\n📋 TEST 8: PR Numbers Analysis (With AI emails)');
  console.log('-'.repeat(50));
  const prNumbersResult2 = createPRNumbersAnalysisResult(multipleUserContributions, ['ai@example.com']);
  console.log(formatAnalysisResult(prNumbersResult2, exclusionOptions));

  console.log(`\n${'='.repeat(80)}`);
  console.log('✅ All tests completed successfully!');
}

runTests();
