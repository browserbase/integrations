import { proxyActivities } from '@temporalio/workflow';
import type * as activities from './research-activities';

export async function searchWithRetry(query: string): Promise<string> {
  const { searchWeb, formatResults } = proxyActivities<typeof activities>({
    retry: {
      initialInterval: '2 seconds',      // Start retrying quickly
      maximumInterval: '20 seconds',     // Cap at 20 seconds
      backoffCoefficient: 1.8,           // More gradual backoff
      maximumAttempts: 10,               // More attempts to handle 15% failure rate at 4 stages
      nonRetryableErrorTypes: [],        // Retry ALL errors
    },
    startToCloseTimeout: '2 minutes',     // Give each attempt 2 minutes
    scheduleToCloseTimeout: '20 minutes', // Overall timeout for all retries
  });

  console.log(`Starting resilient search workflow for: "${query}"`);
  console.log(`Retry policy: up to 10 attempts with exponential backoff (2s → 20s)`);
  console.log(`15% network failure rate at each stage - testing Temporal's durability`);
  console.log(`Expected success rate per attempt: ~52% (should succeed within 2-3 attempts)\n`);

  try {
    console.log('Attempting search (may experience network issues)...');
    const results = await searchWeb(query);
    
    console.log('Formatting validated results...');
    const formatted = await formatResults(results);
    
    console.log('Workflow completed successfully despite potential network failures!');
    return formatted;
    
  } catch (error: any) {
    console.error('Search failed permanently after all retries:', error.message);
    throw error;
  }
} 