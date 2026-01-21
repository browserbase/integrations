import type { INodeProperties } from 'n8n-workflow';

const showOnlyForObserve = {
	resource: ['ai'],
	operation: ['observe'],
};

export const observeDescription: INodeProperties[] = [
	{
		displayName: 'Session ID',
		name: 'sessionId',
		type: 'string',
		default: '={{ $json.data.sessionId }}',
		required: true,
		displayOptions: {
			show: showOnlyForObserve,
		},
		description: 'The session ID from Start Session (auto-filled from previous node)',
	},
	{
		displayName: 'Instruction',
		name: 'instruction',
		type: 'string',
		default: '',
		required: true,
		displayOptions: {
			show: showOnlyForObserve,
		},
		description: 'What to observe on the page',
		placeholder: 'e.g., Find all clickable navigation links',
		routing: {
			send: {
				type: 'body',
				property: 'instruction',
			},
		},
	},
	{
		displayName: 'Options',
		name: 'observeOptions',
		type: 'collection',
		placeholder: 'Add Option',
		default: {},
		displayOptions: {
			show: showOnlyForObserve,
		},
		options: [
			{
				displayName: 'Model',
				name: 'model',
				type: 'options',
				options: [
					{ name: 'Claude 4.5 Opus (Anthropic)', value: 'anthropic/claude-opus-4-5-20251101' },
					{ name: 'Claude 4.5 Sonnet (Anthropic)', value: 'anthropic/claude-sonnet-4-5-20250929' },
					{ name: 'Gemini 3 Flash (Google)', value: 'google/gemini-3-flash-preview' },
					{ name: 'Gemini 3 Pro (Google)', value: 'google/gemini-3-pro-preview' },
					{ name: 'GPT-4.1 (OpenAI)', value: 'openai/gpt-4.1' },
					{ name: 'GPT-4o (OpenAI)', value: 'openai/gpt-4o' },
					{ name: 'GPT-4o Mini (OpenAI)', value: 'openai/gpt-4o-mini' },
				],
				default: 'openai/gpt-4o',
				description: 'Override the model for this observation',
				routing: {
					send: {
						type: 'body',
						property: 'options.model',
					},
				},
			},
			{
				displayName: 'Timeout',
				name: 'timeout',
				type: 'number',
				default: 30000,
				description: 'Observation timeout in milliseconds',
				routing: {
					send: {
						type: 'body',
						property: 'options.timeout',
					},
				},
			},
			{
				displayName: 'Selector',
				name: 'selector',
				type: 'string',
				default: '',
				description: 'CSS selector to scope the observation',
				placeholder: 'e.g., nav, #main-content',
				routing: {
					send: {
						type: 'body',
						property: 'options.selector',
					},
				},
			},
		],
	},
];
