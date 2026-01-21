import type { INodeProperties } from 'n8n-workflow';

export const sessionIdField: INodeProperties = {
	displayName: 'Session ID',
	name: 'sessionId',
	type: 'string',
	default: '',
	required: true,
	description: 'The session ID returned from Start Session operation',
	placeholder: 'e.g., ={{ $json.sessionId }}',
};

export const modelNameField: INodeProperties = {
	displayName: 'Model',
	name: 'modelName',
	type: 'options',
	options: [
		{
			name: 'Claude 4.5 Opus (Anthropic)',
			value: 'anthropic/claude-opus-4-5-20251101',
		},
		{
			name: 'Claude 4.5 Sonnet (Anthropic)',
			value: 'anthropic/claude-sonnet-4-5-20250929',
		},
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
	],
	default: 'openai/gpt-4o',
	description: 'The AI model to use for browser automation',
};

export const timeoutField: INodeProperties = {
	displayName: 'Timeout',
	name: 'timeout',
	type: 'number',
	default: 30000,
	description: 'Request timeout in milliseconds',
};
