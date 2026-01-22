import type { INodeProperties } from 'n8n-workflow';

const showOnlyForSessionEnd = {
	resource: ['session'],
	operation: ['end'],
};

export const sessionEndDescription: INodeProperties[] = [
	{
		displayName: 'Session ID',
		name: 'sessionId',
		type: 'string',
		default: '={{ $json.value }}',
		required: true,
		displayOptions: {
			show: showOnlyForSessionEnd,
		},
		description: 'The session ID to end (auto-filled from previous node)',
	},
];
