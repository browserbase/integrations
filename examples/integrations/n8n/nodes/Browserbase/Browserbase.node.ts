import {
	NodeConnectionTypes,
	type IExecuteFunctions,
	type INodeExecutionData,
	type INodeType,
	type INodeTypeDescription,
	type IHttpRequestMethods,
	NodeOperationError,
} from 'n8n-workflow';

const BASE_URL = 'https://api.stagehand.browserbase.com';

export class Browserbase implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Browserbase Agent',
		name: 'browserbase',
		icon: 'file:../../icons/browserbase.svg',
		group: ['transform'],
		version: 2,
		subtitle: '={{$parameter["operation"] + ": " + $parameter["mode"]}}',
		description:
			'AI-powered browser automation. Provide a URL and instruction, get results. Supports CUA (vision), DOM (selectors), and Hybrid modes.',
		defaults: {
			name: 'Browserbase Agent',
		},
		inputs: [NodeConnectionTypes.Main],
		outputs: [NodeConnectionTypes.Main],
		usableAsTool: true,
		credentials: [
			{
				name: 'browserbaseApi',
				required: true,
			},
		],
		properties: [
			// Resource
			{
				displayName: 'Resource',
				name: 'resource',
				type: 'options',
				noDataExpression: true,
				options: [
					{
						name: 'Agent',
						value: 'agent',
					},
				],
				default: 'agent',
			},
			// Operation
			{
				displayName: 'Operation',
				name: 'operation',
				type: 'options',
				noDataExpression: true,
				displayOptions: {
					show: {
						resource: ['agent'],
					},
				},
				options: [
					{
						name: 'Execute',
						value: 'execute',
						description: 'Execute an AI agent to perform browser automation tasks',
						action: 'Execute an agent',
					},
				],
				default: 'execute',
			},
			// Notice about modes
			{
				displayName: 'Mode Info',
				name: 'modeNotice',
				type: 'notice',
				default: '',
				displayOptions: {
					show: {
						resource: ['agent'],
						operation: ['execute'],
					},
				},
				description:
					'CUA uses vision/coordinates (best for complex UIs). DOM uses selectors (faster, any LLM). Hybrid combines both.',
			},
			// Primary fields
			{
				displayName: 'Starting URL',
				name: 'url',
				type: 'string',
				default: '',
				required: true,
				placeholder: 'e.g. https://example.com',
				description: 'The starting page URL for the agent',
				displayOptions: {
					show: {
						resource: ['agent'],
						operation: ['execute'],
					},
				},
			},
			{
				displayName: 'Instruction',
				name: 'instruction',
				type: 'string',
				typeOptions: {
					rows: 4,
				},
				default: '',
				required: true,
				placeholder: 'e.g. Find the pricing page and extract all plan names and prices',
				description: 'The task for the agent to complete',
				displayOptions: {
					show: {
						resource: ['agent'],
						operation: ['execute'],
					},
				},
			},
			// Notice about models
			{
				displayName: 'Model Info',
				name: 'modelNotice',
				type: 'notice',
				default: '',
				displayOptions: {
					show: {
						resource: ['agent'],
						operation: ['execute'],
					},
				},
				description:
					'Driver Model is used for the actual primitive operations. Agent Model is used for orchestration. For now pick both models from the same provider.',
			},
			// Driver Model for session start
			{
				displayName: 'Driver Model',
				name: 'driverModel',
				type: 'options',
				displayOptions: {
					show: {
						resource: ['agent'],
						operation: ['execute'],
					},
				},
				options: [
					{
						name: 'Claude Sonnet 4.5 (Anthropic)',
						value: 'anthropic/claude-sonnet-4-5-20250929',
					},
					{
						name: 'Gemini 2.5 Flash (Google) - Recommended',
						value: 'google/gemini-2.5-flash',
					},
					{
						name: 'Gemini 2.5 Pro (Google)',
						value: 'google/gemini-2.5-pro',
					},
					{
						name: 'GPT-4o (OpenAI)',
						value: 'openai/gpt-4o',
					},
					{
						name: 'GPT-4o Mini (OpenAI)',
						value: 'openai/gpt-4o-mini',
					},
				],
				default: 'google/gemini-2.5-flash',
				description: 'Model for browser session (DOM-based, used for navigation)',
			},
			// Mode selection
			{
				displayName: 'Mode',
				name: 'mode',
				type: 'options',
				displayOptions: {
					show: {
						resource: ['agent'],
						operation: ['execute'],
					},
				},
				options: [
					{
						name: 'CUA (Computer Use Agent)',
						value: 'cua',
						description:
							'Uses vision and coordinates. Works with CUA-specific models.',
					},
					{
						name: 'DOM',
						value: 'dom',
						description: 'Uses DOM selectors. Works with any LLM. Faster.',
					},
					{
						name: 'Hybrid (Experimental)',
						value: 'hybrid',
						description:
							'Combines vision and DOM. Requires specific models.',
					},
				],
				default: 'cua',
				description: 'Agent mode determines how the agent interacts with pages',
			},
			// CUA Models
			{
				displayName: 'Agent Model',
				name: 'modelCua',
				type: 'options',
				displayOptions: {
					show: {
						resource: ['agent'],
						operation: ['execute'],
						mode: ['cua'],
					},
				},
				options: [
					{
						name: 'Claude Haiku 4.5 (Anthropic) - Fastest',
						value: 'anthropic/claude-haiku-4-5-20251001',
					},
					{
						name: 'Claude Sonnet 4 (Anthropic)',
						value: 'anthropic/claude-sonnet-4-20250514',
					},
					{
						name: 'Claude Sonnet 4.5 (Anthropic)',
						value: 'anthropic/claude-sonnet-4-5-20250929',
					},
					{
						name: 'Computer Use Preview (OpenAI)',
						value: 'openai/computer-use-preview',
					},
					{
						name: 'Gemini 2.5 CUA (Google) - Recommended',
						value: 'google/gemini-2.5-computer-use-preview-10-2025',
					},
				],
				default: 'google/gemini-2.5-computer-use-preview-10-2025',
				description: 'CUA model for vision-based browser control',
			},
			// DOM Models
			{
				displayName: 'Agent Model',
				name: 'modelDom',
				type: 'options',
				displayOptions: {
					show: {
						resource: ['agent'],
						operation: ['execute'],
						mode: ['dom'],
					},
				},
				options: [
					{
						name: 'Claude Sonnet 4.5 (Anthropic)',
						value: 'anthropic/claude-sonnet-4-5-20250929',
					},
					{
						name: 'Gemini 2.5 Flash (Google) - Fast & Cheap',
						value: 'google/gemini-2.5-flash',
					},
					{
						name: 'Gemini 2.5 Pro (Google) - Most Capable',
						value: 'google/gemini-2.5-pro',
					},
					{
						name: 'GPT-4o (OpenAI)',
						value: 'openai/gpt-4o',
					},
					{
						name: 'GPT-4o Mini (OpenAI) - Budget',
						value: 'openai/gpt-4o-mini',
					},
				],
				default: 'google/gemini-2.5-flash',
				description: 'LLM for DOM-based browser control',
			},
			// Hybrid Models
			{
				displayName: 'Agent Model',
				name: 'modelHybrid',
				type: 'options',
				displayOptions: {
					show: {
						resource: ['agent'],
						operation: ['execute'],
						mode: ['hybrid'],
					},
				},
				options: [
					{
						name: 'Gemini 3 Flash (Google) - Recommended',
						value: 'google/gemini-3-flash-preview',
					},
					{
						name: 'Claude Sonnet 4 (Anthropic)',
						value: 'anthropic/claude-sonnet-4-20250514',
					},
					{
						name: 'Claude Haiku 4.5 (Anthropic)',
						value: 'anthropic/claude-haiku-4-5-20251001',
					},
				],
				default: 'google/gemini-3-flash-preview',
				description: 'Model for hybrid mode (must support coordinate actions)',
			},
			// Options collection (combines agent options)
			{
				displayName: 'Options',
				name: 'options',
				type: 'collection',
				placeholder: 'Add Option',
				default: {},
				displayOptions: {
					show: {
						resource: ['agent'],
						operation: ['execute'],
					},
				},
				options: [
					{
						displayName: 'Highlight Cursor',
						name: 'highlightCursor',
						type: 'boolean',
						default: true,
						description:
							'Whether to highlight the cursor during execution (CUA/Hybrid only)',
					},
					{
						displayName: 'Max Steps',
						name: 'maxSteps',
						type: 'number',
						default: 20,
						description: 'Maximum number of steps the agent can take',
					},
					{
						displayName: 'System Prompt',
						name: 'systemPrompt',
						type: 'string',
						typeOptions: {
							rows: 4,
						},
						default: '',
						placeholder: 'e.g. You are a helpful assistant that extracts data from websites',
						description: 'Custom system prompt for the agent',
					},
				],
			},
			// Browser Options
			{
				displayName: 'Browser Options',
				name: 'browserOptions',
				type: 'collection',
				placeholder: 'Add Option',
				default: {},
				displayOptions: {
					show: {
						resource: ['agent'],
						operation: ['execute'],
					},
				},
				options: [
					{
						displayName: 'Advanced Stealth',
						name: 'advancedStealth',
						type: 'boolean',
						default: false,
						description: 'Whether to enable advanced stealth mode to avoid bot detection',
					},
					{
						displayName: 'Block Ads',
						name: 'blockAds',
						type: 'boolean',
						default: true,
						description: 'Whether to block ads during browsing',
					},
					{
						displayName: 'Record Session',
						name: 'recordSession',
						type: 'boolean',
						default: true,
						description: 'Whether to record the browser session for replay',
					},
					{
						displayName: 'Solve Captchas',
						name: 'solveCaptchas',
						type: 'boolean',
						default: false,
						description: 'Whether to automatically solve captchas encountered during execution',
					},
					{
						displayName: 'Viewport Height',
						name: 'viewportHeight',
						type: 'number',
						default: 711,
						description: 'Browser viewport height in pixels (711 recommended for CUA)',
					},
					{
						displayName: 'Viewport Width',
						name: 'viewportWidth',
						type: 'number',
						default: 1288,
						description: 'Browser viewport width in pixels (1288 recommended for CUA)',
					},
				],
			},
			// Session Options
			{
				displayName: 'Session Options',
				name: 'sessionOptions',
				type: 'collection',
				placeholder: 'Add Option',
				default: {},
				displayOptions: {
					show: {
						resource: ['agent'],
						operation: ['execute'],
					},
				},
				options: [
					{
						displayName: 'Region',
						name: 'region',
						type: 'options',
						options: [
							{ name: 'AP South 1', value: 'ap-south-1' },
							{ name: 'EU West 1', value: 'eu-west-1' },
							{ name: 'US East 1', value: 'us-east-1' },
							{ name: 'US West 2', value: 'us-west-2' },
						],
						default: 'us-west-2',
						description: 'The region where the browser session will run',
					},
					{
						displayName: 'Timeout',
						name: 'timeout',
						type: 'number',
						default: 300,
						description: 'Session timeout in seconds',
					},
					{
						displayName: 'Use Proxies',
						name: 'proxies',
						type: 'boolean',
						default: true,
						description: 'Whether to route traffic through proxies',
					},
				],
			},
		],
	};

	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		const items = this.getInputData();
		const returnData: INodeExecutionData[] = [];

		for (let i = 0; i < items.length; i++) {
			try {
				// Get parameters
				let url = this.getNodeParameter('url', i) as string;
				// Ensure URL has protocol
				if (url && !url.startsWith('http://') && !url.startsWith('https://')) {
					url = `https://${url}`;
				}
				const instruction = this.getNodeParameter('instruction', i) as string;
				const driverModel = this.getNodeParameter('driverModel', i) as string;
				const mode = this.getNodeParameter('mode', i) as string;

				// Get agent model based on mode
				let agentModel: string;
				if (mode === 'cua') {
					agentModel = this.getNodeParameter('modelCua', i) as string;
				} else if (mode === 'dom') {
					agentModel = this.getNodeParameter('modelDom', i) as string;
				} else {
					agentModel = this.getNodeParameter('modelHybrid', i) as string;
				}

				const options = this.getNodeParameter('options', i, {}) as {
					maxSteps?: number;
					systemPrompt?: string;
					highlightCursor?: boolean;
				};
				const browserOptions = this.getNodeParameter(
					'browserOptions',
					i,
					{},
				) as {
					recordSession?: boolean;
					solveCaptchas?: boolean;
					blockAds?: boolean;
					advancedStealth?: boolean;
					viewportWidth?: number;
					viewportHeight?: number;
				};
				const sessionOptions = this.getNodeParameter(
					'sessionOptions',
					i,
					{},
				) as {
					region?: string;
					timeout?: number;
					proxies?: boolean;
				};

				// Get credentials
				const credentials = await this.getCredentials('browserbaseApi');
				const headers = {
					Accept: 'application/json',
					'Content-Type': 'application/json',
					'x-bb-api-key': credentials.browserbaseApiKey as string,
					'x-bb-project-id': credentials.browserbaseProjectId as string,
					'x-model-api-key': credentials.modelApiKey as string,
				};

				// Helper function to make API calls
				const apiCall = async (
					method: IHttpRequestMethods,
					endpoint: string,
					body?: object,
				) => {
					const fullUrl = `${BASE_URL}${endpoint}`;

					try {
						const response = await this.helpers.httpRequest({
							method,
							url: fullUrl,
							headers,
							body,
							json: true,
						});
						return response;
					} catch (error: unknown) {
						const err = error as { response?: { data?: unknown }; message?: string };
						throw err;
					}
				};

				let sessionId: string | undefined;

				try {
					// 1. Start session
					const startBody: Record<string, unknown> = {
						modelName: driverModel,
						apiKey: credentials.modelApiKey as string,
						browserbaseSessionCreateParams: {
							browserSettings: {
								recordSession: browserOptions.recordSession ?? true,
								solveCaptchas: browserOptions.solveCaptchas ?? false,
								blockAds: browserOptions.blockAds ?? true,
								advancedStealth: browserOptions.advancedStealth ?? false,
								viewport: {
									width: browserOptions.viewportWidth ?? 1288,
									height: browserOptions.viewportHeight ?? 711,
								},
							},
							region: sessionOptions.region ?? 'us-west-2',
							timeout: sessionOptions.timeout ?? 300,
							proxies: sessionOptions.proxies ?? true,
						},
					};

					const startResponse = await apiCall(
						'POST',
						'/v1/sessions/start',
						startBody,
					);
					sessionId =
						startResponse.data?.sessionId ??
						startResponse.sessionId ??
						startResponse.id;

					if (!sessionId) {
						throw new NodeOperationError(
							this.getNode(),
							'Failed to get session ID from start response',
						);
					}

					// 2. Navigate to URL
					await apiCall('POST', `/v1/sessions/${sessionId}/navigate`, {
						url,
						options: {
							waitUntil: 'domcontentloaded',
						},
					});

					// 3. Execute agent
					const provider = agentModel.split('/')[0];

					const executeBody: Record<string, unknown> = {
						agentConfig: {
							provider,
							model:
							{
								modelName: agentModel,
								apiKey: credentials.modelApiKey as string
							},
							cua: mode === 'cua' || mode === 'hybrid',
						},
						executeOptions: {
							instruction,
							maxSteps: options.maxSteps ?? 20,
						},
					};

					if (options.systemPrompt) {
						(executeBody.agentConfig as Record<string, unknown>).systemPrompt =
							options.systemPrompt;
					}

					if (
						(mode === 'cua' || mode === 'hybrid') &&
						options.highlightCursor !== false
					) {
						(executeBody.executeOptions as Record<string, unknown>).highlightCursor =
							options.highlightCursor ?? true;
					}

					const executeResponse = await apiCall(
						'POST',
						`/v1/sessions/${sessionId}/agentExecute`,
						executeBody,
					);

					// 4. End session
					await apiCall('POST', `/v1/sessions/${sessionId}/end`, {});

					// Return agent result
					const result = executeResponse.data?.result ?? executeResponse;
					returnData.push({
						json: {
							success: result.success ?? true,
							message: result.message ?? 'Task completed',
							actions: result.actions ?? [],
							completed: result.completed ?? true,
							usage: result.usage ?? {},
							sessionId,
						},
						pairedItem: { item: i },
					});
				} catch (error) {
					// Try to end session if it was created
					if (sessionId) {
						try {
							await apiCall('POST', `/v1/sessions/${sessionId}/end`, {});
						} catch {
							// Ignore cleanup errors
						}
					}
					throw error;
				}
			} catch (error) {
				if (this.continueOnFail()) {
					returnData.push({
						json: {
							success: false,
							error: error instanceof Error ? error.message : String(error),
						},
						pairedItem: { item: i },
					});
					continue;
				}
				throw error;
			}
		}

		return [returnData];
	}
}
