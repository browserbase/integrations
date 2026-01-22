import type { INodeProperties } from 'n8n-workflow';

const showOnlyForExtract = {
	resource: ['ai'],
	operation: ['extract'],
};

export const extractDescription: INodeProperties[] = [
	{
		displayName: 'Session ID',
		name: 'sessionId',
		type: 'string',
		default: '={{ $json.value }}',
		required: true,
		displayOptions: {
			show: showOnlyForExtract,
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
			show: showOnlyForExtract,
		},
		description: 'What to extract from the page',
		placeholder: 'e.g., Extract all product names and prices from the page',
		routing: {
			send: {
				type: 'body',
				property: 'instruction',
			},
		},
	},
	{
		displayName: 'Schema',
		name: 'schema',
		type: 'json',
		default: '{}',
		required: true,
		displayOptions: {
			show: showOnlyForExtract,
		},
		description: 'JSON schema defining the structure of extracted data',
		placeholder: '{"type": "object", "properties": {"title": {"type": "string"}}}',
		routing: {
			send: {
				type: 'body',
				property: 'schema',
				value: '={{ JSON.parse($value || "{}") }}',
			},
		},
	},
	{
		displayName: 'Options',
		name: 'extractOptions',
		type: 'collection',
		placeholder: 'Add Option',
		default: {},
		displayOptions: {
			show: showOnlyForExtract,
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
				description: 'Override the model for this extraction',
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
				description: 'Extraction timeout in milliseconds',
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
				description: 'CSS selector to scope the extraction',
				placeholder: 'e.g., #main-content, .product-list',
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
