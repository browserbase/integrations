import type {
	IExecuteFunctions,
	INodeExecutionData,
	INodeType,
	INodeTypeDescription,
} from 'n8n-workflow';
import { NodeConnectionType, NodeOperationError } from 'n8n-workflow';
import { Stagehand } from '@browserbasehq/stagehand';
import { z } from 'zod';
import { browserOperations, browserFields, browserActionOperations } from './BrowserDescription';

/**
 * Helper function to connect to Browserbase session with Stagehand
 */
async function connectToBrowserbaseSession(sessionId: string, apiKey: string, projectId: string, openaiApiKey: string) {
	const stagehand = new Stagehand({
		env: "BROWSERBASE",
		apiKey,
		projectId,
		browserbaseSessionID: sessionId,
		modelName: "gpt-4o",
		modelClientOptions: {
			apiKey: openaiApiKey,
		},
	});
	await stagehand.init();
	return stagehand;
}

export class BrowserbaseNode implements INodeType {
	
	/**
	 * Convert JSON Schema to Zod schema
	 */
	private static convertJsonSchemaToZod(jsonSchema: any): z.ZodObject<any> {
		if (jsonSchema.type === 'object' && jsonSchema.properties) {
			const shape: Record<string, z.ZodSchema<any>> = {};
			
			for (const [key, value] of Object.entries(jsonSchema.properties)) {
				const prop = value as any;
				let zodField: z.ZodSchema<any>;
				
				if (prop.type === 'string') {
					zodField = z.string();
				} else if (prop.type === 'number') {
					zodField = z.number();
				} else if (prop.type === 'boolean') {
					zodField = z.boolean();
				} else if (prop.type === 'array') {
					zodField = z.array(z.any());
				} else {
					zodField = z.any();
				}
				
				// Add description if available
				if (prop.description) {
					zodField = zodField.describe(prop.description);
				}
				
				// Handle optional fields
				if (!jsonSchema.required || !jsonSchema.required.includes(key)) {
					zodField = zodField.optional();
				}
				
				shape[key] = zodField;
			}
			
			return z.object(shape);
		}
		
		// Default to a simple object schema
		return z.object({
			result: z.any().describe('Extracted data')
		});
	}

