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
		subtitle: '={{$parameter["mode"]}} agent',
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
			// Notice about modes
			{
				displayName:
					'CUA uses vision/coordinates (best for complex UIs). DOM uses selectors (faster, any LLM). Hybrid combines both.',
				name: 'modeNotice',
				type: 'notice',
				default: '',
			},
			// Primary fields
			{
				displayName: 'Starting URL',
				name: 'url',
				type: 'string',
				default: '',
				required: true,
				placeholder: 'https://example.com',
				description: 'Starting page for the agent',
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
				placeholder:
					"e.g., Find the pricing page and extract all plan names and prices",
				description: 'Task for the agent to complete',
			},
			// Notice about modes
			{
				displayName:
					'Driver Model is used for the actual primitive operations. Agent Model is used for orchestration. For now pick both models from the same provider.',
				name: 'modeNotice',
				type: 'notice',
				default: '',
			},
			// Driver Model for session start
			{
				displayName: 'Driver Model',
				name: 'driverModel',
				type: 'options',
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
				displayName: 'Model',
				name: 'modelCua',
				type: 'options',
				displayOptions: {
					show: {
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
				displayName: 'Model',
				name: 'modelDom',
				type: 'options',
				displayOptions: {
					show: {
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
				displayName: 'Model',
				name: 'modelHybrid',
				type: 'options',
				displayOptions: {
					show: {
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
			// Agent Options
			{
				displayName: 'Agent Options',
				name: 'agentOptions',
				type: 'collection',
				placeholder: 'Add Option',
				default: {},
				options: [
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
						description: 'Custom system prompt for the agent',
					},
					{
						displayName: 'Highlight Cursor',
						name: 'highlightCursor',
						type: 'boolean',
						default: true,
						description:
							'Whether to highlight the cursor during execution (CUA/Hybrid only)',
					},
				],
			},
			// Browser Settings
			{
				displayName: 'Browser Settings',
				name: 'browserSettings',
				type: 'collection',
				placeholder: 'Add Setting',
				default: {},
				options: [
					{
						displayName: 'Advanced Stealth',
						name: 'advancedStealth',
						type: 'boolean',
						default: false,
						description: 'Whether to enable advanced stealth mode',
					},
					{
						displayName: 'Block Ads',
						name: 'blockAds',
						type: 'boolean',
						default: true,
						description: 'Whether to block ads',
					},
					{
						displayName: 'Record Session',
						name: 'recordSession',
						type: 'boolean',
						default: true,
						description: 'Whether to record the browser session',
					},
					{
						displayName: 'Solve Captchas',
						name: 'solveCaptchas',
						type: 'boolean',
						default: false,
						description: 'Whether to automatically solve captchas',
					},
					{
						displayName: 'Viewport Height',
						name: 'viewportHeight',
						type: 'number',
						default: 711,
						description: 'Browser viewport height (711 recommended for CUA)',
					},
					{
						displayName: 'Viewport Width',
						name: 'viewportWidth',
						type: 'number',
						default: 1288,
						description: 'Browser viewport width (1288 recommended for CUA)',
					},
				],
			},
			// Session Settings
			{
				displayName: 'Session Settings',
				name: 'sessionSettings',
				type: 'collection',
				placeholder: 'Add Setting',
				default: {},
				options: [
					{
						displayName: 'Region',
						name: 'region',
						type: 'options',
						options: [
							{ name: 'US West 2', value: 'us-west-2' },
							{ name: 'US East 1', value: 'us-east-1' },
							{ name: 'EU West 1', value: 'eu-west-1' },
							{ name: 'AP South 1', value: 'ap-south-1' },
						],
						default: 'us-west-2',
						description: 'Region for the browser session',
					},
					{
						displayName: 'Timeout (Seconds)',
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
						description: 'Whether to use proxies',
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

				const agentOptions = this.getNodeParameter('agentOptions', i, {}) as {
					maxSteps?: number;
					systemPrompt?: string;
					highlightCursor?: boolean;
				};
				const browserSettings = this.getNodeParameter(
					'browserSettings',
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
				const sessionSettings = this.getNodeParameter(
					'sessionSettings',
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
								recordSession: browserSettings.recordSession ?? true,
								solveCaptchas: browserSettings.solveCaptchas ?? false,
								blockAds: browserSettings.blockAds ?? true,
								advancedStealth: browserSettings.advancedStealth ?? false,
								viewport: {
									width: browserSettings.viewportWidth ?? 1288,
									height: browserSettings.viewportHeight ?? 711,
								},
							},
							region: sessionSettings.region ?? 'us-west-2',
							timeout: sessionSettings.timeout ?? 300,
							proxies: sessionSettings.proxies ?? true,
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
							maxSteps: agentOptions.maxSteps ?? 20,
						},
					};

					if (agentOptions.systemPrompt) {
						(executeBody.agentConfig as Record<string, unknown>).systemPrompt =
							agentOptions.systemPrompt;
					}

					if (
						(mode === 'cua' || mode === 'hybrid') &&
						agentOptions.highlightCursor !== false
					) {
						(executeBody.executeOptions as Record<string, unknown>).highlightCursor =
							agentOptions.highlightCursor ?? true;
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
