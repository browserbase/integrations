import type { INodeProperties } from 'n8n-workflow';

const showOnlyForSessionStart = {
	resource: ['session'],
	operation: ['start'],
};

export const sessionStartDescription: INodeProperties[] = [
	{
		displayName: 'Model',
		name: 'modelName',
		type: 'options',
		options: [
			{
				name: 'Gemini 3 Flash (Google)',
				value: 'google/gemini-3-flash-preview',
			},
			{
				name: 'Gemini 3 Pro (Google)',
				value: 'google/gemini-3-pro-preview',
			},
			{
				name: 'GPT-4.1 (OpenAI)',
				value: 'openai/gpt-4.1',
			},
			{
				name: 'GPT-4o (OpenAI)',
				value: 'openai/gpt-4o',
			},
			{
				name: 'GPT-4o Mini (OpenAI)',
				value: 'openai/gpt-4o-mini',
			},
			{
				name: 'Claude 4.5 Sonnet (Anthropic)',
				value: 'anthropic/claude-sonnet-4-5-20250929',
			},
			{
				name: 'Claude 4.5 Opus (Anthropic)',
				value: 'anthropic/claude-opus-4-5-20251101',
			},
		],
		default: 'openai/gpt-4o',
		displayOptions: {
			show: showOnlyForSessionStart,
		},
		description: 'The AI model to use for browser automation',
		routing: {
			send: {
				type: 'body',
				property: 'modelName',
			},
		},
	},
	{
		displayName: 'Options',
		name: 'options',
		type: 'collection',
		placeholder: 'Add Option',
		default: {},
		displayOptions: {
			show: showOnlyForSessionStart,
		},
		options: [
			{
				displayName: 'DOM Settle Timeout (ms)',
				name: 'domSettleTimeoutMs',
				type: 'number',
				default: 5000,
				description: 'Time to wait for DOM to settle in milliseconds',
				routing: {
					send: {
						type: 'body',
						property: 'domSettleTimeoutMs',
					},
				},
			},
			{
				displayName: 'Verbose',
				name: 'verbose',
				type: 'number',
				typeOptions: {
					minValue: 0,
					maxValue: 2,
				},
				default: 1,
				description: 'Verbosity level (0-2)',
				routing: {
					send: {
						type: 'body',
						property: 'verbose',
					},
				},
			},
			{
				displayName: 'System Prompt',
				name: 'systemPrompt',
				type: 'string',
				typeOptions: {
					rows: 4,
				},
				default: '',
				description: 'Custom system prompt for the AI model',
				routing: {
					send: {
						type: 'body',
						property: 'systemPrompt',
					},
				},
			},
			{
				displayName: 'Self Heal',
				name: 'selfHeal',
				type: 'boolean',
				default: true,
				description: 'Whether to enable self-healing for failed actions',
				routing: {
					send: {
						type: 'body',
						property: 'selfHeal',
					},
				},
			},
			{
				displayName: 'Wait for Captcha Solves',
				name: 'waitForCaptchaSolves',
				type: 'boolean',
				default: false,
				description: 'Whether to wait for captcha solving',
				routing: {
					send: {
						type: 'body',
						property: 'waitForCaptchaSolves',
					},
				},
			},
			{
				displayName: 'Act Timeout (ms)',
				name: 'actTimeoutMs',
				type: 'number',
				default: 30000,
				description: 'Timeout for act operations in milliseconds',
				routing: {
					send: {
						type: 'body',
						property: 'actTimeoutMs',
					},
				},
			},
			{
				displayName: 'Experimental',
				name: 'experimental',
				type: 'boolean',
				default: false,
				description: 'Whether to enable experimental features',
				routing: {
					send: {
						type: 'body',
						property: 'experimental',
					},
				},
			},
		],
	},
	{
		displayName: 'Browser Settings',
		name: 'browserSettings',
		type: 'collection',
		placeholder: 'Add Browser Setting',
		default: {},
		displayOptions: {
			show: showOnlyForSessionStart,
		},
		options: [
			{
				displayName: 'Record Session',
				name: 'recordSession',
				type: 'boolean',
				default: true,
				description: 'Whether to record the browser session',
				routing: {
					send: {
						type: 'body',
						property: 'browserbaseSessionCreateParams.browserSettings.recordSession',
					},
				},
			},
			{
				displayName: 'Solve Captchas',
				name: 'solveCaptchas',
				type: 'boolean',
				default: false,
				description: 'Whether to automatically solve captchas',
				routing: {
					send: {
						type: 'body',
						property: 'browserbaseSessionCreateParams.browserSettings.solveCaptchas',
					},
				},
			},
			{
				displayName: 'Block Ads',
				name: 'blockAds',
				type: 'boolean',
				default: true,
				description: 'Whether to block ads',
				routing: {
					send: {
						type: 'body',
						property: 'browserbaseSessionCreateParams.browserSettings.blockAds',
					},
				},
			},
			{
				displayName: 'Advanced Stealth',
				name: 'advancedStealth',
				type: 'boolean',
				default: false,
				description: 'Whether to enable advanced stealth mode',
				routing: {
					send: {
						type: 'body',
						property: 'browserbaseSessionCreateParams.browserSettings.advancedStealth',
					},
				},
			},
			{
				displayName: 'Log Session',
				name: 'logSession',
				type: 'boolean',
				default: false,
				description: 'Whether to log the session',
				routing: {
					send: {
						type: 'body',
						property: 'browserbaseSessionCreateParams.browserSettings.logSession',
					},
				},
			},
			{
				displayName: 'Viewport Width',
				name: 'viewportWidth',
				type: 'number',
				default: 1280,
				description: 'Browser viewport width',
				routing: {
					send: {
						type: 'body',
						property: 'browserbaseSessionCreateParams.browserSettings.viewport.width',
					},
				},
			},
			{
				displayName: 'Viewport Height',
				name: 'viewportHeight',
				type: 'number',
				default: 720,
				description: 'Browser viewport height',
				routing: {
					send: {
						type: 'body',
						property: 'browserbaseSessionCreateParams.browserSettings.viewport.height',
					},
				},
			},
		],
	},
	{
		displayName: 'Session Settings',
		name: 'sessionSettings',
		type: 'collection',
		placeholder: 'Add Session Setting',
		default: {},
		displayOptions: {
			show: showOnlyForSessionStart,
		},
		options: [
			{
				displayName: 'Keep Alive',
				name: 'keepAlive',
				type: 'boolean',
				default: false,
				description: 'Whether to keep the session alive',
				routing: {
					send: {
						type: 'body',
						property: 'browserbaseSessionCreateParams.keepAlive',
					},
				},
			},
			{
				displayName: 'Proxies',
				name: 'proxies',
				type: 'boolean',
				default: true,
				description: 'Whether to use proxies',
				routing: {
					send: {
						type: 'body',
						property: 'browserbaseSessionCreateParams.proxies',
					},
				},
			},
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
				routing: {
					send: {
						type: 'body',
						property: 'browserbaseSessionCreateParams.region',
					},
				},
			},
			{
				displayName: 'Timeout (seconds)',
				name: 'timeout',
				type: 'number',
				default: 300,
				description: 'Session timeout in seconds',
				routing: {
					send: {
						type: 'body',
						property: 'browserbaseSessionCreateParams.timeout',
					},
				},
			},
		],
	},
];