	description: INodeTypeDescription = {
		displayName: 'Browserbase',
		name: 'browserbase',
		icon: { light: 'file:browserbase.svg', dark: 'file:browserbase.svg' },
		group: ['transform'],
		version: 1,
		subtitle: '={{$parameter["operation"] + ": " + $parameter["resource"]}}',
		description: 'Interact with websites using Stagehand AI automation - navigate, screenshot, and use AI to act, observe, and extract data from web pages (OpenAI API key required for AI operations)',
		defaults: {
			name: 'Browserbase',
		},
		inputs: [NodeConnectionType.Main],
		outputs: [NodeConnectionType.Main],
		usableAsTool: true,
		credentials: [
			{
				name: 'BrowserbaseApi',
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

					} else if (['getSessions', 'getSession'].includes(operation)) {
						// Get credentials for API authentication
						const credentials = await this.getCredentials('Browserbase');
						const apiKey = credentials.apiKey as string;
						
						const sessionId = operation !== 'getSessions' ? this.getNodeParameter('sessionId', i) as string : '';
						
						let url = 'https://api.browserbase.com/v1/sessions';
						if (sessionId) {
							url += `/${sessionId}`;
						}

						const method = 'GET';

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
					
					} else if (operation === 'closeSession') {
						// Close session automatically using previous node's session ID
						const credentials = await this.getCredentials('Browserbase');
						const apiKey = credentials.apiKey as string;
						
						// Try to get session ID from input data
						const inputData = items[i].json as Record<string, any>;
						const sessionId = (inputData.id || inputData.sessionId || '') as string;
						
						if (!sessionId) {
							throw new NodeOperationError(
								this.getNode(),
								'No session ID found in input data. Please ensure a "Create Session" or other session node is connected before this node.',
								{ itemIndex: i }
							);
						}
						
						const url = `https://api.browserbase.com/v1/sessions/${sessionId}`;
						
						console.log('🐛 DEBUG - Close Session Request:', {
							operation,
							url,
							sessionId
						});
						
						result = await this.helpers.httpRequest({
							method: 'DELETE',
							url,
							headers: {
								'Content-Type': 'application/json',
								'X-BB-API-Key': apiKey,
							},
						});
						
						// Add success message
						result = {
							...result,
							operation: 'closeSession',
							sessionId,
							status: 'completed',
							message: `Successfully closed session ${sessionId}`,
						};
						
						console.log('🐛 DEBUG - Close Session Response:', result);
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

					console.log('🐛 DEBUG - Connecting to browser session:', sessionId);
					
					// Get credentials for Stagehand connection
					const stagecredentials = await this.getCredentials('Browserbase');
					const projectId = stagecredentials.projectId as string;
					const openaiApiKey = stagecredentials.openaiApiKey as string;
					
					// Validate OpenAI API key for AI operations
					if (['act', 'observe', 'extract'].includes(operation) && !openaiApiKey) {
						throw new NodeOperationError(
							this.getNode(),
							'OpenAI API key is required for AI operations (act, observe, extract). Please add it to your Browserbase credentials.',
							{ itemIndex: i }
						);
					}
					
					const stagehand = await connectToBrowserbaseSession(sessionId, apiKey, projectId, openaiApiKey);

					if (operation === 'navigate') {
						const url = this.getNodeParameter('url', i) as string;

						try {
							console.log('🐛 DEBUG - Navigating to:', url);
							await stagehand.page.goto(url, { waitUntil: 'domcontentloaded', timeout: 0 });

							const currentUrl = stagehand.page.url();
							const title = await stagehand.page.title();

							result = {
								operation: 'navigate',
								sessionId,
								url: currentUrl,
								title,
								status: 'completed',
								message: `Successfully navigated to ${currentUrl}`,
							};
						} finally {
							// Don't close the stagehand as other nodes might use the same session
							// await stagehand.close();
						}

					} else if (operation === 'screenshot') {
						const screenshotOptions = this.getNodeParameter('screenshotOptions', i, {}) as any;
						
						try {
							console.log('🐛 DEBUG - Taking screenshot with options:', screenshotOptions);

							const screenshotBuffer = await stagehand.page.screenshot({
								fullPage: screenshotOptions.fullPage || false,
								type: 'png',
								timeout: 0,
							});

							result = {
								operation: 'screenshot',
								sessionId,
								options: screenshotOptions,
								status: 'completed',
								message: `Screenshot captured successfully`,
								binary: {
									screenshot: {
										data: screenshotBuffer.toString('base64'),
										mimeType: 'image/png',
										fileExtension: 'png',
										fileName: `screenshot_${Date.now()}.png`,
									},
								},
							};
						} finally {
							// await stagehand.close();
						}

					} else if (operation === 'act') {
						const action = this.getNodeParameter('action', i) as string;

						try {
							console.log('🐛 DEBUG - Performing action:', action);
							
							await stagehand.page.act({ action });

							result = {
								operation: 'act',
								sessionId,
								action,
								status: 'completed',
								message: `Successfully performed action: ${action}`,
							};
						} finally {
							// await stagehand.close();
						}

					} else if (operation === 'observe') {
						const instruction = this.getNodeParameter('instruction', i) as string;
						const returnActions = this.getNodeParameter('returnActions', i, false) as boolean;

						try {
							console.log('🐛 DEBUG - Observing page with instruction:', instruction);
							
							const observations = await stagehand.page.observe({
								instruction,
								returnAction: returnActions,
							});

							result = {
								operation: 'observe',
								sessionId,
								instruction,
								returnActions,
								observations,
								status: 'completed',
								message: `Successfully observed page with ${observations.length} results`,
							};
						} finally {
							// await stagehand.close();
						}

					} else if (operation === 'extract') {
						const instruction = this.getNodeParameter('instruction', i) as string;
						const schemaJson = this.getNodeParameter('schema', i) as string;

						try {
							console.log('🐛 DEBUG - Extracting data with instruction:', instruction);
							
							// Parse the JSON schema and convert to Zod schema
							const parsedSchema = JSON.parse(schemaJson);
							const zodSchema = BrowserbaseNode.convertJsonSchemaToZod(parsedSchema);

							const extractedData = await stagehand.page.extract({
								instruction,
								schema: zodSchema,
							});

							result = {
								operation: 'extract',
								sessionId,
								instruction,
								schema: parsedSchema,
								extractedData,
								status: 'completed',
								message: `Successfully extracted data matching schema`,
							};
						} finally {
							// await stagehand.close();
						}
					}
				}

				const { binary, ...jsonResult } = result;
				returnData.push({
					json: jsonResult,
					binary: binary,
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
