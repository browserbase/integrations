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
				name: 'Delete Session',
				value: 'deleteSession',
				description: 'Delete a browser session',
				action: 'Delete a browser session',
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