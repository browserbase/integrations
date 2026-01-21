import type { INodeProperties } from 'n8n-workflow';
import { sessionStartDescription } from './start';
import { sessionEndDescription } from './end';

const showOnlyForSession = {
	resource: ['session'],
};

export const sessionDescription: INodeProperties[] = [
	{
		displayName: 'Start outputs sessionId which auto-fills into subsequent Browserbase nodes',
		name: 'sessionNotice',
		type: 'notice',
		displayOptions: {
			show: {
				resource: ['session'],
				operation: ['start'],
			},
		},
		default: '',
	},
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: {
			show: showOnlyForSession,
		},
		options: [
			{
				name: 'Start',
				value: 'start',
				action: 'Start a browser session',
				description: 'Start a new Browserbase session with Stagehand. Outputs sessionId for chaining.',
				routing: {
					request: {
						method: 'POST',
						url: '/v1/sessions/start',
						body: {
							streamResponse: false,
						},
					},
				},
			},
			{
				name: 'End',
				value: 'end',
				action: 'End a browser session',
				description: 'End an existing browser session',
				routing: {
					request: {
						method: 'POST',
						url: '=/v1/sessions/{{$parameter.sessionId}}/end',
						body: {
							streamResponse: false,
						},
					},
				},
			},
		],
		default: 'start',
	},
	...sessionStartDescription,
	...sessionEndDescription,
];
