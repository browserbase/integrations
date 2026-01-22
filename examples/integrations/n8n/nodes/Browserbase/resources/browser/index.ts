import type { INodeProperties } from 'n8n-workflow';
import { navigateDescription } from './navigate';
import { screenshotDescription } from './screenshot';
import { sessionIdPassthrough } from '../../shared/routing';

const showOnlyForBrowser = {
	resource: ['browser'],
};

export const browserDescription: INodeProperties[] = [
	{
		displayName: 'Requires a Session ID from a previous "Session → Start" node',
		name: 'browserRequiresSessionNotice',
		type: 'notice',
		displayOptions: {
			show: showOnlyForBrowser,
		},
		default: '',
	},
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: {
			show: showOnlyForBrowser,
		},
		options: [
			{
				name: 'Navigate',
				value: 'navigate',
				action: 'Navigate to a URL',
				description: 'Navigate the browser to a specific URL',
				routing: {
					request: {
						method: 'POST',
						url: '=/v1/sessions/{{$parameter.sessionId}}/navigate',
						body: {
							streamResponse: false,
						},
					},
					output: sessionIdPassthrough,
				},
			},
			{
				name: 'Screenshot',
				value: 'screenshot',
				action: 'Take a screenshot',
				description: 'Capture a screenshot of the current page',
				routing: {
					request: {
						method: 'POST',
						url: '=/v1/sessions/{{$parameter.sessionId}}/screenshot',
						body: {
							streamResponse: false,
						},
					},
					output: sessionIdPassthrough,
				},
			},
		],
		default: 'navigate',
	},
	...navigateDescription,
	...screenshotDescription,
];
