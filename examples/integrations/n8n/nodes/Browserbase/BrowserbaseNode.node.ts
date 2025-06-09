import type {
	IExecuteFunctions,
	INodeExecutionData,
	INodeType,
	INodeTypeDescription,
} from 'n8n-workflow';
import { NodeConnectionType, NodeOperationError } from 'n8n-workflow';
import { chromium } from 'playwright-core';
import { browserOperations, browserFields, browserActionOperations } from './BrowserDescription';

/**
 * Helper function to get session details including connectUrl
 */
async function getSessionDetails(sessionId: string, apiKey: string): Promise<any> {
	const response = await fetch(`https://api.browserbase.com/v1/sessions/${sessionId}`, {
		method: 'GET',
		headers: {
			'Content-Type': 'application/json',
			'X-BB-API-Key': apiKey,
		},
	});
	
	if (!response.ok) {
		throw new Error(`Failed to get session details: ${response.statusText}`);
	}
	
	return response.json();
}

/**
 * Helper function to connect to Browserbase session with Playwright
 */
async function connectToBrowserbaseSession(connectUrl: string) {
	const browser = await chromium.connectOverCDP(connectUrl);
	const defaultContext = browser.contexts()[0];
	const page = defaultContext?.pages()?.[0] || await defaultContext.newPage();
	return { browser, page };
}

export class BrowserbaseNode implements INodeType {

	description: INodeTypeDescription = {
		displayName: 'Browserbase',
		name: 'browserbase',
		icon: { light: 'file:browserbase.svg', dark: 'file:browserbase.svg' },
		group: ['transform'],
		version: 1,
		subtitle: '={{$parameter["operation"] + ": " + $parameter["resource"]}}',
		description: 'Interact with websites using Browserbase cloud browsers',
		defaults: {
			name: 'Browserbase',
		},
		inputs: [NodeConnectionType.Main],
		outputs: [NodeConnectionType.Main],
		usableAsTool: true,
		credentials: [
			{
				name: 'Browserbase',
				required: true,
			},
		],
		properties: [
			{
				displayName: 'Resource',
				name: 'resource',
				type: 'options',
				noDataExpression: true,
				options: [
					{
						name: 'Browser Session',
						value: 'browserSession',
						description: 'Manage browser sessions',
					},
					{
						name: 'Browser Action',
						value: 'browserAction',
						description: 'Perform browser automation actions',
					},
				],
				default: 'browserSession',
			},
			...browserOperations,
			...browserActionOperations,
			...browserFields,
		],
	};

	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		const items = this.getInputData();
		const returnData: INodeExecutionData[] = [];

