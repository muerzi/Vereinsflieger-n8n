import type { IDataObject, IExecuteFunctions, INodeProperties } from 'n8n-workflow';
import { NodeOperationError } from 'n8n-workflow';

import {
	toApiDate,
	toItemArray,
	vereinsfliegerApiRequest,
	type VereinsfliegerSession,
} from '../GenericFunctions';

export const bookingOperations: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: {
			show: {
				resource: ['booking'],
			},
		},
		options: [
			{
				name: 'Create',
				value: 'create',
				description: 'Create a new accounting booking (8.1 Buchung anlegen)',
				action: 'Create a booking',
			},
			{
				name: 'Get',
				value: 'get',
				description: 'Get a single booking by ID (8.3 Einzelne Buchung auslesen)',
				action: 'Get a booking',
			},
			{
				name: 'Get Many',
				value: 'getAll',
				description: 'Get a list of bookings (8.4 - 8.6)',
				action: 'Get many bookings',
			},
			{
				name: 'Update',
				value: 'update',
				description: 'Update an existing booking (8.2 Buchung bearbeiten)',
				action: 'Update a booking',
			},
		],
		default: 'getAll',
	},
];

const bookingAdditionalFields: INodeProperties[] = [
	{
		displayName: 'Sales Tax (%)',
		name: 'salestax',
		type: 'number',
		default: '',
		description: 'Must match a valid VAT entry from the club master data',
	},
	{
		displayName: 'Tax Account',
		name: 'taxaccount',
		type: 'string',
		default: '',
	},
	{
		displayName: 'Account Reference (Belegart)',
		name: 'accountreference',
		type: 'string',
		default: '',
		description: 'Short code for the document type, from the club master data',
	},
	{
		displayName: 'Account Reference ID (Belegnr)',
		name: 'accountreferenceid',
		type: 'number',
		default: '',
	},
	{
		displayName: 'Cost Type (Gebührenbereich)',
		name: 'costtype',
		type: 'string',
		default: '',
	},
	{
		displayName: 'Sphere (Sphäre)',
		name: 'spid',
		type: 'number',
		default: '',
	},
];

export const bookingFields: INodeProperties[] = [
	// ----------------------------------
	//        booking: create
	// ----------------------------------
	{
		displayName: 'Booking Date',
		name: 'bookingdate',
		type: 'dateTime',
		required: true,
		default: '',
		displayOptions: {
			show: {
				resource: ['booking'],
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
				resource: ['booking'],
				operation: ['create'],
			},
		},
		description: 'Gross amount, must be greater than 0',
	},
	{
		displayName: 'Debit Account (Sollkonto)',
		name: 'debitaccount',
		type: 'string',
		required: true,
		default: '',
		displayOptions: {
			show: {
				resource: ['booking'],
				operation: ['create'],
			},
		},
	},
	{
		displayName: 'Credit Account (Habenkonto)',
		name: 'creditaccount',
		type: 'string',
		required: true,
		default: '',
		displayOptions: {
			show: {
				resource: ['booking'],
				operation: ['create'],
			},
		},
	},
	{
		displayName: 'Booking Text',
		name: 'bookingtext',
		type: 'string',
		required: true,
		default: '',
		displayOptions: {
			show: {
				resource: ['booking'],
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
				resource: ['booking'],
				operation: ['create'],
			},
		},
		options: bookingAdditionalFields,
	},

	// ----------------------------------
	//        booking: update
	// ----------------------------------
	{
		displayName: 'Booking ID',
		name: 'adid',
		type: 'number',
		required: true,
		default: '',
		displayOptions: {
			show: {
				resource: ['booking'],
				operation: ['update'],
			},
		},
	},
	{
		displayName: 'Update Fields',
		name: 'additionalFields',
		type: 'collection',
		placeholder: 'Add Field',
		default: {},
		displayOptions: {
			show: {
				resource: ['booking'],
				operation: ['update'],
			},
		},
		options: [
			{
				displayName: 'Booking Date',
				name: 'bookingdate',
				type: 'dateTime',
				default: '',
			},
			{
				displayName: 'Value',
				name: 'value',
				type: 'number',
				default: '',
				typeOptions: {
					numberPrecision: 2,
				},
				description: 'Gross amount, must be greater than 0',
			},
			{
				displayName: 'Debit Account (Sollkonto)',
				name: 'debitaccount',
				type: 'string',
				default: '',
			},
			{
				displayName: 'Credit Account (Habenkonto)',
				name: 'creditaccount',
				type: 'string',
				default: '',
			},
			{
				displayName: 'Booking Text',
				name: 'bookingtext',
				type: 'string',
				default: '',
			},
			...bookingAdditionalFields,
		],
	},

	// ----------------------------------
	//        booking: get
	// ----------------------------------
	{
		displayName: 'Booking ID',
		name: 'adid',
		type: 'number',
		required: true,
		default: '',
		displayOptions: {
			show: {
				resource: ['booking'],
				operation: ['get'],
			},
		},
	},

	// ----------------------------------
	//        booking: getAll
	// ----------------------------------
	{
		displayName: 'Filter',
		name: 'filterType',
		type: 'options',
		noDataExpression: true,
		displayOptions: {
			show: {
				resource: ['booking'],
				operation: ['getAll'],
			},
		},
		options: [
			{ name: 'Today', value: 'today', description: 'All bookings dated today (8.4)' },
			{ name: 'Year', value: 'year', description: 'All bookings in a given year (8.5)' },
			{
				name: 'Date Range',
				value: 'daterange',
				description: 'All bookings within a date range (8.6)',
			},
		],
		default: 'today',
	},
	{
		displayName: 'Year',
		name: 'year',
		type: 'number',
		required: true,
		default: new Date().getFullYear(),
		displayOptions: {
			show: {
				resource: ['booking'],
				operation: ['getAll'],
				filterType: ['year'],
			},
		},
	},
	{
		displayName: 'Date From',
		name: 'dateFrom',
		type: 'dateTime',
		required: true,
		default: '',
		displayOptions: {
			show: {
				resource: ['booking'],
				operation: ['getAll'],
				filterType: ['daterange'],
			},
		},
	},
	{
		displayName: 'Date To',
		name: 'dateTo',
		type: 'dateTime',
		required: true,
		default: '',
		displayOptions: {
			show: {
				resource: ['booking'],
				operation: ['getAll'],
				filterType: ['daterange'],
			},
		},
	},
];

