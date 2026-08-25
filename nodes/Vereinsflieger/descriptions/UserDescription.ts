import type { IDataObject, IExecuteFunctions, INodeProperties } from 'n8n-workflow';
import { NodeOperationError } from 'n8n-workflow';

import { vereinsfliegerApiRequest, type VereinsfliegerSession } from '../GenericFunctions';

export const userOperations: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: {
			show: {
				resource: ['user'],
			},
		},
		options: [
			{
				name: 'Get',
				value: 'get',
				description: 'Get the currently authenticated user (2.4 Benutzerinformationen)',
				action: 'Get the current user',
			},
		],
		default: 'get',
	},
];

export const userFields: INodeProperties[] = [];

export async function executeUserOperation(
	this: IExecuteFunctions,
	operation: string,
	i: number,
	session: VereinsfliegerSession,
): Promise<IDataObject | IDataObject[]> {
	if (operation === 'get') {
		return (await vereinsfliegerApiRequest.call(
			this,
			session,
			'POST',
			'/interface/rest/auth/getuser',
		)) as IDataObject;
	}

	throw new NodeOperationError(this.getNode(), `Unknown operation: "${operation}"`, {
		itemIndex: i,
	});
}
