import type { IDataObject, IExecuteFunctions, INodeProperties } from 'n8n-workflow';
import { NodeOperationError } from 'n8n-workflow';

import {
	toApiDate,
	toApiDateTime,
	vereinsfliegerApiRequest,
	type VereinsfliegerSession,
} from '../GenericFunctions';

export const flightOperations: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: {
			show: {
				resource: ['flight'],
			},
		},
		options: [
			{
				name: 'Create',
				value: 'create',
				description: 'Log a new flight (3.1 Flug anlegen)',
				action: 'Create a flight',
			},
			{
				name: 'Delete',
				value: 'delete',
				description: 'Delete a flight (3.3 Flug löschen)',
				action: 'Delete a flight',
			},
			{
				name: 'Get',
				value: 'get',
				description: 'Get a single flight by ID (3.5 Flug auslesen)',
				action: 'Get a flight',
			},
			{
				name: 'Get Many',
				value: 'getAll',
				description: 'Get a list of flights (3.6 - 3.12)',
				action: 'Get many flights',
			},
			{
				name: 'Join Tow Flights',
				value: 'joinTowFlights',
				description: 'Link a glider flight with its tow (winch/aerotow) flight (3.4 F-Schlepp Flüge verbinden)',
				action: 'Join two flights as tow flight',
			},
			{
				name: 'Update',
				value: 'update',
				description: 'Update an existing flight (3.2 Flug bearbeiten)',
				action: 'Update a flight',
			},
		],
		default: 'getAll',
	},
];

const startTypeOptions = [
	{ name: 'Self Launch (E)', value: 'E' },
	{ name: 'Winch Launch (W)', value: 'W' },
	{ name: 'Aerotow (F)', value: 'F' },
];

const chargeModeOptions = [
	{ name: 'None', value: 1 },
	{ name: 'Pilot', value: 2 },
	{ name: 'Passenger / Attendant', value: 3 },
	{ name: 'Guest', value: 4 },
	{ name: 'Pilot + Attendant', value: 5 },
	{ name: 'Another Member', value: 7 },
];

