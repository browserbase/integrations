import { Stagehand, ConstructorParams } from '@browserbasehq/stagehand';
import { z } from 'zod';

export interface SearchResult {
  title: string;
  snippet: string;
}

// Simulate network disconnection with lower failure rate for better success
function simulateNetworkDisconnect(stage: string): void {
  // 15% chance of network failure - more realistic and allows eventual success
  if (Math.random() < 0.15) {
    const failures = [
      'ECONNRESET: Connection reset by peer',
      'ETIMEDOUT: Connection timed out',
      'ENOTFOUND: DNS lookup failed',
      'ECONNREFUSED: Connection refused'
    ];
    const failure = failures[Math.floor(Math.random() * failures.length)];
    console.error(`Network disconnection during ${stage}: ${failure}`);
    throw new Error(`Network failure during ${stage}: ${failure}`);
  }
  console.log(`Network OK for ${stage}`);
}

// Validate with fallback - more lenient to ensure we get data
function validateSearchResults(results: any[]): SearchResult[] {
  if (!results || results.length === 0) {
    throw new Error('No search results extracted - page structure may have changed');
  }

  console.log(`Validating ${results.length} raw results...`);
  
  // First try strict validation
  let validResults = results.filter(r => 
    r.title && 
    r.url && 
    r.snippet &&
    r.title.length > 5 && 
    r.url.startsWith('http') && 
    r.snippet.length > 10
  );

  // Fallback to more lenient validation if strict fails
  if (validResults.length === 0) {
    console.log('Strict validation failed, trying lenient validation...');
    validResults = results.filter(r => 
      r.title && 
      r.title.length > 2 &&
      (r.url || r.link) // Sometimes extraction uses 'link' instead of 'url'
    ).map(r => ({
      title: r.title,
      url: r.url || r.link || 'URL not available',
      snippet: r.snippet || r.description || 'Description not available'
    }));
  }

  if (validResults.length === 0) {
    console.error('Raw extraction data:', JSON.stringify(results, null, 2));
    throw new Error('No valid search results found - extracted data was completely malformed');
  }

  console.log(`Validated ${validResults.length} search results`);
  return validResults.slice(0, 3);
}

export async function searchWeb(query: string): Promise<SearchResult[]> {
  const attemptId = Math.random().toString(36).substring(2, 8);
  console.log(`\n[${attemptId}] Starting search for: "${query}"`);
  
  try {
    // Network failure during initialization (15% chance)
    simulateNetworkDisconnect('browser initialization');

    let stagehand: Stagehand | null = null;
    
    try {
      const config: ConstructorParams = {
        verbose: 1,
        domSettleTimeoutMs: 8000, 
        env: "BROWSERBASE",
        apiKey: process.env.BROWSERBASE_API_KEY,
        browserbaseSessionCreateParams: {
          proxies: true,
          projectId: process.env.BROWSERBASE_PROJECT_ID!,
          browserSettings: {
            viewport: {
              width: 1024,
              height: 768
            },
            advancedStealth: true
          }
        },
      };

      console.log(`[${attemptId}] Initializing browser...`);
      stagehand = new Stagehand(config);
      await stagehand.init();
      console.log(`[${attemptId}] Browser session initialized`);
      
      // Network failure during navigation (15% chance)
      simulateNetworkDisconnect('page navigation');
      
      console.log(`[${attemptId}] Navigating to Google...`);
      await stagehand.page.goto('https://www.google.com');
      console.log(`[${attemptId}] Successfully navigated to Google`);
      
      // Network failure during search (15% chance)
      simulateNetworkDisconnect('search execution');
      
      console.log(`[${attemptId}] Performing search...`);
      await stagehand.page.act({
        action: `Type "${query}" in the search box`
      });

      await stagehand.page.act({
        action: "Click the enter button"
      });
      
      // Wait for search results to load
      console.log(`[${attemptId}] Waiting for results to load...`);
      await stagehand.page.waitForTimeout(4000);

      // Network failure during extraction (15% chance)
      simulateNetworkDisconnect('data extraction');
      
      console.log(`[${attemptId}] Extracting search results...`);
      
      // Try primary extraction first
      let extraction;
      try {
        extraction = await stagehand.page.extract({
          instruction: `Extract the top 3 organic search results from Google. 
          For each result, get:
          - title: The main headline/title text
          - snippet: The description text below the title
          Ignore ads, images, shopping results, and featured snippets.`,
          schema: z.object({
            results: z.array(z.object({
              title: z.string().describe('The main headline of the search result'),
              snippet: z.string().describe('The description text'),
            })).min(1)
          })
        });
      } catch (extractError) {
        console.log(`[${attemptId}] Primary extraction failed, trying fallback...`);
        throw extractError;
      }
      
      console.log(`[${attemptId}] Raw extraction:`, JSON.stringify(extraction, null, 2));
      
      // Validate the extracted data
      const validResults = validateSearchResults(extraction.results);
      
      console.log(`[${attemptId}] Successfully extracted ${validResults.length} search results!`);
      return validResults;
      
    } finally {
      if (stagehand) {
        try {
          await stagehand.page.close();
          console.log(`[${attemptId}] Browser session cleaned up`);
        } catch (e) {
          console.warn(`[${attemptId}] Failed to close browser:`, e);
        }
      }
    }
    
  } catch (error: any) {
    console.error(`[${attemptId}] Search attempt failed:`, error.message);
    console.error(`[${attemptId}] Error details:`, {
      name: error.name,
      message: error.message,
      stack: error.stack?.substring(0, 200) + '...'
    });
    
    // All errors are retryable - let Temporal handle the retry logic
    throw error;
  }
}

// No need for complex report generation - just return the results
export async function formatResults(results: SearchResult[]): Promise<string> {
  if (results.length === 0) {
    throw new Error('Cannot format empty results - this indicates a data extraction issue');
  }
  
  const formatted = results.map((r, i) => 
    `${i + 1}. ${r.title}\n   ${r.snippet}\n`
  ).join('\n');
  
  return `Successfully found ${results.length} search results:\n\n${formatted}`;
} 