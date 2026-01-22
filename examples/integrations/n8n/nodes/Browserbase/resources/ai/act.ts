import type { INodeProperties } from 'n8n-workflow';

const showOnlyForAct = {
	resource: ['ai'],
	operation: ['act'],
};

export const actDescription: INodeProperties[] = [
	{
		displayName: 'Session ID',
		name: 'sessionId',
		type: 'string',
		default: '={{ $json.value }}',
		required: true,
		displayOptions: {
			show: showOnlyForAct,
		},
		description: 'The session ID from Start Session (auto-filled from previous node)',
	},
	{
		displayName: 'Action',
		name: 'input',
		type: 'string',
		default: '',
		required: true,
		displayOptions: {
			show: showOnlyForAct,
		},
		placeholder: 'e.g., Click the login button',
		routing: {
			send: {
				type: 'body',
				property: 'input',
			},
		},
	},
	{
		displayName: 'Options',
		name: 'actOptions',
		type: 'collection',
		placeholder: 'Add Option',
		default: {},
		displayOptions: {
			show: showOnlyForAct,
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
				description: 'Override the model for this action',
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
				description: 'Action timeout in milliseconds',
				routing: {
					send: {
						type: 'body',
						property: 'options.timeout',
					},
				},
			},
			{
				displayName: 'Variables',
				name: 'variables',
				type: 'json',
				default: '{}',
				description: 'Variables to use in the action (JSON object)',
				placeholder: '{"username": "john_doe", "password": "secret"}',
				routing: {
					send: {
						type: 'body',
						property: 'options.variables',
						value: '={{ JSON.parse($value || "{}") }}',
					},
				},
			},
		],
	},
];
