import type { IDataObject, IExecuteFunctions, INodeProperties } from 'n8n-workflow';
import { NodeOperationError } from 'n8n-workflow';

import {
	toApiDate,
	toItemArray,
	vereinsfliegerApiRequest,
	vereinsfliegerPublicApiRequest,
	type VereinsfliegerSession,
} from '../GenericFunctions';

export const calendarOperations: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: {
			show: {
				resource: ['calendar'],
			},
		},
		options: [
			{
				name: 'Create',
				value: 'create',
				description: 'Create a new appointment (4.4 Termin anlegen)',
				action: 'Create an appointment',
			},
			{
				name: 'Delete',
				value: 'delete',
				description: 'Delete an appointment (4.6 Termin Löschen)',
				action: 'Delete an appointment',
			},
			{
				name: 'Get Many',
				value: 'getAll',
				description: 'Get appointments for a date range (4.3 Termine auslesen)',
				action: 'Get many appointments',
			},
			{
				name: 'Get My Calendar',
				value: 'getMyCalendar',
				description: "Get the authenticated user's calendar (4.2 Meine Termine (ICS) auslesen)",
				action: "Get the authenticated user's calendar",
			},
			{
				name: 'Get Public Calendar',
				value: 'getPublic',
				description:
					'Get the public calendar, no login required (4.1 Öffentlichen Kalender auslesen)',
				action: 'Get the public calendar',
			},
			{
				name: 'Update',
				value: 'update',
				description: 'Update an existing appointment (4.5 Termin bearbeiten)',
				action: 'Update an appointment',
			},
		],
		default: 'getAll',
	},
];

const calendarAdditionalFields: INodeProperties[] = [
	{
		displayName: 'Show on External Homepage',
		name: 'exthomepage',
		type: 'boolean',
		default: false,
	},
	{
		displayName: 'Location',
		name: 'location',
		type: 'string',
		default: '',
	},
	{
		displayName: 'Comment',
		name: 'comment',
		type: 'string',
		default: '',
	},
	{
		displayName: 'Appointment URL',
		name: 'appointmenturl',
		type: 'string',
		default: '',
	},
];

export const calendarFields: INodeProperties[] = [
	// ----------------------------------
	//        calendar: getPublic
	// ----------------------------------
	{
		displayName: 'Homepage Access Code',
		name: 'hpaccesscode',
		type: 'string',
		required: true,
		default: '',
		displayOptions: {
			show: {
				resource: ['calendar'],
				operation: ['getPublic'],
			},
		},
		description:
			'Found under Administration → Homepageerweiterungen → Kalender in Vereinsflieger. No login is required for this operation.',
	},

	// ----------------------------------
	//        calendar: getAll
	// ----------------------------------
	{
		displayName: 'Date From',
		name: 'dateFrom',
		type: 'dateTime',
		required: true,
		default: '',
		displayOptions: {
			show: {
				resource: ['calendar'],
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
				resource: ['calendar'],
				operation: ['getAll'],
			},
		},
	},

	// ----------------------------------
	//        calendar: create
	// ----------------------------------
	{
		displayName: 'Title',
		name: 'title',
		type: 'string',
		required: true,
		default: '',
		displayOptions: {
			show: {
				resource: ['calendar'],
				operation: ['create'],
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
				resource: ['calendar'],
				operation: ['create'],
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
				resource: ['calendar'],
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
				resource: ['calendar'],
				operation: ['create'],
			},
		},
		options: calendarAdditionalFields,
	},

	// ----------------------------------
	//        calendar: update
	// ----------------------------------
	{
		displayName: 'Appointment ID',
		name: 'apoid',
		type: 'number',
		required: true,
		default: '',
		displayOptions: {
			show: {
				resource: ['calendar'],
				operation: ['update'],
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
				resource: ['calendar'],
				operation: ['update'],
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
				resource: ['calendar'],
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
				resource: ['calendar'],
				operation: ['update'],
			},
		},
		options: [
			{
				displayName: 'Title',
				name: 'title',
				type: 'string',
				default: '',
			},
			...calendarAdditionalFields,
		],
	},

	// ----------------------------------
	//        calendar: delete
	// ----------------------------------
	{
		displayName: 'Appointment ID',
		name: 'apoid',
		type: 'number',
		required: true,
		default: '',
		displayOptions: {
			show: {
				resource: ['calendar'],
				operation: ['delete'],
			},
		},
	},
];