// Fields shared between "Create" and "Update", collected in one place to
// avoid maintaining the same ~30 optional API fields twice.
const flightSharedAdditionalFields: INodeProperties[] = [
	{
		displayName: 'Pilot Name',
		name: 'pilotname',
		type: 'string',
		default: '',
		description: 'Name of the pilot. Ignored if "Pilot User ID" is set.',
	},
	{
		displayName: 'Pilot User ID',
		name: 'uidpilot',
		type: 'number',
		default: '',
		description: 'Unique Vereinsflieger user ID (uid) of the pilot',
	},
	{
		displayName: 'Attendant / Instructor Name',
		name: 'attendantname',
		type: 'string',
		default: '',
		description: 'Name of the accompanying person or flight instructor',
	},
	{
		displayName: 'Attendant / Instructor User ID',
		name: 'uidattendant',
		type: 'number',
		default: '',
		description: 'Unique Vereinsflieger user ID (uid) of the attendant / instructor',
	},
	{
		displayName: '2nd Attendant Name',
		name: 'attendantname2',
		type: 'string',
		default: '',
	},
	{
		displayName: '2nd Attendant User ID',
		name: 'uidattendant2',
		type: 'number',
		default: '',
	},
	{
		displayName: '3rd Attendant Name',
		name: 'attendantname3',
		type: 'string',
		default: '',
	},
	{
		displayName: '3rd Attendant User ID',
		name: 'uidattendant3',
		type: 'number',
		default: '',
	},
	{
		displayName: 'Instructor (Flight Order) User ID',
		name: 'uidfi',
		type: 'number',
		default: '',
		description: 'Unique user ID of the instructor who assigned this flight (Flugauftrag von)',
	},
	{
		displayName: 'Start Type',
		name: 'starttype',
		type: 'options',
		options: startTypeOptions,
		default: 'E',
	},
	{
		displayName: 'Departure Time',
		name: 'departuretime',
		type: 'dateTime',
		default: '',
		description: 'Take-off time in UTC',
	},
	{
		displayName: 'Departure Location',
		name: 'departurelocation',
		type: 'string',
		default: '',
		description: 'Name, ICAO code, or coordinates (LAT,LON)',
	},
	{
		displayName: 'Arrival Time',
		name: 'arrivaltime',
		type: 'dateTime',
		default: '',
		description: 'Landing time in UTC',
	},
	{
		displayName: 'Arrival Location',
		name: 'arrivallocation',
		type: 'string',
		default: '',
	},
	{
		displayName: 'Flight Time (Minutes)',
		name: 'flighttime',
		type: 'number',
		default: '',
	},
	{
		displayName: 'Off-Block Time',
		name: 'offblock',
		type: 'string',
		default: '',
		placeholder: 'HH:mm',
		description: 'Off-block time in UTC, format HH:mm',
	},
	{
		displayName: 'On-Block Time',
		name: 'onblock',
		type: 'string',
		default: '',
		placeholder: 'HH:mm',
		description: 'On-block time in UTC, format HH:mm',
	},
	{
		displayName: 'Landing Count',
		name: 'landingcount',
		type: 'number',
		default: 1,
	},
	{
		displayName: 'Flight Type ID (Ftid)',
		name: 'ftid',
		type: 'number',
		default: '',
		description: 'ID of the flight type from the club master data (default 10, school flight 8)',
	},
	{
		displayName: 'Distance (Km)',
		name: 'km',
		type: 'number',
		default: '',
	},
	{
		displayName: 'Charge Mode',
		name: 'chargemode',
		type: 'options',
		options: chargeModeOptions,
		default: 1,
	},
	{
		displayName: 'Charged Member User ID',
		name: 'uidcharge',
		type: 'number',
		default: '',
		description: 'User ID of the member who pays, used with Charge Mode "Another Member"',
	},
	{
		displayName: 'Comment',
		name: 'comment',
		type: 'string',
		default: '',
	},
	{
		displayName: 'Tow Callsign',
		name: 'towcallsign',
		type: 'string',
		default: '',
		description: 'Callsign of the tow plane, used to create an aerotow flight together with this flight',
	},
	{
		displayName: 'Tow Pilot Name',
		name: 'towpilotname',
		type: 'string',
		default: '',
	},
	{
		displayName: 'Tow Pilot User ID',
		name: 'towuidpilot',
		type: 'number',
		default: '',
	},
	{
		displayName: 'Tow Time (Minutes)',
		name: 'towtime',
		type: 'number',
		default: '',
	},
	{
		displayName: 'Tow Height (Meters)',
		name: 'towheight',
		type: 'number',
		default: '',
	},
	{
		displayName: 'Engine Start Counter',
		name: 'motorstart',
		type: 'string',
		default: '',
		description: 'Engine hour meter reading at start, either HH:mm or an industry-hour float (max. 5 decimals)',
	},
	{
		displayName: 'Engine End Counter',
		name: 'motorend',
		type: 'string',
		default: '',
		description: 'Engine hour meter reading at landing, either HH:mm or an industry-hour float (max. 5 decimals)',
	},
	{
		displayName: 'Winch ID',
		name: 'wid',
		type: 'number',
		default: '',
	},
	{
		displayName: 'Winch Operator User ID',
		name: 'uidwinch',
		type: 'number',
		default: '',
	},
];

