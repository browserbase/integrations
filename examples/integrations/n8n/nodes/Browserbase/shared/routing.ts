/**
 * Shared output configuration that injects sessionId into the response.
 * This ensures sessionId is always available for chaining to the next node.
 *
 * For Start Session: extracts from response.body.data.sessionId
 * For other operations: passes through from $parameter.sessionId
 */

// For operations that receive sessionId as a parameter - pass it through to output
export const sessionIdPassthrough = {
	postReceive: [
		{
			type: 'setKeyValue' as const,
			properties: {
				key: 'sessionId',
				value: '={{$parameter.sessionId}}',
			},
		},
	],
};

// For Start Session - extract sessionId from nested response and flatten
export const sessionIdFromResponse = {
	postReceive: [
		{
			type: 'setKeyValue' as const,
			properties: {
				key: 'sessionId',
				value: '={{$response.body.data?.sessionId ?? $response.body.sessionId ?? $response.body.id}}',
			},
		},
	],
};
