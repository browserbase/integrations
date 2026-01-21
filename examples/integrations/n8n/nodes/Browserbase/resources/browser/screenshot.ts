import type { INodeProperties } from 'n8n-workflow';

const showOnlyForScreenshot = {
	resource: ['browser'],
	operation: ['screenshot'],
};

// Placeholder implementation - endpoint TBD
export const screenshotDescription: INodeProperties[] = [
	{
		displayName: 'Session ID',
		name: 'sessionId',
		type: 'string',
		default: '={{ $json.data.sessionId }}',
		required: true,
		displayOptions: {
			show: showOnlyForScreenshot,
		},
		description: 'The session ID from Start Session (auto-filled from previous node)',
	},
	{
		displayName: 'Options',
		name: 'screenshotOptions',
		type: 'collection',
		placeholder: 'Add Option',
		default: {},
		displayOptions: {
			show: showOnlyForScreenshot,
		},
		options: [
			{
				displayName: 'Full Page',
				name: 'fullPage',
				type: 'boolean',
				default: false,
				description: 'Whether to capture the full scrollable page',
				routing: {
					send: {
						type: 'body',
						property: 'fullPage',
					},
				},
			},
			{
				displayName: 'Format',
				name: 'format',
				type: 'options',
				options: [
					{ name: 'PNG', value: 'png' },
					{ name: 'JPEG', value: 'jpeg' },
				],
				default: 'png',
				description: 'Screenshot image format',
				routing: {
					send: {
						type: 'body',
						property: 'format',
					},
				},
			},
		],
	},
];
