import type {
	IAuthenticateGeneric,
	ICredentialTestRequest,
	ICredentialType,
	INodeProperties,
} from 'n8n-workflow';

export class BrowserbaseApi implements ICredentialType {
	name = 'browserbaseApi';

	displayName = 'Browserbase API';

	documentationUrl = 'https://docs.browserbase.com';

	icon = 'file:../icons/browserbase.svg' as const;

	properties: INodeProperties[] = [
		{
			displayName: 'Browserbase API Key',
			name: 'browserbaseApiKey',
			type: 'string',
			typeOptions: { password: true },
			default: '',
			required: true,
			description: 'Your Browserbase API key',
		},
		{
			displayName: 'Browserbase Project ID',
			name: 'browserbaseProjectId',
			type: 'string',
			default: '',
			required: true,
			description: 'Your Browserbase project ID',
		},
		{
			displayName: 'Model API Key',
			name: 'modelApiKey',
			type: 'string',
			typeOptions: { password: true },
			default: '',
			required: true,
			description: 'API key for the AI model (e.g., Gemini API key)',
		},
	];

	authenticate: IAuthenticateGeneric = {
		type: 'generic',
		properties: {
			headers: {
				'x-bb-api-key': '={{$credentials.browserbaseApiKey}}',
				'x-bb-project-id': '={{$credentials.browserbaseProjectId}}',
				'x-model-api-key': '={{$credentials.modelApiKey}}',
			},
		},
	};

	test: ICredentialTestRequest = {
		request: {
			baseURL: 'https://api.stagehand.browserbase.com',
			url: '/v1/sessions/start',
			method: 'POST',
			body: {
				modelName: 'openai/gpt-4o',
			},
		},
	};
}
