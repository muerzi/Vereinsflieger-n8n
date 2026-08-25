import type { IDataObject, IExecuteFunctions, INodeProperties } from 'n8n-workflow';
import { NodeOperationError } from 'n8n-workflow';

import { toApiDate, vereinsfliegerApiRequest, type VereinsfliegerSession } from '../GenericFunctions';

export const saleOperations: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: {
			show: {
				resource: ['sale'],
			},
		},
		options: [
			{
				name: 'Create',
				value: 'create',
				description: 'Create a new sale (10.6 Verkauf anlegen)',
				action: 'Create a sale',
			},
			{
				name: 'Get Many',
				value: 'getAll',
				description: 'Get a list of sales (10.2 - 10.5)',
				action: 'Get many sales',
			},
		],
		default: 'getAll',
	},
];

export const saleFields: INodeProperties[] = [
	// ----------------------------------
	//        sale: getAll
	// ----------------------------------
	{
		displayName: 'Filter',
		name: 'filterType',
		type: 'options',
		noDataExpression: true,
		displayOptions: {
			show: {
				resource: ['sale'],
				operation: ['getAll'],
			},
		},
		options: [
			{ name: 'Today', value: 'today', description: "All of today's sales, by service date (10.5)" },
			{ name: 'By Date', value: 'date', description: 'All sales on a given service date (10.4)' },
			{ name: 'Recently Modified', value: 'modified', description: 'Sales modified in the last N days (10.3)' },
			{ name: 'Date Range', value: 'daterange', description: 'All sales within a service date range (10.2)' },
		],
		default: 'today',
	},
	{
		displayName: 'Date',
		name: 'date',
		type: 'dateTime',
		required: true,
		default: '',
		displayOptions: {
			show: {
				resource: ['sale'],
				operation: ['getAll'],
				filterType: ['date'],
			},
		},
		description: 'Service date (Leistungsdatum)',
	},
	{
		displayName: 'Days',
		name: 'days',
		type: 'number',
		required: true,
		default: 7,
		typeOptions: {
			minValue: 1,
			maxValue: 28,
		},
		displayOptions: {
			show: {
				resource: ['sale'],
				operation: ['getAll'],
				filterType: ['modified'],
			},
		},
		description: 'Number of days to look back (1-28)',
	},
	{
		displayName: 'Date From',
		name: 'dateFrom',
		type: 'dateTime',
		required: true,
		default: '',
		displayOptions: {
			show: {
				resource: ['sale'],
				operation: ['getAll'],
				filterType: ['daterange'],
			},
		},
		description: 'Service date (Leistungsdatum) range start',
	},
	{
		displayName: 'Date To',
		name: 'dateTo',
		type: 'dateTime',
		required: true,
		default: '',
		displayOptions: {
			show: {
				resource: ['sale'],
				operation: ['getAll'],
				filterType: ['daterange'],
			},
		},
	},

	// ----------------------------------
	//        sale: create
	// ----------------------------------
	{
		displayName: 'Booking Date',
		name: 'bookingdate',
		type: 'dateTime',
		required: true,
		default: '',
		displayOptions: {
			show: {
				resource: ['sale'],
				operation: ['create'],
			},
		},
	},
	{
		displayName: 'Article ID',
		name: 'articleid',
		type: 'string',
		required: true,
		default: '',
		displayOptions: {
			show: {
				resource: ['sale'],
				operation: ['create'],
			},
		},
	},
	{
		displayName: 'Amount',
		name: 'amount',
		type: 'number',
		required: true,
		default: '',
		displayOptions: {
			show: {
				resource: ['sale'],
				operation: ['create'],
			},
		},
		description: 'Quantity sold',
	},
	{
		displayName: 'Additional Fields',
		name: 'additionalFields',
		type: 'collection',
		placeholder: 'Add Field',
		default: {},
		displayOptions: {
			show: {
				resource: ['sale'],
				operation: ['create'],
			},
		},
		options: [
			{
				displayName: 'Member ID',
				name: 'memberid',
				type: 'number',
				default: '',
				description: 'Member number (Mitgliedsnummer) of the buyer',
			},
			{
				displayName: 'Callsign',
				name: 'callsign',
				type: 'string',
				default: '',
				description: 'Callsign or other usage reference',
			},
			{
				displayName: 'Sales Tax (%)',
				name: 'salestax',
				type: 'number',
				default: '',
			},
			{
				displayName: 'Total Price',
				name: 'totalprice',
				type: 'number',
				default: '',
				typeOptions: {
					numberPrecision: 2,
				},
				description: 'Gross total price',
			},
			{
				displayName: 'Counter Reading',
				name: 'counter',
				type: 'number',
				default: '',
			},
			{
				displayName: 'Comment',
				name: 'comment',
				type: 'string',
				default: '',
			},
			{
				displayName: 'Cost Type (Gebührenbereich)',
				name: 'costtype',
				type: 'string',
				default: '',
			},
			{
				displayName: 'Credit Account ID (Caid2)',
				name: 'caid2',
				type: 'number',
				default: '',
				description: 'ID of the credit account; must be an expense or revenue account',
			},
			{
				displayName: 'Sphere (Sphäre)',
				name: 'spid',
				type: 'number',
				default: '',
			},
			{
				displayName: 'Payment Mode',
				name: 'paymentmode',
				type: 'number',
				default: '',
				description:
					'Only used with the cash book (Kassenbuch): 0 = not listed in the cash book, 1 = cash, 2 = EC card, 4-8 = club-specific payment modes',
			},
		],
	},
];

