import type {
	IExecuteFunctions,
	INodeExecutionData,
	INodeType,
	INodeTypeDescription,
} from 'n8n-workflow';
import { NodeConnectionType, NodeOperationError } from 'n8n-workflow';
import { chromium } from 'playwright-core';
import { AvailableModel, Stagehand } from '@browserbasehq/stagehand';
import { z } from 'zod';
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
 * Helper function to initialize Stagehand with Browserbase session
 */
async function stagehandInit(
	sessionId: string,
	browserbaseApiKey: string,
	aiApiKey: string,
	projectId: string,
	modelName?: AvailableModel,
): Promise<Stagehand> {
	const stagehand = new Stagehand({
		env: 'BROWSERBASE',
		browserbaseSessionID: sessionId,
		apiKey: browserbaseApiKey,
		projectId: projectId,
		verbose: 1,
		modelClientOptions: {
			apiKey: aiApiKey,
		},
		modelName: (modelName || 'gpt-4o') as AvailableModel,
	});

	await stagehand.init();

	return stagehand;
}

/**
 * Helper function to connect to Browserbase session with Playwright
 */
async function connectToBrowserbaseSession(connectUrl: string) {
	const browser = await chromium.connectOverCDP(connectUrl);
	const defaultContext = browser.contexts()[0];
	const page = defaultContext?.pages()?.[0] || (await defaultContext.newPage());
	return { page };
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
		requestDefaults: {
			baseURL: 'https://api.browserbase.com/v1',
			headers: {
				'Content-Type': 'application/json',
				'X-BB-API-Key': '={{$credentials.apiKey}}',
			},
		},
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

				// Browser Session operations are handled declaratively via routing
				// Only Browser Action operations need programmatic handling
				if (resource === 'browserAction') {
					const credentials = await this.getCredentials('Browserbase');
					const apiKey = credentials.apiKey as string;
					const projectId = credentials.projectId as string;
					const defaultAiApiKey = credentials.aiApiKey as string;
					
					const sessionSource = this.getNodeParameter('sessionSource', i);
					let sessionId: string;

					if (sessionSource === 'previous') {
						// Try to get session ID from input data
						const inputData = items[i].json as Record<string, any>;
						sessionId = (inputData.id || inputData.sessionId || '') as string;
						
						if (!sessionId) {
							throw new NodeOperationError(
								this.getNode(),
								'No session ID found in input data. Please ensure a "Create Session" node is connected before this node, or use "Specify Session ID" option.',
								{ itemIndex: i },
							);
						}
					} else {
						sessionId = this.getNodeParameter('sessionId', i) as string;
					}

					// For non-AI operations, we need the connectUrl
					let connectUrl: string | undefined;
					if (['navigate', 'screenshot', 'getContent', 'click', 'type'].includes(operation)) {
						const sessionDetails = await getSessionDetails(sessionId, apiKey);
						connectUrl = sessionDetails.connectUrl;

						if (!connectUrl) {
							throw new NodeOperationError(
								this.getNode(),
								`Session ${sessionId} does not have a valid connectUrl. The session may be expired or invalid.`,
								{ itemIndex: i },
							);
						}
					}
					
					if (operation === 'navigate') {
						const url = this.getNodeParameter('url', i) as string;

						const { page } = await connectToBrowserbaseSession(connectUrl!);

						try {
							await page.goto(url, { waitUntil: 'domcontentloaded' });

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
						} catch (error) {
							throw new NodeOperationError(
								this.getNode(),
								`Error navigating to ${url}: ${error.message}`,
								{ itemIndex: i },
							);
						}

					} else if (operation === 'act') {
						const instructions = this.getNodeParameter('instructions', i) as string;
						const aiOptions = this.getNodeParameter('aiOptions', i, {}) as any;
						
						const stagehand = await stagehandInit(
							sessionId, 
							apiKey, 
							aiOptions.apiKey || defaultAiApiKey,
							projectId, 
							aiOptions.modelName || 'gpt-4o',
						);
						
						try {
							const actResult = await stagehand.page.act(instructions);

							result = {
								operation: 'act',
								sessionId,
								instructions,
								result: actResult,
								status: 'completed',
								message: `Successfully executed: ${instructions}`,
							};
						} catch (error) {
							await stagehand.close();
							throw new NodeOperationError(
								this.getNode(),
								`Error executing act instruction: ${error.message}`,
								{ itemIndex: i },
							);
						}

					} else if (operation === 'observe') {
						const instructions = this.getNodeParameter('instructions', i) as string;
						const aiOptions = this.getNodeParameter('aiOptions', i, {}) as any;
						
						const stagehand = await stagehandInit(
							sessionId, 
							apiKey, 
							aiOptions.apiKey || defaultAiApiKey,
							projectId, 
							aiOptions.modelName || 'gpt-4o',
						);
						
						try {
							const observations = await stagehand.page.observe(instructions);

							result = {
								operation: 'observe',
								sessionId,
								instructions,
								observations,
								status: 'completed',
								message: `Successfully observed: ${instructions}`,
							};
						} catch (error) {
							await stagehand.close();
							throw new NodeOperationError(
								this.getNode(),
								`Error executing observe instruction: ${error.message}`,
								{ itemIndex: i },
							);
						}

					} else if (operation === 'extract') {
						const instructions = this.getNodeParameter('instructions', i) as string;
						const schemaJson = this.getNodeParameter('schema', i) as string;
						const aiOptions = this.getNodeParameter('aiOptions', i, {}) as any;
						
						// Parse the schema JSON and create a Zod object
						let schema;
						try {
							const schemaObj = JSON.parse(schemaJson);
							// Convert the schema object to a Zod schema
							const zodFields: Record<string, any> = {};
							for (const [key, value] of Object.entries(schemaObj)) {
								const zodType = value as string;
								// Simple mapping of common Zod types
								if (zodType.includes('string')) {
									zodFields[key] = z.string();
								} else if (zodType.includes('number')) {
									zodFields[key] = z.number();
								} else if (zodType.includes('boolean')) {
									zodFields[key] = z.boolean();
								} else if (zodType.includes('array')) {
									zodFields[key] = z.array(z.string()); // Default to string array
								} else {
									zodFields[key] = z.string(); // Default fallback
								}
							}
							schema = z.object(zodFields);
						} catch (error) {
							throw new NodeOperationError(
								this.getNode(),
								`Invalid schema JSON: ${error.message}`,
								{ itemIndex: i },
							);
						}
						
						const stagehand = await stagehandInit(
							sessionId, 
							apiKey, 
							aiOptions.apiKey || defaultAiApiKey,
							projectId, 
							aiOptions.modelName || 'gpt-4o',
						);
						
						try {
							const extractedData = await stagehand.page.extract({
								instruction: instructions,
								schema,
							});

							result = {
								operation: 'extract',
								sessionId,
								instructions,
								schema: schemaJson,
								data: extractedData,
								status: 'completed',
								message: `Successfully extracted data: ${instructions}`,
							};
						} catch (error) {
							await stagehand.close();
							throw new NodeOperationError(
								this.getNode(),
								`Error extracting data: ${error.message}`,
								{ itemIndex: i },
							);
						}

					} else if (operation === 'screenshot') {
						const screenshotOptions = this.getNodeParameter('screenshotOptions', i, {}) as any;
						
						const { page } = await connectToBrowserbaseSession(connectUrl!);
						
						try {
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
						} catch (error) {
							throw new NodeOperationError(
								this.getNode(),
								`Error taking screenshot: ${error.message}`,
								{ itemIndex: i },
							);
						}

					} else if (operation === 'getContent') {
						const selector = this.getNodeParameter('selector', i) as string;
						
						const { page } = await connectToBrowserbaseSession(connectUrl!);
						
						try {
							let content: string;
							
							if (selector && selector.trim() !== '') {
								// Get content from specific element
								const element = await page.locator(selector).first();
								content = (await element.textContent()) || '';
							} else {
								// Get full page content
								content = (await page.textContent('body')) || '';
							}

							result = {
								operation: 'getContent',
								sessionId,
								selector: selector || 'body',
								content,
								status: 'completed',
								message: `Content extracted successfully (${content.length} characters)`,
							};
						} catch (error) {
							throw new NodeOperationError(
								this.getNode(),
								`Error getting content: ${error.message}`,
								{ itemIndex: i },
							);
						}

					} else if (operation === 'click') {
						const selector = this.getNodeParameter('selector', i) as string;
						
						const { page } = await connectToBrowserbaseSession(connectUrl!);

						try {
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
						} catch (error) {
							throw new NodeOperationError(
								this.getNode(),
								`Error clicking element: ${error.message}`,
								{ itemIndex: i },
							);
						}

					} else if (operation === 'type') {
						const selector = this.getNodeParameter('selector', i) as string;
						const text = this.getNodeParameter('text', i) as string;
						
						const { page } = await connectToBrowserbaseSession(connectUrl!);
						
						try {
							await page.locator(selector).first().fill(text);

							result = {
								operation: 'type',
								sessionId,
								selector,
								text,
								status: 'completed',
								message: `Successfully typed "${text}" into ${selector}`,
							};
						} catch (error) {
							throw new NodeOperationError(
								this.getNode(),
								`Error typing text into ${selector}: ${error.message}`,
								{ itemIndex: i },
							);
						}
					}

					returnData.push({
						json: result,
						pairedItem: { item: i },
					});
				}
				// browserSession operations are handled declaratively and don't reach this execute method

			} catch (error) {
				if (this.continueOnFail()) {
					returnData.push({
						json: { 
							error: error.message,
							statusCode: error.statusCode || 'Unknown',
							details: error.description || 'No additional details',
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
