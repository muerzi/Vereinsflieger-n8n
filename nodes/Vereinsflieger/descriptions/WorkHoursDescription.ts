import type { IDataObject, IExecuteFunctions, INodeProperties } from 'n8n-workflow';
import { NodeOperationError } from 'n8n-workflow';

import { toApiDate, vereinsfliegerApiRequest, type VereinsfliegerSession } from '../GenericFunctions';

export const workHoursOperations: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: {
			show: {
				resource: ['workHours'],
			},
		},
		options: [
			{
				name: 'Create',
				value: 'create',
				description: 'Log a new work hours entry (9.2 Arbeitsstunden anlegen)',
				action: 'Create a work hours entry',
			},
			{
				name: 'Get Categories',
				value: 'getCategories',
				description: 'Get all work hour categories (9.3 Arbeitsstundenkategorien auslesen)',
				action: 'Get many work hour categories',
			},
			{
				name: 'Get Many',
				value: 'getAll',
				description: 'Get work hours for a date range (9.1 Arbeitsstunden auslesen)',
				action: 'Get many work hours entries',
			},
		],
		default: 'getAll',
	},
];

export const workHoursFields: INodeProperties[] = [
	// ----------------------------------
	//        workHours: getAll
	// ----------------------------------
	{
		displayName: 'Date From',
		name: 'dateFrom',
		type: 'dateTime',
		required: true,
		default: '',
		displayOptions: {
			show: {
				resource: ['workHours'],
				operation: ['getAll'],
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
				resource: ['workHours'],
				operation: ['getAll'],
			},
		},
	},

	// ----------------------------------
	//        workHours: create
	// ----------------------------------
	{
		displayName: 'User ID',
		name: 'uid',
		type: 'number',
		required: true,
		default: '',
		displayOptions: {
			show: {
				resource: ['workHours'],
				operation: ['create'],
			},
		},
		description: 'Unique Vereinsflieger user ID (uid) of the person who worked',
	},
	{
		displayName: 'Job Date',
		name: 'jobdate',
		type: 'dateTime',
		required: true,
		default: '',
		displayOptions: {
			show: {
				resource: ['workHours'],
				operation: ['create'],
			},
		},
	},
	{
		displayName: 'Job Description',
		name: 'jobtext',
		type: 'string',
		required: true,
		default: '',
		displayOptions: {
			show: {
				resource: ['workHours'],
				operation: ['create'],
			},
		},
		description: 'What work was performed',
	},
	{
		displayName: 'Hours',
		name: 'hours',
		type: 'string',
		required: true,
		default: '',
		placeholder: 'HH:mm',
		displayOptions: {
			show: {
				resource: ['workHours'],
				operation: ['create'],
			},
		},
		description: 'Duration worked, format HH:mm',
	},
	{
		displayName: 'Category ID',
		name: 'category',
		type: 'number',
		required: true,
		default: '',
		displayOptions: {
			show: {
				resource: ['workHours'],
				operation: ['create'],
			},
		},
		description: 'ID of the work hours category. Use "Get Categories" to look up valid IDs.',
	},
	{
		displayName: 'Additional Fields',
		name: 'additionalFields',
		type: 'collection',
		placeholder: 'Add Field',
		default: {},
		displayOptions: {
			show: {
				resource: ['workHours'],
				operation: ['create'],
			},
		},
		options: [
			{
				displayName: 'Time From',
				name: 'timefrom',
				type: 'string',
				default: '',
				placeholder: 'HH:mm',
			},
			{
				displayName: 'Time To',
				name: 'timeto',
				type: 'string',
				default: '',
				placeholder: 'HH:mm',
			},
			{
				displayName: 'Status',
				name: 'status',
				type: 'options',
				options: [
					{ name: 'Created', value: 1 },
					{ name: 'Accepted', value: 2 },
					{ name: 'Rejected', value: 3 },
				],
				default: 1,
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

export async function executeWorkHoursOperation(
	this: IExecuteFunctions,
	operation: string,
	i: number,
	session: VereinsfliegerSession,
): Promise<IDataObject | IDataObject[]> {
	if (operation === 'getAll') {
		const dateFrom = toApiDate(this.getNodeParameter('dateFrom', i) as string, 'Date From');
		const dateTo = toApiDate(this.getNodeParameter('dateTo', i) as string, 'Date To');
		return (await vereinsfliegerApiRequest.call(
			this,
			session,
			'POST',
			'/interface/rest/workhours/list/daterange',
			{ datefrom: dateFrom, dateto: dateTo },
		)) as IDataObject[];
	}

	if (operation === 'create') {
		const uid = this.getNodeParameter('uid', i) as number;
		const jobdate = toApiDate(this.getNodeParameter('jobdate', i) as string, 'Job Date');
		const jobtext = this.getNodeParameter('jobtext', i) as string;
		const hours = this.getNodeParameter('hours', i) as string;
		const category = this.getNodeParameter('category', i) as number;
		const additionalFields = this.getNodeParameter('additionalFields', i, {}) as IDataObject;

		const body: IDataObject = { uid, jobdate, jobtext, hours, category };
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
			'/interface/rest/workhours/add',
			body,
		)) as IDataObject;
	}

	if (operation === 'getCategories') {
		return (await vereinsfliegerApiRequest.call(
			this,
			session,
			'POST',
			'/interface/rest/workhourcategories/list',
		)) as IDataObject[];
	}

	throw new NodeOperationError(this.getNode(), `Unknown operation: "${operation}"`, {
		itemIndex: i,
	});
}