function collectCalendarBody(additionalFields: IDataObject): IDataObject {
	const body: IDataObject = {};
	for (const [key, value] of Object.entries(additionalFields)) {
		if (value === '' || value === undefined || value === null) {
			continue;
		}
		if (key === 'exthomepage') {
			body[key] = value ? 1 : 0;
		} else {
			body[key] = value;
		}
	}
	return body;
}

export async function executeCalendarOperation(
	this: IExecuteFunctions,
	operation: string,
	i: number,
	session: VereinsfliegerSession | undefined,
): Promise<IDataObject | IDataObject[]> {
	if (operation === 'getPublic') {
		const credentials = await this.getCredentials('vereinsfliegerApi');
		const hpaccesscode = this.getNodeParameter('hpaccesscode', i) as string;
		return toItemArray(
			await vereinsfliegerPublicApiRequest.call(
				this,
				credentials.baseUrl as string,
				'POST',
				'/interface/rest/calendar/list/public',
				{ hpaccesscode },
			),
		);
	}

	// Every other Calendar operation requires an authenticated session.
	if (!session) {
		throw new NodeOperationError(this.getNode(), 'Vereinsflieger session is missing', {
			itemIndex: i,
		});
	}

	if (operation === 'getMyCalendar') {
		return toItemArray(
			await vereinsfliegerApiRequest.call(
				this,
				session,
				'GET',
				'/interface/rest/calendar/list/mycalendar',
			),
		);
	}

	if (operation === 'getAll') {
		const dateFrom = toApiDate(this.getNodeParameter('dateFrom', i) as string, 'Date From');
		const dateTo = toApiDate(this.getNodeParameter('dateTo', i) as string, 'Date To');
		return toItemArray(
			await vereinsfliegerApiRequest.call(this, session, 'GET', '/interface/rest/calendar/list', {
				datefrom: dateFrom,
				dateto: dateTo,
			}),
		);
	}

	if (operation === 'create') {
		const title = this.getNodeParameter('title', i) as string;
		const dateFrom = toApiDate(this.getNodeParameter('dateFrom', i) as string, 'Date From');
		const dateTo = toApiDate(this.getNodeParameter('dateTo', i) as string, 'Date To');
		const additionalFields = this.getNodeParameter('additionalFields', i, {}) as IDataObject;
		const body = {
			title,
			datefrom: dateFrom,
			dateto: dateTo,
			...collectCalendarBody(additionalFields),
		};
		return (await vereinsfliegerApiRequest.call(
			this,
			session,
			'POST',
			'/interface/rest/calendar/add',
			body,
		)) as IDataObject;
	}

	if (operation === 'update') {
		const apoid = this.getNodeParameter('apoid', i) as number;
		const dateFrom = toApiDate(this.getNodeParameter('dateFrom', i) as string, 'Date From');
		const dateTo = toApiDate(this.getNodeParameter('dateTo', i) as string, 'Date To');
		const additionalFields = this.getNodeParameter('additionalFields', i, {}) as IDataObject;
		const body = {
			datefrom: dateFrom,
			dateto: dateTo,
			...collectCalendarBody(additionalFields),
		};
		return (await vereinsfliegerApiRequest.call(
			this,
			session,
			'PUT',
			`/interface/rest/calendar/edit/${apoid}`,
			body,
		)) as IDataObject;
	}

	if (operation === 'delete') {
		const apoid = this.getNodeParameter('apoid', i) as number;
		await vereinsfliegerApiRequest.call(
			this,
			session,
			'DELETE',
			`/interface/rest/calendar/delete/${apoid}`,
		);
		return { deleted: true, apoid };
	}

	throw new NodeOperationError(this.getNode(), `Unknown operation: "${operation}"`, {
		itemIndex: i,
	});
}