export const flightFields: INodeProperties[] = [
	// ----------------------------------
	//        flight: create
	// ----------------------------------
	{
		displayName: 'Callsign',
		name: 'callsign',
		type: 'string',
		required: true,
		default: '',
		displayOptions: {
			show: {
				resource: ['flight'],
				operation: ['create'],
			},
		},
		description: 'Registration / callsign of the aircraft',
	},
	{
		displayName: 'Additional Fields',
		name: 'additionalFields',
		type: 'collection',
		placeholder: 'Add Field',
		default: {},
		displayOptions: {
			show: {
				resource: ['flight'],
				operation: ['create'],
			},
		},
		options: [
			{
				displayName: 'Block Time (Minutes)',
				name: 'blocktime',
				type: 'number',
				default: '',
			},
			...flightSharedAdditionalFields,
		],
	},

	// ----------------------------------
	//        flight: update
	// ----------------------------------
	{
		displayName: 'Flight ID',
		name: 'flid',
		type: 'number',
		required: true,
		default: '',
		displayOptions: {
			show: {
				resource: ['flight'],
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
				resource: ['flight'],
				operation: ['update'],
			},
		},
		options: [
			{
				displayName: 'Callsign',
				name: 'callsign',
				type: 'string',
				default: '',
				description: 'Registration / callsign of the aircraft',
			},
			...flightSharedAdditionalFields,
		],
	},

	// ----------------------------------
	//        flight: delete / get
	// ----------------------------------
	{
		displayName: 'Flight ID',
		name: 'flid',
		type: 'number',
		required: true,
		default: '',
		displayOptions: {
			show: {
				resource: ['flight'],
				operation: ['delete', 'get'],
			},
		},
	},

	// ----------------------------------
	//        flight: joinTowFlights
	// ----------------------------------
	{
		displayName: 'Flight ID',
		name: 'flid',
		type: 'number',
		required: true,
		default: '',
		displayOptions: {
			show: {
				resource: ['flight'],
				operation: ['joinTowFlights'],
			},
		},
		description: 'Unique ID of the flight to attach the tow flight to',
	},
	{
		displayName: 'Tow Flight ID',
		name: 'flidtow',
		type: 'number',
		required: true,
		default: '',
		displayOptions: {
			show: {
				resource: ['flight'],
				operation: ['joinTowFlights'],
			},
		},
		description: 'Unique ID of the tow plane flight',
	},

	// ----------------------------------
	//        flight: getAll
	// ----------------------------------
	{
		displayName: 'Filter',
		name: 'filterType',
		type: 'options',
		noDataExpression: true,
		displayOptions: {
			show: {
				resource: ['flight'],
				operation: ['getAll'],
			},
		},
		options: [
			{ name: 'Today', value: 'today', description: "All of today's flights (3.6)" },
			{ name: 'By Date', value: 'date', description: 'All flights on a given day (3.7)' },
			{ name: 'By Aircraft', value: 'plane', description: 'Latest flights for one callsign (3.8)' },
			{ name: 'My Flights', value: 'myflights', description: 'Latest flights of the authenticated user (3.9)' },
			{ name: 'By User', value: 'user', description: 'Latest flights of a specific member (3.10)' },
			{ name: 'Recently Modified', value: 'modified', description: 'Flights modified in the last N days (3.11)' },
			{ name: 'Date Range', value: 'daterange', description: 'All flights within a date range (3.12)' },
		],
		default: 'today',
	},
	{
		displayName: 'Date',
		name: 'dateParam',
		type: 'dateTime',
		required: true,
		default: '',
		displayOptions: {
			show: {
				resource: ['flight'],
				operation: ['getAll'],
				filterType: ['date'],
			},
		},
	},
	{
		displayName: 'Callsign',
		name: 'callsign',
		type: 'string',
		required: true,
		default: '',
		displayOptions: {
			show: {
				resource: ['flight'],
				operation: ['getAll'],
				filterType: ['plane'],
			},
		},
	},
	{
		displayName: 'User ID',
		name: 'uid',
		type: 'number',
		required: true,
		default: '',
		displayOptions: {
			show: {
				resource: ['flight'],
				operation: ['getAll'],
				filterType: ['user'],
			},
		},
		description: 'Unique Vereinsflieger user ID (uid) of the member',
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
				resource: ['flight'],
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
				resource: ['flight'],
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
				resource: ['flight'],
				operation: ['getAll'],
				filterType: ['daterange'],
			},
		},
	},
	{
		displayName: 'Count',
		name: 'count',
		type: 'number',
		default: 50,
		displayOptions: {
			show: {
				resource: ['flight'],
				operation: ['getAll'],
				filterType: ['plane', 'myflights', 'user'],
			},
		},
		description: 'Max number of flights to return',
	},
];

function collectFlightBody(additionalFields: IDataObject): IDataObject {
	const body: IDataObject = {};
	for (const [key, value] of Object.entries(additionalFields)) {
		if (value === '' || value === undefined || value === null) {
			continue;
		}
		if (key === 'departuretime' || key === 'arrivaltime') {
			body[key] = toApiDateTime(value as string, key);
		} else {
			body[key] = value;
		}
	}
	return body;
}

