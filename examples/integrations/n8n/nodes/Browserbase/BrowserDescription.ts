import { INodeProperties } from 'n8n-workflow';

// When the resource `browserSession` is selected, this `operation` parameter will be shown.
export const browserOperations: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: {
			show: {
				resource: ['browserSession'],
			},
		},
		options: [
			{
				name: 'Create Session',
				value: 'createSession',
				description: 'Create a new browser session',
				action: 'Create a new browser session',
				routing: {
					request: {
						method: 'POST',
						url: '/sessions',
						body: {
							projectId: '={{$credentials.projectId}}',
						},
					},
					output: {
						postReceive: [
							{
								type: 'set',
								properties: {
									value: '={{ { ...($response.body), sessionId: $response.body.id } }}',
								},
							},
						],
					},
				},
			},
			{
				name: 'Get Sessions',
				value: 'getSessions',
				description: 'List all browser sessions',
				action: 'Get all browser sessions',
				routing: {
					request: {
						method: 'GET',
						url: '/sessions',
					},
				},
			},
			{
				name: 'Get Session',
				value: 'getSession',
				description: 'Get details of a specific session',
				action: 'Get session details',
				routing: {
					request: {
						method: 'GET',
						url: '=/sessions/{{$parameter.sessionId}}',
					},
				},
			},
			{
				name: 'Delete Session',
				value: 'deleteSession',
				description: 'Delete a browser session',
				action: 'Delete a browser session',
				routing: {
					request: {
						method: 'DELETE',
						url: '=/sessions/{{$parameter.sessionId}}',
					},
				},
			},
		],
		default: 'createSession',
	},
];

// Create Session operation fields
const createSessionOperation: INodeProperties[] = [
	{
		displayName: 'Session Configuration',
		name: 'sessionConfig',
		default: {},
		description: 'Configuration for the browser session',
		displayOptions: {
			show: {
				resource: ['browserSession'],
				operation: ['createSession'],
			},
		},
		options: [
			{
				name: 'config',
				displayName: 'Config',
				values: [
					{
						displayName: 'Keep Alive',
						name: 'keepAlive',
						type: 'boolean',
						default: false,
						routing: {
							send: {
								property: 'keepAlive',
								type: 'body',
							},
						},
						description: 'Whether to keep the session alive',
					},
					{
						displayName: 'Browser Settings',
						name: 'browserSettings',
						type: 'collection',
						placeholder: 'Add Browser Setting',
						default: {},
						options: [
							{
								displayName: 'Viewport Width',
								name: 'viewportWidth',
								type: 'number',
								default: 1200,
								description: 'Browser viewport width',
							},
							{
								displayName: 'Viewport Height',
								name: 'viewportHeight',
								type: 'number',
								default: 800,
								description: 'Browser viewport height',
							},
						],
						routing: {
							send: {
								property: 'browserSettings',
								type: 'body',
							},
						},
					},
					{
						displayName: 'Proxies',
						name: 'proxies',
						type: 'boolean',
						default: false,
						routing: {
							send: {
								property: 'proxies',
								type: 'body',
							},
						},
						description: 'Whether to use proxies',
					},
				],
			},
		],
		type: 'fixedCollection',
		typeOptions: {
			multipleValues: false,
		},
	},
];

// Get Session operation fields
const getSessionOperation: INodeProperties[] = [
	{
		displayName: 'Session ID',
		name: 'sessionId',
		type: 'string',
		required: true,
		default: '',
		placeholder: 'ses_1234567890',
		description: 'The ID of the session to retrieve',
		displayOptions: {
			show: {
				resource: ['browserSession'],
				operation: ['getSession', 'deleteSession'],
			},
		},
	},
];

// Browser Actions resource operations
export const browserActionOperations: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: {
			show: {
				resource: ['browserAction'],
			},
		},
		options: [
			{
				name: 'Navigate',
				value: 'navigate',
				description: 'Navigate to a URL',
				action: 'Navigate to a URL',
			},
			{
				name: 'Stagehand Act (AI)',
				value: 'act',
				description: 'Use AI to perform actions with natural language',
				action: 'Stagehand AI action',
			},
			{
				name: 'Stagehand Observe (AI)',
				value: 'observe',
				description: 'Use AI to observe and plan actions before executing',
				action: 'Stagehand AI observe',
			},
			{
				name: 'Stagehand Extract (AI)',
				value: 'extract',
				description: 'Use AI to extract structured data from the page',
				action: 'Stagehand AI extract',
			},
			{
				name: 'Take Screenshot',
				value: 'screenshot',
				description: 'Take a screenshot',
				action: 'Take a screenshot',
			},
			{
				name: 'Get Page Content',
				value: 'getContent',
				description: 'Get page content',
				action: 'Get page content',
			},
			{
				name: 'Click Element',
				value: 'click',
				description: 'Click on an element',
				action: 'Click element',
			},
			{
				name: 'Type Text',
				value: 'type',
				description: 'Type text into an element',
				action: 'Type text',
			},
		],
		default: 'navigate',
	},
];

