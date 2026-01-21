import type { INodeProperties } from 'n8n-workflow';
import { actDescription } from './act';
import { observeDescription } from './observe';
import { extractDescription } from './extract';
import { agentExecuteDescription } from './agentExecute';

const showOnlyForAI = {
	resource: ['ai'],
};

export const aiDescription: INodeProperties[] = [
	{
		displayName: 'Requires a Session ID from a previous "Session → Start" node',
		name: 'aiRequiresSessionNotice',
		type: 'notice',
		displayOptions: {
			show: showOnlyForAI,
		},
		default: '',
	},
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: {
			show: showOnlyForAI,
		},
		options: [
			{
				name: 'Act',
				value: 'act',
				action: 'Perform an action',
				description: 'Perform a browser action using natural language',
				routing: {
					request: {
						method: 'POST',
						url: '=/v1/sessions/{{$parameter.sessionId}}/act',
						body: {
							streamResponse: false,
						},
					},
				},
			},
			{
				name: 'Observe',
				value: 'observe',
				action: 'Observe the page',
				description: 'Observe elements on the page based on instructions',
				routing: {
					request: {
						method: 'POST',
						url: '=/v1/sessions/{{$parameter.sessionId}}/observe',
						body: {
							streamResponse: false,
						},
					},
				},
			},
			{
				name: 'Extract',
				value: 'extract',
				action: 'Extract data',
				description: 'Extract structured data from the page',
				routing: {
					request: {
						method: 'POST',
						url: '=/v1/sessions/{{$parameter.sessionId}}/extract',
						body: {
							streamResponse: false,
						},
					},
				},
			},
			{
				name: 'Agent Execute',
				value: 'agentExecute',
				action: 'Execute agent task',
				description: 'Execute a multi-step task using an AI agent',
				routing: {
					request: {
						method: 'POST',
						url: '=/v1/sessions/{{$parameter.sessionId}}/agentExecute',
						body: {
							streamResponse: false,
						},
					},
				},
			},
		],
		default: 'act',
	},
	...actDescription,
	...observeDescription,
	...extractDescription,
	...agentExecuteDescription,
];