		for (let i = 0; i < items.length; i++) {
			try {
				const resource = this.getNodeParameter('resource', i) as string;
				const operation = this.getNodeParameter('operation', i) as string;

				let result: any = {};

				if (resource === 'browserSession') {
					// These operations use the declarative routing from the description
					// The HTTP requests are handled automatically by n8n
					if (operation === 'createSession') {
						// Get credentials and session config
						const credentials = await this.getCredentials('Browserbase');
						const apiKey = credentials.apiKey as string;
						const projectId = credentials.projectId as string;
						
						const sessionConfig = this.getNodeParameter('sessionConfig.config', i, {}) as Record<string, any>;
						
						// Build the request body according to Browserbase API
						const requestBody: any = {
							projectId,
						};

						// Add optional fields only if they exist
						if (sessionConfig.keepAlive !== undefined) {
							requestBody.keepAlive = sessionConfig.keepAlive;
						}
						if (sessionConfig.proxies !== undefined) {
							requestBody.proxies = sessionConfig.proxies;
						}
						if (sessionConfig.browserSettings && Object.keys(sessionConfig.browserSettings).length > 0) {
							requestBody.browserSettings = sessionConfig.browserSettings;
						}

						const requestOptions = {
							method: 'POST' as const,
							url: 'https://api.browserbase.com/v1/sessions',
							body: requestBody,
							headers: {
								'Content-Type': 'application/json',
								'X-BB-API-Key': apiKey,
							},
						};

						console.log('🐛 DEBUG - Create Session Request:', {
							url: requestOptions.url,
							method: requestOptions.method,
							headers: { 'X-BB-API-Key': '***' }, // Hide API key in logs
							body: requestOptions.body
						});
						
						const sessionResponse = await this.helpers.httpRequest(requestOptions);

						console.log('🐛 DEBUG - Create Session Response:', sessionResponse);

						// Ensure the response includes sessionId for easy chaining
						result = {
							...sessionResponse,
							sessionId: sessionResponse.id, // Add sessionId alias for easier access
						};

					} else if (['getSessions', 'getSession', 'deleteSession'].includes(operation)) {
						// Get credentials for API authentication
						const credentials = await this.getCredentials('Browserbase');
						const apiKey = credentials.apiKey as string;
						
						const sessionId = operation !== 'getSessions' ? this.getNodeParameter('sessionId', i) as string : '';
						
						let url = 'https://api.browserbase.com/v1/sessions';
						if (sessionId) {
							url += `/${sessionId}`;
						}

						const method = operation === 'deleteSession' ? 'DELETE' : 'GET';

						console.log('🐛 DEBUG - Session Operation Request:', {
							operation,
							url,
							method,
							sessionId
						});
						
						result = await this.helpers.httpRequest({
							method: method as any,
							url,
							headers: {
								'Content-Type': 'application/json',
								'X-BB-API-Key': apiKey,
							},
						});

						console.log('🐛 DEBUG - Session Operation Response:', result);
					}

				} else if (resource === 'browserAction') {
					// Browser actions with actual Playwright execution
					const credentials = await this.getCredentials('Browserbase');
					const apiKey = credentials.apiKey as string;
					
					const sessionSource = this.getNodeParameter('sessionSource', i) as string;
					let sessionId: string;

					if (sessionSource === 'previous') {
						// Try to get session ID from input data
						const inputData = items[i].json as Record<string, any>;
						sessionId = (inputData.id || inputData.sessionId || '') as string;
						
						if (!sessionId) {
							throw new NodeOperationError(
								this.getNode(),
								'No session ID found in input data. Please ensure a "Create Session" node is connected before this node, or use "Specify Session ID" option.',
								{ itemIndex: i }
							);
						}
					} else {
						sessionId = this.getNodeParameter('sessionId', i) as string;
					}

					// Get session details to retrieve connectUrl
					console.log('🐛 DEBUG - Getting session details for:', sessionId);
					const sessionDetails = await getSessionDetails(sessionId, apiKey);
					const connectUrl = sessionDetails.connectUrl;

					if (!connectUrl) {
						throw new NodeOperationError(
							this.getNode(),
							`Session ${sessionId} does not have a valid connectUrl. The session may be expired or invalid.`,
							{ itemIndex: i }
						);
					}

					console.log('🐛 DEBUG - Connecting to browser session:', connectUrl);
					
					if (operation === 'navigate') {
						const url = this.getNodeParameter('url', i) as string;

						const { browser, page } = await connectToBrowserbaseSession(connectUrl);
						console.log(browser)

						try {
							console.log('🐛 DEBUG - Navigating to:', url);
							await page.goto(url, { waitUntil: 'networkidle' });

							const currentUrl = page.url();
							const title = await page.title();

							result = {
								operation: 'navigate',
								sessionId,
								url: currentUrl,
								title,
								status: 'completed',
								message: `Successfully navigated to ${currentUrl}`,
							};
						} finally {
							// Don't close the browser as other nodes might use the same session
							// await browser.close();
						}

					} else if (operation === 'screenshot') {
						const screenshotOptions = this.getNodeParameter('screenshotOptions', i, {}) as any;
						
						const { browser, page } = await connectToBrowserbaseSession(connectUrl);
						console.log(browser)
						
						try {
							console.log('🐛 DEBUG - Taking screenshot with options:', screenshotOptions);
							
							const screenshotBuffer = await page.screenshot({
								fullPage: screenshotOptions.fullPage || false,
								type: 'png',
							});

							// Convert buffer to base64 for n8n
							const screenshotBase64 = screenshotBuffer.toString('base64');

							result = {
								operation: 'screenshot',
								sessionId,
								screenshot: `data:image/png;base64,${screenshotBase64}`,
								options: screenshotOptions,
								status: 'completed',
								message: `Screenshot captured successfully`,
							};
						} finally {
							// await browser.close();
						}

					} else if (operation === 'getContent') {
						const selector = this.getNodeParameter('selector', i) as string;
						
						const { browser, page } = await connectToBrowserbaseSession(connectUrl);
						console.log(browser)
						
						try {
							console.log('🐛 DEBUG - Getting content for selector:', selector);
							
							let content: string;
							
							if (selector && selector.trim() !== '') {
								// Get content from specific element
								const element = await page.locator(selector).first();
								content = await element.textContent() || '';
							} else {
								// Get full page content
								content = await page.textContent('body') || '';
							}

							result = {
								operation: 'getContent',
								sessionId,
								selector: selector || 'body',
								content,
								status: 'completed',
								message: `Content extracted successfully (${content.length} characters)`,
							};
						} finally {
							// await browser.close();
						}

					} else if (operation === 'click') {
						const selector = this.getNodeParameter('selector', i) as string;
						
						const { browser, page } = await connectToBrowserbaseSession(connectUrl);
						console.log(browser)

						try {
							console.log('🐛 DEBUG - Clicking element:', selector);
							
							await page.locator(selector).first().click();
							
							// Wait a bit for any page changes
							await page.waitForTimeout(1000);

							result = {
								operation: 'click',
								sessionId,
								selector,
								status: 'completed',
								message: `Successfully clicked element: ${selector}`,
							};
						} finally {
							// await browser.close();
						}

					} else if (operation === 'type') {
						const selector = this.getNodeParameter('selector', i) as string;
						const text = this.getNodeParameter('text', i) as string;
						
						const { browser, page } = await connectToBrowserbaseSession(connectUrl);
						console.log(browser)
						
						try {
							console.log('🐛 DEBUG - Typing text into:', selector);
							
							await page.locator(selector).first().fill(text);

							result = {
								operation: 'type',
								sessionId,
								selector,
								text,
								status: 'completed',
								message: `Successfully typed "${text}" into ${selector}`,
							};
						} finally {
							// await browser.close();
						}
					}
				}

				returnData.push({
					json: result,
					pairedItem: { item: i },
				});

			} catch (error) {
				if (this.continueOnFail()) {
					returnData.push({
						json: { 
							error: error.message,
							statusCode: error.statusCode || 'Unknown',
							details: error.description || 'No additional details'
						},
						pairedItem: { item: i },
					});
				} else {
					throw new NodeOperationError(this.getNode(), error, { itemIndex: i });
				}
			}
		}

		return [returnData];
	}
}
