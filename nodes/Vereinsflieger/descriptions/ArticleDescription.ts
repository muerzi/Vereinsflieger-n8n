import type { IDataObject, IExecuteFunctions, INodeProperties } from 'n8n-workflow';
import { NodeOperationError } from 'n8n-workflow';

import { vereinsfliegerApiRequest, type VereinsfliegerSession } from '../GenericFunctions';

export const articleOperations: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: {
			show: {
				resource: ['article'],
			},
		},
		options: [
			{
				name: 'Get Many',
				value: 'getAll',
				description: 'Get the full article list with prices (10.1 Artikelliste auslesen)',
				action: 'Get many articles',
			},
		],
		default: 'getAll',
	},
];

export const articleFields: INodeProperties[] = [];

export async function executeArticleOperation(
	this: IExecuteFunctions,
	operation: string,
	i: number,
	session: VereinsfliegerSession,
): Promise<IDataObject | IDataObject[]> {
	if (operation === 'getAll') {
		return (await vereinsfliegerApiRequest.call(
			this,
			session,
			'POST',
			'/interface/rest/articles/list',
		)) as IDataObject[];
	}

	throw new NodeOperationError(this.getNode(), `Unknown operation: "${operation}"`, {
		itemIndex: i,
	});
}
