import type { INodeProperties } from 'n8n-workflow';

const showOnlyForAgentExecute = {
	resource: ['ai'],
	operation: ['agentExecute'],
};

export const agentExecuteDescription: INodeProperties[] = [
	{
		displayName: 'Session ID',
		name: 'sessionId',
		type: 'string',
		default: '={{ $json.value }}',
		required: true,
		displayOptions: {
			show: showOnlyForAgentExecute,
		},
		description: 'The session ID from Start Session (auto-filled from previous node)',
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
		displayOptions: {
			show: showOnlyForAgentExecute,
		},
		description: 'The task for the agent to complete',
		placeholder: "e.g., Log in with username 'demo' and password 'test123', then navigate to settings",
		routing: {
			send: {
				type: 'body',
				property: 'executeOptions.instruction',
			},
		},
	},
	{
		displayName: 'Agent Configuration',
		name: 'agentConfig',
		type: 'collection',
		placeholder: 'Add Configuration',
		default: {},
		displayOptions: {
			show: showOnlyForAgentExecute,
		},
		options: [
			{
				displayName: 'Provider',
				name: 'provider',
				type: 'options',
				options: [
					{ name: 'Google', value: 'google' },
					{ name: 'OpenAI', value: 'openai' },
					{ name: 'Anthropic', value: 'anthropic' },
				],
				default: 'openai',
				description: 'AI provider for the agent',
				routing: {
					send: {
						type: 'body',
						property: 'agentConfig.provider',
					},
				},
			},
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
				description: 'Model for the agent',
				routing: {
					send: {
						type: 'body',
						property: 'agentConfig.model',
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
				description: 'Custom system prompt for the agent',
				routing: {
					send: {
						type: 'body',
						property: 'agentConfig.systemPrompt',
					},
				},
			},
			{
				displayName: 'CUA (Computer Use Agent)',
				name: 'cua',
				type: 'boolean',
				default: true,
				description: 'Whether to enable Computer Use Agent mode',
				routing: {
					send: {
						type: 'body',
						property: 'agentConfig.cua',
					},
				},
			},
		],
	},
	{
		displayName: 'Execution Options',
		name: 'executeOptions',
		type: 'collection',
		placeholder: 'Add Option',
		default: {},
		displayOptions: {
			show: showOnlyForAgentExecute,
		},
		options: [
			{
				displayName: 'Max Steps',
				name: 'maxSteps',
				type: 'number',
				default: 20,
				description: 'Maximum number of steps the agent can take',
				routing: {
					send: {
						type: 'body',
						property: 'executeOptions.maxSteps',
					},
				},
			},
			{
				displayName: 'Highlight Cursor',
				name: 'highlightCursor',
				type: 'boolean',
				default: true,
				description: 'Whether to highlight the cursor during execution',
				routing: {
					send: {
						type: 'body',
						property: 'executeOptions.highlightCursor',
					},
				},
			},
		],
	},
];
