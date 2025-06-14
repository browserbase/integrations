import {
	IAuthenticateGeneric,
	ICredentialTestRequest,
	ICredentialType,
	INodeProperties,
} from 'n8n-workflow';

export class Browserbase implements ICredentialType {
	name = 'Browserbase';
	displayName = 'Browserbase';
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
			description:
				'The Project ID for your Browserbase project. You can find this in your Browserbase dashboard.',
		},
		{
			displayName: 'OpenAI API Key (Optional)',
			name: 'aiApiKey',
			type: 'string',
			typeOptions: {
				password: true,
			},
			default: '',
			required: false,
			description:
				'Default AI API key for Stagehand operations. OpenAI keys start with "sk-". Can be overridden per operation.',
		},
	];

	authenticate = {
		type: 'generic',
		properties: {
			headers: {
				'X-BB-API-Key': '={{$credentials.apiKey}}',
				'X-BB-Project-ID': '={{$credentials.projectId}}',
			},
		},
	} as IAuthenticateGeneric;

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
