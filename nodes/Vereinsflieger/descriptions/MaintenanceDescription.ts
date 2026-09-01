import type { IDataObject, IExecuteFunctions, INodeProperties } from 'n8n-workflow';
import { NodeOperationError } from 'n8n-workflow';

import { vereinsfliegerApiRequest, type VereinsfliegerSession } from '../GenericFunctions';

export const maintenanceOperations: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: {
			show: {
				resource: ['maintenance'],
			},
		},
		options: [
			{
				name: 'Get',
				value: 'get',
				description:
					"Get an aircraft's current airframe times (7.1 Aktuelle Zellenzeiten eines LFZs auslesen)",
				action: "Get an aircraft's airframe times",
			},
		],
		default: 'get',
	},
];

export const maintenanceFields: INodeProperties[] = [
	{
		displayName: 'Callsign',
		name: 'callsign',
		type: 'string',
		required: true,
		default: '',
		displayOptions: {
			show: {
				resource: ['maintenance'],
				operation: ['get'],
			},
		},
		description: 'Registration / callsign of the aircraft',
	},
];

export async function executeMaintenanceOperation(
	this: IExecuteFunctions,
	operation: string,
	i: number,
	session: VereinsfliegerSession,
): Promise<IDataObject | IDataObject[]> {
	if (operation === 'get') {
		const callsign = this.getNodeParameter('callsign', i) as string;
		return (await vereinsfliegerApiRequest.call(
			this,
			session,
			'POST',
			`/interface/rest/maintenance/airplane/${encodeURIComponent(callsign)}`,
			{ callsign },
		)) as IDataObject;
	}

	throw new NodeOperationError(this.getNode(), `Unknown operation: "${operation}"`, {
		itemIndex: i,
	});
}
