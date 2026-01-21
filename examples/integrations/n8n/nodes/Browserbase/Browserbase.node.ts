import { NodeConnectionTypes, type INodeType, type INodeTypeDescription } from 'n8n-workflow';
import { sessionDescription } from './resources/session';
import { browserDescription } from './resources/browser';
import { aiDescription } from './resources/ai';

export class Browserbase implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Browserbase',
		name: 'browserbase',
		icon: 'file:../../icons/browserbase.svg',
		group: ['transform'],
		version: 1,
		subtitle: '={{$parameter["operation"] + ": " + $parameter["resource"]}}',
		description: 'Browser automation powered by Stagehand. Start with Session → Start, then chain Navigate, Act, Extract, etc.',
		defaults: {
			name: 'Browserbase',
		},
		inputs: [NodeConnectionTypes.Main],
		outputs: [NodeConnectionTypes.Main],
		usableAsTool: true,
		credentials: [
			{
				name: 'browserbaseApi',
				required: true,
			},
		],
		requestDefaults: {
			baseURL: 'https://api.stagehand.browserbase.com',
			headers: {
				Accept: 'application/json',
				'Content-Type': 'application/json',
			},
		},
		properties: [
			{
				displayName:
					'Chain these nodes: Start Session → Navigate/Act/Extract → End Session. Session ID passes automatically between nodes.',
				name: 'workflowNotice',
				type: 'notice',
				default: '',
			},
			{
				displayName: 'Resource',
				name: 'resource',
				type: 'options',
				noDataExpression: true,
				options: [
					{
						name: 'Session',
						value: 'session',
						description: 'Manage browser sessions (start here!)',
					},
					{
						name: 'Browser',
						value: 'browser',
						description: 'Browser navigation and screenshots (requires session)',
					},
					{
						name: 'AI',
						value: 'ai',
						description: 'AI-powered browser actions (requires session)',
					},
				],
				default: 'session',
			},
			...sessionDescription,
			...browserDescription,
			...aiDescription,
		],
	};
}