export async function executeFlightOperation(
	this: IExecuteFunctions,
	operation: string,
	i: number,
	session: VereinsfliegerSession,
): Promise<IDataObject | IDataObject[]> {
	if (operation === 'create') {
		const callsign = this.getNodeParameter('callsign', i) as string;
		const additionalFields = this.getNodeParameter('additionalFields', i, {}) as IDataObject;
		const body = { callsign, ...collectFlightBody(additionalFields) };
		return (await vereinsfliegerApiRequest.call(
			this,
			session,
			'POST',
			'/interface/rest/flight/add',
			body,
		)) as IDataObject;
	}

	if (operation === 'update') {
		const flid = this.getNodeParameter('flid', i) as number;
		const additionalFields = this.getNodeParameter('additionalFields', i, {}) as IDataObject;
		const body = collectFlightBody(additionalFields);
		return (await vereinsfliegerApiRequest.call(
			this,
			session,
			'PUT',
			`/interface/rest/flight/edit/${flid}`,
			body,
		)) as IDataObject;
	}

	if (operation === 'delete') {
		const flid = this.getNodeParameter('flid', i) as number;
		await vereinsfliegerApiRequest.call(
			this,
			session,
			'DELETE',
			`/interface/rest/flight/delete/${flid}`,
		);
		return { deleted: true, flid };
	}

	if (operation === 'get') {
		const flid = this.getNodeParameter('flid', i) as number;
		return (await vereinsfliegerApiRequest.call(
			this,
			session,
			'POST',
			`/interface/rest/flight/get/${flid}`,
		)) as IDataObject;
	}

	if (operation === 'joinTowFlights') {
		const flid = this.getNodeParameter('flid', i) as number;
		const flidtow = this.getNodeParameter('flidtow', i) as number;
		await vereinsfliegerApiRequest.call(this, session, 'PUT', '/interface/rest/flight/jointowflights', {
			flid,
			flidtow,
		});
		return { joined: true, flid, flidtow };
	}

	if (operation === 'getAll') {
		const filterType = this.getNodeParameter('filterType', i) as string;

		if (filterType === 'today') {
			return (await vereinsfliegerApiRequest.call(
				this,
				session,
				'POST',
				'/interface/rest/flight/list/today',
			)) as IDataObject[];
		}

		if (filterType === 'date') {
			const dateParam = toApiDate(this.getNodeParameter('dateParam', i) as string, 'Date');
			return (await vereinsfliegerApiRequest.call(
				this,
				session,
				'POST',
				'/interface/rest/flight/list/date',
				{ dateparam: dateParam },
			)) as IDataObject[];
		}

		if (filterType === 'plane') {
			const callsign = this.getNodeParameter('callsign', i) as string;
			const count = this.getNodeParameter('count', i, 50) as number;
			return (await vereinsfliegerApiRequest.call(
				this,
				session,
				'POST',
				'/interface/rest/flight/list/plane',
				{ callsign, count },
			)) as IDataObject[];
		}

		if (filterType === 'myflights') {
			const count = this.getNodeParameter('count', i, 50) as number;
			return (await vereinsfliegerApiRequest.call(
				this,
				session,
				'POST',
				'/interface/rest/flight/list/myflights',
				{ count },
			)) as IDataObject[];
		}

		if (filterType === 'user') {
			const uid = this.getNodeParameter('uid', i) as number;
			const count = this.getNodeParameter('count', i, 50) as number;
			return (await vereinsfliegerApiRequest.call(
				this,
				session,
				'POST',
				'/interface/rest/flight/list/user',
				{ uid, count },
			)) as IDataObject[];
		}

		if (filterType === 'modified') {
			const days = this.getNodeParameter('days', i) as number;
			return (await vereinsfliegerApiRequest.call(
				this,
				session,
				'POST',
				'/interface/rest/flight/list/modified',
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
				'/interface/rest/flight/list/daterange',
				{ datefrom: dateFrom, dateto: dateTo },
			)) as IDataObject[];
		}

		throw new NodeOperationError(this.getNode(), `Unknown filter type: "${filterType}"`, {
			itemIndex: i,
		});
	}

	throw new NodeOperationError(this.getNode(), `Unknown operation: "${operation}"`, {
		itemIndex: i,
	});
}
