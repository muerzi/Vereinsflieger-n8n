import type { IDataObject, IExecuteFunctions, INodeProperties } from 'n8n-workflow';
import { NodeOperationError } from 'n8n-workflow';

import {
	toApiDate,
	toItemArray,
	vereinsfliegerApiRequest,
	type VereinsfliegerSession,
} from '../GenericFunctions';

export const voucherOperations: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: {
			show: {
				resource: ['voucher'],
			},
		},
		options: [
			{
				name: 'Create',
				value: 'create',
				description: 'Create a new voucher (12.2 Gutschein anlegen)',
				action: 'Create a voucher',
			},
			{
				name: 'Get Many',
				value: 'getAll',
				description: 'Get the full voucher list (12.1 Gutscheinliste auslesen)',
				action: 'Get many vouchers',
			},
		],
		default: 'getAll',
	},
];

export const voucherFields: INodeProperties[] = [
	// ----------------------------------
	//        voucher: create
	// ----------------------------------
	{
		displayName: 'Voucher ID',
		name: 'voucherid',
		type: 'string',
		required: true,
		default: '',
		displayOptions: {
			show: {
				resource: ['voucher'],
				operation: ['create'],
			},
		},
		description: 'Voucher number (Gutscheinnummer)',
	},
	{
		displayName: 'Title',
		name: 'title',
		type: 'string',
		required: true,
		default: '',
		displayOptions: {
			show: {
				resource: ['voucher'],
				operation: ['create'],
			},
		},
	},
	{
		displayName: 'Value',
		name: 'value',
		type: 'number',
		required: true,
		default: '',
		typeOptions: {
			numberPrecision: 2,
		},
		displayOptions: {
			show: {
				resource: ['voucher'],
				operation: ['create'],
			},
		},
	},
	{
		displayName: 'Additional Fields',
		name: 'additionalFields',
		type: 'collection',
		placeholder: 'Add Field',
		default: {},
		displayOptions: {
			show: {
				resource: ['voucher'],
				operation: ['create'],
			},
		},
		options: [
			{
				displayName: 'Insert As New Member',
				name: 'insertnewuser',
				type: 'boolean',
				default: false,
				description:
					'Whether to also create the recipient as a person in the member management. Last Name becomes mandatory when this is enabled.',
			},
			{
				displayName: 'Last Name',
				name: 'lastname',
				type: 'string',
				default: '',
				description: 'Required if "Insert As New Member" is enabled',
			},
			{
				displayName: 'First Name',
				name: 'firstname',
				type: 'string',
				default: '',
			},
			{
				displayName: 'Gender',
				name: 'gender',
				type: 'options',
				options: [
					{ name: 'Male', value: 'm' },
					{ name: 'Female', value: 'w' },
					{ name: 'Diverse', value: 'd' },
				],
				default: 'm',
			},
			{
				displayName: 'Street',
				name: 'street',
				type: 'string',
				default: '',
			},
			{
				displayName: 'Zip Code',
				name: 'zipcode',
				type: 'string',
				default: '',
			},
			{
				displayName: 'Town',
				name: 'town',
				type: 'string',
				default: '',
			},
			{
				displayName: 'Email',
				name: 'email',
				type: 'string',
				default: '',
				placeholder: 'name@email.com',
			},
			{
				displayName: 'Phone Number',
				name: 'phonenumber',
				type: 'string',
				default: '',
			},
			{
				displayName: 'Passenger / Guest',
				name: 'passenger',
				type: 'string',
				default: '',
			},
			{
				displayName: 'Voucher Date',
				name: 'voucherdate',
				type: 'dateTime',
				default: '',
				description: 'Date of issue',
			},
			{
				displayName: 'Expiry Date',
				name: 'expiredate',
				type: 'dateTime',
				default: '',
			},
			{
				displayName: 'Comment',
				name: 'comment',
				type: 'string',
				default: '',
			},
		],
	},
];

export async function executeVoucherOperation(
	this: IExecuteFunctions,
	operation: string,
	i: number,
	session: VereinsfliegerSession,
): Promise<IDataObject | IDataObject[]> {
	if (operation === 'getAll') {
		return toItemArray(
			await vereinsfliegerApiRequest.call(this, session, 'POST', '/interface/rest/voucher/list'),
		);
	}

	if (operation === 'create') {
		const voucherid = this.getNodeParameter('voucherid', i) as string;
		const title = this.getNodeParameter('title', i) as string;
		const value = this.getNodeParameter('value', i) as number;
		const additionalFields = this.getNodeParameter('additionalFields', i, {}) as IDataObject;

		const body: IDataObject = { voucherid, title, value };
		for (const [key, rawValue] of Object.entries(additionalFields)) {
			if (rawValue === '' || rawValue === undefined || rawValue === null) {
				continue;
			}
			if (key === 'insertnewuser') {
				body[key] = rawValue ? 1 : 0;
			} else if (key === 'voucherdate' || key === 'expiredate') {
				body[key] = toApiDate(rawValue as string, key);
			} else {
				body[key] = rawValue;
			}
		}

		return (await vereinsfliegerApiRequest.call(
			this,
			session,
			'POST',
			'/interface/rest/voucher/add',
			body,
		)) as IDataObject;
	}

	throw new NodeOperationError(this.getNode(), `Unknown operation: "${operation}"`, {
		itemIndex: i,
	});
}
