import type { INodeProperties } from 'n8n-workflow';

const showOnlyForNavigate = {
	resource: ['browser'],
	operation: ['navigate'],
};

export const navigateDescription: INodeProperties[] = [
	{
		displayName: 'Session ID',
		name: 'sessionId',
		type: 'string',
		default: '={{ $json.value }}',
		required: true,
		displayOptions: {
			show: showOnlyForNavigate,
		},
		description: 'The session ID from Start Session (auto-filled from previous node)',
	},
	{
		displayName: 'URL',
		name: 'url',
		type: 'string',
		default: '',
		required: true,
		displayOptions: {
			show: showOnlyForNavigate,
		},
		description: 'The URL to navigate to',
		placeholder: 'e.g., https://example.com',
		routing: {
			send: {
				type: 'body',
				property: 'url',
			},
		},
	},
	{
		displayName: 'Wait Until',
		name: 'waitUntil',
		type: 'options',
		displayOptions: {
			show: showOnlyForNavigate,
		},
		options: [
			{
				name: 'Network Idle',
				value: 'networkidle',
				description: 'Wait until network is idle',
			},
			{
				name: 'Load',
				value: 'load',
				description: 'Wait until load event is fired',
			},
			{
				name: 'DOM Content Loaded',
				value: 'domcontentloaded',
				description: 'Wait until DOMContentLoaded event is fired',
			},
			{
				name: 'Commit',
				value: 'commit',
				description: 'Wait until response is received',
			},
		],
		default: 'networkidle',
		description: 'When to consider navigation as complete',
		routing: {
			send: {
				type: 'body',
				property: 'options.waitUntil',
			},
		},
	},
	{
		displayName: 'Additional Options',
		name: 'additionalOptions',
		type: 'collection',
		placeholder: 'Add Option',
		default: {},
		displayOptions: {
			show: showOnlyForNavigate,
		},
		options: [
			{
				displayName: 'Timeout',
				name: 'timeout',
				type: 'number',
				default: 30000,
				description: 'Navigation timeout in milliseconds',
				routing: {
					send: {
						type: 'body',
						property: 'options.timeout',
					},
				},
			},
			{
				displayName: 'Referer',
				name: 'referer',
				type: 'string',
				default: '',
				description: 'Referer header value',
				routing: {
					send: {
						type: 'body',
						property: 'options.referer',
					},
				},
			},
			{
				displayName: 'Frame ID',
				name: 'frameId',
				type: 'string',
				default: '',
				description: 'Target frame ID for navigation',
				routing: {
					send: {
						type: 'body',
						property: 'frameId',
					},
				},
			},
		],
	},
];
