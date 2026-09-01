import type { IDataObject, IExecuteFunctions, INodeProperties } from 'n8n-workflow';
import { NodeOperationError } from 'n8n-workflow';

import {
	toItemArray,
	vereinsfliegerApiRequest,
	type VereinsfliegerSession,
} from '../GenericFunctions';

export const memberOperations: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: {
			show: {
				resource: ['member'],
			},
		},
		options: [
			{
				name: 'Get Many',
				value: 'getAll',
				description: 'Get the full member list (5.1 Auslesen der Mitgliederliste)',
				action: 'Get many members',
			},
		],
		default: 'getAll',
	},
];

export const memberFields: INodeProperties[] = [
	{
		displayName:
			'This operation requires the "Edit member data" (Mitgliederdaten bearbeiten) permission for the authenticated Vereinsflieger user.',
		name: 'memberPermissionNotice',
		type: 'notice',
		default: '',
		displayOptions: {
			show: {
				resource: ['member'],
				operation: ['getAll'],
			},
		},
	},
];

export async function executeMemberOperation(
	this: IExecuteFunctions,
	operation: string,
	i: number,
	session: VereinsfliegerSession,
): Promise<IDataObject | IDataObject[]> {
	if (operation === 'getAll') {
		return toItemArray(
			await vereinsfliegerApiRequest.call(this, session, 'POST', '/interface/rest/user/list'),
		);
	}

	throw new NodeOperationError(this.getNode(), `Unknown operation: "${operation}"`, {
		itemIndex: i,
	});
}