function collectBookingBody(fields: IDataObject): IDataObject {
	const body: IDataObject = {};
	for (const [key, value] of Object.entries(fields)) {
		if (value === '' || value === undefined || value === null) {
			continue;
		}
		body[key] = key === 'bookingdate' ? toApiDate(value as string, key) : value;
	}
	return body;
}

export async function executeBookingOperation(
	this: IExecuteFunctions,
	operation: string,
	i: number,
	session: VereinsfliegerSession,
): Promise<IDataObject | IDataObject[]> {
	if (operation === 'create') {
		const bookingdate = toApiDate(
			this.getNodeParameter('bookingdate', i) as string,
			'Booking Date',
		);
		const value = this.getNodeParameter('value', i) as number;
		const debitaccount = this.getNodeParameter('debitaccount', i) as string;
		const creditaccount = this.getNodeParameter('creditaccount', i) as string;
		const bookingtext = this.getNodeParameter('bookingtext', i) as string;
		const additionalFields = this.getNodeParameter('additionalFields', i, {}) as IDataObject;
		const body = {
			bookingdate,
			value,
			debitaccount,
			creditaccount,
			bookingtext,
			...collectBookingBody(additionalFields),
		};
		return (await vereinsfliegerApiRequest.call(
			this,
			session,
			'POST',
			'/interface/rest/account/add',
			body,
		)) as IDataObject;
	}

	if (operation === 'update') {
		const adid = this.getNodeParameter('adid', i) as number;
		const additionalFields = this.getNodeParameter('additionalFields', i, {}) as IDataObject;
		const body = collectBookingBody(additionalFields);
		return (await vereinsfliegerApiRequest.call(
			this,
			session,
			'PUT',
			`/interface/rest/account/edit/${adid}`,
			body,
		)) as IDataObject;
	}

	if (operation === 'get') {
		const adid = this.getNodeParameter('adid', i) as number;
		return (await vereinsfliegerApiRequest.call(
			this,
			session,
			'POST',
			`/interface/rest/account/get/${adid}`,
		)) as IDataObject;
	}

	if (operation === 'getAll') {
		const filterType = this.getNodeParameter('filterType', i) as string;

		if (filterType === 'today') {
			return toItemArray(
				await vereinsfliegerApiRequest.call(
					this,
					session,
					'POST',
					'/interface/rest/account/list/today',
				),
			);
		}

		if (filterType === 'year') {
			const year = this.getNodeParameter('year', i) as number;
			return toItemArray(
				await vereinsfliegerApiRequest.call(
					this,
					session,
					'POST',
					'/interface/rest/account/list/year',
					{ year },
				),
			);
		}

		if (filterType === 'daterange') {
			const dateFrom = toApiDate(this.getNodeParameter('dateFrom', i) as string, 'Date From');
			const dateTo = toApiDate(this.getNodeParameter('dateTo', i) as string, 'Date To');
			return toItemArray(
				await vereinsfliegerApiRequest.call(
					this,
					session,
					'POST',
					'/interface/rest/account/list/daterange',
					{ datefrom: dateFrom, dateto: dateTo },
				),
			);
		}

		throw new NodeOperationError(this.getNode(), `Unknown filter type: "${filterType}"`, {
			itemIndex: i,
		});
	}

	throw new NodeOperationError(this.getNode(), `Unknown operation: "${operation}"`, {
		itemIndex: i,
	});
}
