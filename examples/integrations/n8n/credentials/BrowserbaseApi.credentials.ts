import {
	IAuthenticateGeneric,
	ICredentialTestRequest,
	ICredentialType,
	INodeProperties,
} from 'n8n-workflow';

export class BrowserbaseApi implements ICredentialType {
	name = 'browserbaseApi';
	displayName = 'Browserbase API';
	documentationUrl = 'https://docs.browserbase.com/';
	properties: INodeProperties[] = [
		{
			displayName: 'Browserbase API Key',
			name: 'apiKey',
			type: 'string',
			typeOptions: {
				password: true,
			},
			default: '',
			required: true,
			description: 'The API key for Browserbase. You can find this in your Browserbase dashboard.',
		},
		{
			displayName: 'Browserbase Project ID',
			name: 'projectId',
			type: 'string',
			default: '',
			required: true,
			description: 'The Project ID for your Browserbase project. You can find this in your Browserbase dashboard.',
		},
		{
			displayName: 'OpenAI API Key',
			name: 'openaiApiKey',
			type: 'string',
			typeOptions: {
				password: true,
			},
			default: '',
			required: true,
			description: 'The OpenAI API key required for AI operations (act, observe, extract). You can get this from your OpenAI dashboard.',
		},
	];

	authenticate: IAuthenticateGeneric = {
		type: 'generic',
		properties: {
			headers: {
				'X-BB-API-Key': '={{$credentials.apiKey}}',
				'X-BB-Project-ID': '={{$credentials.projectId}}',
			},
		},
	};

	test: ICredentialTestRequest = {
		request: {
			baseURL: 'https://api.browserbase.com/v1',
			url: '/sessions',
			method: 'GET',
            headers: {
                'X-BB-API-Key': '={{$credentials.apiKey}}',
            },
		},
	};
}