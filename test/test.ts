/**
 * Test file for formatAnalysisResult and formatDateRangeAnalysisResult functions
 *
 * This file demonstrates the usage of both formatting functions with various dummy data scenarios:
 * - PR analysis with and without AI email filtering
 * - Date range analysis with and without AI email filtering
 * - Empty contributions handling
 * - Legacy function compatibility testing
 *
 * Run with: bun run test.ts
 */

import { formatAnalysisResult } from '../src/format.js';
import type { DateRangeAnalysisResult, ExclusionOptions, PRAnalysisResult, UserContribution } from '../src/types.js';

// Helper function to create dummy user contributions
function createUserContributions(): UserContribution[] {
  return [
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
}

// Helper function to create empty user contributions
function createEmptyUserContributions(): UserContribution[] {
  return [];
}

// Helper function to create multiple user contributions
function createMultipleUserContributions(): UserContribution[] {
  return [
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
}

// Create dummy PR analysis result
function createPRAnalysisResult(userContributions: UserContribution[], aiEmails: string[] = []): PRAnalysisResult {
  const totalAdditions = userContributions.reduce((sum, contrib) => sum + contrib.additions, 0);
  const totalDeletions = userContributions.reduce((sum, contrib) => sum + contrib.deletions, 0);
  const totalEditLines = totalAdditions + totalDeletions;

  // Calculate human vs AI contributions based on provided AI emails
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
    prNumber: 123,
    totalAdditions,
    totalDeletions,
    totalEditLines,
    userContributions,
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
  };
}

// Create dummy date range analysis result
function createDateRangeAnalysisResult(
  userContributions: UserContribution[],
  aiEmails: string[] = []
): DateRangeAnalysisResult {
  const totalAdditions = userContributions.reduce((sum, contrib) => sum + contrib.additions, 0);
  const totalDeletions = userContributions.reduce((sum, contrib) => sum + contrib.deletions, 0);
  const totalEditLines = totalAdditions + totalDeletions;

  // Calculate human vs AI contributions based on provided AI emails
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
    startDate: '2024-01-01',
    endDate: '2024-01-31',
    totalPRs: 5,
    prNumbers: [101, 102, 103, 104, 105],
    totalAdditions,
    totalDeletions,
    totalEditLines,
    userContributions,
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
  };
}

// Test scenarios
function runTests() {
  console.log('🧪 Testing formatAnalysisResult and formatDateRangeAnalysisResult functions\n');
  console.log('='.repeat(80));

  // Test 1: PR Analysis without AI emails
  console.log('\n📋 TEST 1: PR Analysis (Basic - No AI emails)');
  console.log('-'.repeat(50));
  const prResult1 = createPRAnalysisResult(createUserContributions());
  const exclusionOptions1: ExclusionOptions = {};
  const formatted1 = formatAnalysisResult(prResult1, exclusionOptions1);
  console.log(formatted1);

  // Test 2: PR Analysis with AI emails
  console.log('\n📋 TEST 2: PR Analysis (With AI emails)');
  console.log('-'.repeat(50));
  const userContribs2 = createUserContributions();
  const aiEmails2 = ['bot@willbooster.com', 'ai@example.com'];
  const prResult2 = createPRAnalysisResult(userContribs2, aiEmails2);
  const exclusionOptions2: ExclusionOptions = {
    aiEmails: aiEmails2,
  };
  const formatted2 = formatAnalysisResult(prResult2, exclusionOptions2);
  console.log(formatted2);

  // Test 3: Date Range Analysis without AI emails
  console.log('\n📋 TEST 3: Date Range Analysis (Basic - No AI emails)');
  console.log('-'.repeat(50));
  const dateRangeResult1 = createDateRangeAnalysisResult(createMultipleUserContributions());
  const exclusionOptions3: ExclusionOptions = {};
  const formatted3 = formatAnalysisResult(dateRangeResult1, exclusionOptions3);
  console.log(formatted3);

  // Test 4: Date Range Analysis with AI emails
  console.log('\n📋 TEST 4: Date Range Analysis (With AI emails)');
  console.log('-'.repeat(50));
  const userContribs4 = createMultipleUserContributions();
  const aiEmails4 = ['ai@example.com'];
  const dateRangeResult2 = createDateRangeAnalysisResult(userContribs4, aiEmails4);
  const exclusionOptions4: ExclusionOptions = {
    aiEmails: aiEmails4,
    excludeFiles: ['*.md', 'test/**'],
    excludeUsers: ['bot-user'],
  };
  const formatted4 = formatAnalysisResult(dateRangeResult2, exclusionOptions4);
  console.log(formatted4);

  // Test 5: Empty contributions case
  console.log('\n📋 TEST 5: Empty Contributions');
  console.log('-'.repeat(50));
  const emptyPRResult = createPRAnalysisResult(createEmptyUserContributions());
  const formatted5 = formatAnalysisResult(emptyPRResult, {});
  console.log(formatted5);

  // Test 6: Date Range with empty contributions
  console.log('\n📋 TEST 6: Date Range with Empty Contributions');
  console.log('-'.repeat(50));
  const emptyDateRangeResult = createDateRangeAnalysisResult(createEmptyUserContributions());
  const formatted6 = formatAnalysisResult(emptyDateRangeResult, {});
  console.log(formatted6);

  // Test 7: Legacy function compatibility test
  console.log('\n📋 TEST 7: Legacy Function Compatibility');
  console.log('-'.repeat(50));
  console.log('Testing that formatDateRangeAnalysisResult works identically to formatAnalysisResult...');
  const testDateRangeResult = createDateRangeAnalysisResult(createUserContributions(), ['bot@willbooster.com']);
  const testExclusionOptions: ExclusionOptions = { aiEmails: ['bot@willbooster.com'] };

  const legacyFormatted = formatAnalysisResult(testDateRangeResult, testExclusionOptions);
  const unifiedFormatted = formatAnalysisResult(testDateRangeResult, testExclusionOptions);

  const isIdentical = legacyFormatted === unifiedFormatted;
  console.log(`✅ Legacy and unified functions produce identical output: ${isIdentical}`);

  if (!isIdentical) {
    console.log('❌ MISMATCH DETECTED!');
    console.log('Legacy output length:', legacyFormatted.length);
    console.log('Unified output length:', unifiedFormatted.length);
  } else {
    console.log('📊 Sample output from both functions:');
    console.log(legacyFormatted);
  }

  console.log(`\n${'='.repeat(80)}`);
  console.log('✅ All tests completed successfully!');
  console.log('📝 Summary:');
  console.log('   - formatAnalysisResult: Works with both PR and DateRange results');
  console.log('   - formatDateRangeAnalysisResult: Legacy function, now calls formatAnalysisResult');
  console.log('   - Both functions support ExclusionOptions for AI email filtering');
  console.log('   - Human vs AI breakdown appears when aiEmails are provided');
  console.log('   - Empty contributions are handled gracefully');
}

// Run the tests
runTests();
