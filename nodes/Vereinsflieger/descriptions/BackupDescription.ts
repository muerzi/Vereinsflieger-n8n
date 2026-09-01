import type { IExecuteFunctions, INodeExecutionData, INodeProperties } from 'n8n-workflow';
import { NodeOperationError } from 'n8n-workflow';

import { vereinsfliegerBinaryApiRequest, type VereinsfliegerSession } from '../GenericFunctions';

export const backupOperations: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: {
			show: {
				resource: ['backup'],
			},
		},
		options: [
			{
				name: 'Download',
				value: 'download',
				description:
					'Download the club data backup as a zip file (11.1 Datensicherungsdatei abrufen)',
				action: 'Download the data backup',
			},
		],
		default: 'download',
	},
];

export const backupFields: INodeProperties[] = [
	{
		displayName: 'Binary Property',
		name: 'binaryPropertyName',
		type: 'string',
		default: 'data',
		displayOptions: {
			show: {
				resource: ['backup'],
				operation: ['download'],
			},
		},
		description: 'Name of the output binary property the downloaded zip file is written to',
	},
];

/**
 * Unlike every other resource, this returns a full INodeExecutionData item
 * (with a binary property) rather than a plain JSON object, since the
 * backup endpoint returns a zip file, not JSON. The caller pushes it to the
 * output directly instead of going through the generic JSON-wrapping path.
 */
export async function executeBackupOperation(
	this: IExecuteFunctions,
	operation: string,
	i: number,
	session: VereinsfliegerSession,
): Promise<INodeExecutionData> {
	if (operation === 'download') {
		const binaryPropertyName = this.getNodeParameter('binaryPropertyName', i, 'data') as string;
		const buffer = await vereinsfliegerBinaryApiRequest.call(
			this,
			session,
			'GET',
			'/interface/rest/backup/getzip',
		);
		const binaryData = await this.helpers.prepareBinaryData(
			buffer,
			'vereinsflieger-backup.zip',
			'application/zip',
		);

		return {
			json: { fileName: binaryData.fileName, mimeType: binaryData.mimeType },
			binary: { [binaryPropertyName]: binaryData },
			pairedItem: { item: i },
		};
	}

	throw new NodeOperationError(this.getNode(), `Unknown operation: "${operation}"`, {
		itemIndex: i,
	});
}
