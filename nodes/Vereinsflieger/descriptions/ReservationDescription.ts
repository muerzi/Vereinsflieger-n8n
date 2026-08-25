import type { IDataObject, IExecuteFunctions, INodeProperties } from 'n8n-workflow';
import { NodeOperationError } from 'n8n-workflow';

import { vereinsfliegerApiRequest, type VereinsfliegerSession } from '../GenericFunctions';

export const reservationOperations: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: {
			show: {
				resource: ['reservation'],
			},
		},
		options: [
			{
				name: 'Get Many',
				value: 'getAll',
				description: 'Get all currently active reservations (6.1 Aktuelle Reservierungen auslesen)',
				action: 'Get many reservations',
			},
		],
		default: 'getAll',
	},
];

export const reservationFields: INodeProperties[] = [];

export async function executeReservationOperation(
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
			'/interface/rest/reservation/list/active',
		)) as IDataObject[];
	}

	throw new NodeOperationError(this.getNode(), `Unknown operation: "${operation}"`, {
		itemIndex: i,
	});
}