// Browser Action operation fields
const browserActionFields: INodeProperties[] = [
	{
		displayName: 'Session Source',
		name: 'sessionSource',
		type: 'options',
		options: [
			{
				name: 'Use Previous Session',
				value: 'previous',
				description: 'Automatically use session from previous node',
			},
			{
				name: 'Specify Session ID',
				value: 'manual',
				description: 'Manually enter a session ID',
			},
		],
		default: 'previous',
		displayOptions: {
			show: {
				resource: ['browserAction'],
			},
		},
	},
	{
		displayName: 'Session ID',
		name: 'sessionId',
		type: 'string',
		required: true,
		default: '',
		placeholder: 'ses_1234567890',
		description: 'The ID of the browser session to use',
		displayOptions: {
			show: {
				resource: ['browserAction'],
				sessionSource: ['manual'],
			},
		},
	},
	{
		displayName: 'URL',
		name: 'url',
		type: 'string',
		required: true,
		default: '',
		placeholder: 'https://example.com',
		description: 'The URL to navigate to',
		displayOptions: {
			show: {
				resource: ['browserAction'],
				operation: ['navigate'],
			},
		},
	},
	{
		displayName: 'Selector',
		name: 'selector',
		type: 'string',
		default: '',
		placeholder: '.my-element, #button, input[name="username"]',
		description: 'CSS selector for the element',
		displayOptions: {
			show: {
				resource: ['browserAction'],
				operation: ['click', 'type', 'getContent'],
			},
		},
	},
	{
		displayName: 'Text',
		name: 'text',
		type: 'string',
		required: true,
		default: '',
		description: 'The text to type',
		displayOptions: {
			show: {
				resource: ['browserAction'],
				operation: ['type'],
			},
		},
	},
	{
		displayName: 'Instructions',
		name: 'instructions',
		type: 'string',
		required: true,
		default: '',
		placeholder: 'Click the login button',
		description: 'Natural language instructions for the AI to execute',
		displayOptions: {
			show: {
				resource: ['browserAction'],
				operation: ['act'],
			},
		},
	},
	{
		displayName: 'Instructions',
		name: 'instructions',
		type: 'string',
		required: true,
		default: '',
		placeholder: 'What actions can I take on this page?',
		description: 'Natural language instructions for the AI to observe',
		displayOptions: {
			show: {
				resource: ['browserAction'],
				operation: ['observe'],
			},
		},
	},
	{
		displayName: 'Instructions',
		name: 'instructions',
		type: 'string',
		required: true,
		default: '',
		placeholder: 'Extract the product name and price from this page',
		description: 'Natural language instructions for what to extract',
		displayOptions: {
			show: {
				resource: ['browserAction'],
				operation: ['extract'],
			},
		},
	},
	{
		displayName: 'Schema (Zod)',
		name: 'schema',
		type: 'json',
		required: true,
		default: '{\n  "name": "z.string()",\n  "price": "z.number()"\n}',
		description: 'Zod schema definition for the data to extract (object fields only, z.object wrapper added automatically)',
		displayOptions: {
			show: {
				resource: ['browserAction'],
				operation: ['extract'],
			},
		},
		typeOptions: {
			editor: 'codeNodeEditor',
			editorLanguage: 'json',
		},
	},
	{
		displayName: 'AI Options',
		name: 'aiOptions',
		type: 'collection',
		placeholder: 'Add Option',
		default: {},
		displayOptions: {
			show: {
				resource: ['browserAction'],
				operation: ['act', 'observe', 'extract'],
			},
		},
		options: [
			{
				displayName: 'Model Provider',
				name: 'modelName',
				type: 'options',
				options: [
					{
						name: 'OpenAI GPT-4o',
						value: 'gpt-4o',
						description: 'OpenAI GPT-4o (recommended)',
					},
					{
						name: 'OpenAI GPT-4o Mini',
						value: 'gpt-4o-mini',
						description: 'OpenAI GPT-4o Mini (faster, less accurate)',
					},
					{
						name: 'Anthropic Claude 3.5 Sonnet',
						value: 'claude-3-5-sonnet-20241022',
						description: 'Anthropic Claude 3.5 Sonnet',
					},
					{
						name: 'Anthropic Claude 3.5 Sonnet Latest',
						value: 'claude-3-5-sonnet-latest',
						description: 'Anthropic Claude 3.5 Sonnet (Latest)',
					},
				],
				default: 'gpt-4o',
				description: 'AI model to use for the operation',
			},
			{
				displayName: 'AI API Key',
				name: 'apiKey',
				type: 'string',
				typeOptions: { password: true },
				default: '',
				placeholder: 'sk-... or sk-ant-...',
				description:
					'API key for the AI model (OpenAI starts with sk-, Anthropic starts with sk-ant-). If not provided, will use the key from credentials.',
			},
		],
	},
	{
		displayName: 'Screenshot Options',
		name: 'screenshotOptions',
		type: 'collection',
		placeholder: 'Add Option',
		default: {},
		displayOptions: {
			show: {
				resource: ['browserAction'],
				operation: ['screenshot'],
			},
		},
		options: [
			{
				displayName: 'Full Page',
				name: 'fullPage',
				type: 'boolean',
				default: false,
				description: 'Whether to capture the full page',
			},
			{
				displayName: 'Element Selector',
				name: 'selector',
				type: 'string',
				default: '',
				placeholder: '.screenshot-area',
				description: 'CSS selector for element to screenshot',
			},
		],
	},
];

export const browserFields: INodeProperties[] = [
	/* -------------------------------------------------------------------------- */
	/*                            browserSession operations                       */
	/* -------------------------------------------------------------------------- */
	...createSessionOperation,
	...getSessionOperation,

	/* -------------------------------------------------------------------------- */
	/*                            browserAction operations                        */
	/* -------------------------------------------------------------------------- */
	...browserActionFields,
];
