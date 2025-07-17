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
			},
			{
				name: 'Get Sessions',
				value: 'getSessions',
				description: 'List all browser sessions',
				action: 'Get all browser sessions',
			},
			{
				name: 'Get Session',
				value: 'getSession',
				description: 'Get details of a specific session',
				action: 'Get session details',
			},
			{
				name: 'Close Session',
				value: 'closeSession',
				description: 'Close a browser session (automatically uses previous node\'s session)',
				action: 'Close a browser session',
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
					{
						displayName: 'Fingerprint',
						name: 'fingerprint',
						type: 'boolean',
						default: false,
						routing: {
							send: {
								property: 'fingerprint',
								type: 'body',
							},
						},
						description: 'Whether to use fingerprinting',
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
				operation: ['getSession'],
			},
		},
	},
];

// Options for Get Sessions operation
const getSessionsOptions: INodeProperties[] = [
	{
		displayName: 'Options',
		name: 'options',
		type: 'collection',
		placeholder: 'Add Option',
		default: {},
		displayOptions: {
			show: {
				resource: ['browserSession'],
				operation: ['getSessions'],
			},
		},
		options: [
			{
				displayName: 'Simplify',
				name: 'simplify',
				type: 'boolean',
				default: false,
				description: 'Whether to return a simplified version of the response instead of the raw data',
			},
		],
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
				name: 'Act',
				value: 'act',
				description: 'Perform an action on the page using natural language (requires OpenAI API key)',
				action: 'Act on page',
			},
			{
				name: 'Extract',
				value: 'extract',
				description: 'Extract structured data from the page (requires OpenAI API key)',
				action: 'Extract data',
			},
			{
				name: 'Navigate',
				value: 'navigate',
				description: 'Navigate to a URL',
				action: 'Navigate to URL',
			},
			{
				name: 'Observe',
				value: 'observe',
				description: 'Observe the page and get available actions (requires OpenAI API key)',
				action: 'Observe page',
			},
			{
				name: 'Screenshot',
				value: 'screenshot',
				description: 'Take a screenshot of the page',
				action: 'Take screenshot',
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
				description: 'CSS selector for element to screenshot (optional)',
			},
		],
	},
	{
		displayName: 'Action',
		name: 'action',
		type: 'string',
		required: true,
		default: '',
		placeholder: 'Click the login button',
		typeOptions: {
			rows: 3,
		},
		displayOptions: {
			show: {
				resource: ['browserAction'],
				operation: ['act'],
			},
		},
	},
	{
		displayName: 'Instruction',
		name: 'instruction',
		type: 'string',
		required: true,
		default: '',
		placeholder: 'Find all clickable buttons on the page',
		description: 'Instruction for what to observe on the page',
		typeOptions: {
			rows: 3,
		},
		displayOptions: {
			show: {
				resource: ['browserAction'],
				operation: ['observe'],
			},
		},
	},
	{
		displayName: 'Return Actions',
		name: 'returnActions',
		type: 'boolean',
		default: false,
		description: 'Whether to return actionable elements that can be used with the act operation',
		displayOptions: {
			show: {
				resource: ['browserAction'],
				operation: ['observe'],
			},
		},
	},
	{
		displayName: 'Instruction',
		name: 'instruction',
		type: 'string',
		required: true,
		default: '',
		placeholder: 'Extract all product information from this page',
		description: 'Instruction for what data to extract from the page',
		typeOptions: {
			rows: 3,
		},
		displayOptions: {
			show: {
				resource: ['browserAction'],
				operation: ['extract'],
			},
		},
	},
	{
		displayName: 'Schema (JSON)',
		name: 'schema',
		type: 'json',
		required: true,
		default: '{\n  "type": "object",\n  "properties": {\n    "title": {\n      "type": "string",\n      "description": "Page title"\n    }\n  },\n  "required": ["title"]\n}',
		description: 'JSON Schema defining the structure of data to extract. Use Zod-compatible schema format.',
		typeOptions: {
			rows: 10,
		},
		displayOptions: {
			show: {
				resource: ['browserAction'],
				operation: ['extract'],
			},
		},
	},
];

export const browserFields: INodeProperties[] = [
	/* -------------------------------------------------------------------------- */
	/*                            browserSession operations                       */
	/* -------------------------------------------------------------------------- */
	...createSessionOperation,
	...getSessionOperation,
	...getSessionsOptions,

	/* -------------------------------------------------------------------------- */
	/*                            browserAction operations                        */
	/* -------------------------------------------------------------------------- */
	...browserActionFields,
]; 