export async function executeSaleOperation(
	this: IExecuteFunctions,
	operation: string,
	i: number,
	session: VereinsfliegerSession,
): Promise<IDataObject | IDataObject[]> {
	if (operation === 'getAll') {
		const filterType = this.getNodeParameter('filterType', i) as string;

		if (filterType === 'today') {
			return (await vereinsfliegerApiRequest.call(
				this,
				session,
				'POST',
				'/interface/rest/sale/list/today',
			)) as IDataObject[];
		}

		if (filterType === 'date') {
			const date = toApiDate(this.getNodeParameter('date', i) as string, 'Date');
			return (await vereinsfliegerApiRequest.call(
				this,
				session,
				'POST',
				'/interface/rest/sale/list/date',
				{ date },
			)) as IDataObject[];
		}

		if (filterType === 'modified') {
			const days = this.getNodeParameter('days', i) as number;
			return (await vereinsfliegerApiRequest.call(
				this,
				session,
				'POST',
				'/interface/rest/sale/list/modified',
				{ days },
			)) as IDataObject[];
		}

		if (filterType === 'daterange') {
			const dateFrom = toApiDate(this.getNodeParameter('dateFrom', i) as string, 'Date From');
			const dateTo = toApiDate(this.getNodeParameter('dateTo', i) as string, 'Date To');
			return (await vereinsfliegerApiRequest.call(
				this,
				session,
				'POST',
				'/interface/rest/sale/list/daterange',
				{ datefrom: dateFrom, dateto: dateTo },
			)) as IDataObject[];
		}

		throw new NodeOperationError(this.getNode(), `Unknown filter type: "${filterType}"`, {
			itemIndex: i,
		});
	}

	if (operation === 'create') {
		const bookingdate = toApiDate(this.getNodeParameter('bookingdate', i) as string, 'Booking Date');
		const articleid = this.getNodeParameter('articleid', i) as string;
		const amount = this.getNodeParameter('amount', i) as number;
		const additionalFields = this.getNodeParameter('additionalFields', i, {}) as IDataObject;

		const body: IDataObject = { bookingdate, articleid, amount };
		for (const [key, value] of Object.entries(additionalFields)) {
			if (value === '' || value === undefined || value === null) {
				continue;
			}
			body[key] = value;
		}

		return (await vereinsfliegerApiRequest.call(
			this,
			session,
			'POST',
			'/interface/rest/sale/add',
			body,
		)) as IDataObject;
	}

	throw new NodeOperationError(this.getNode(), `Unknown operation: "${operation}"`, {
		itemIndex: i,
	});
}
