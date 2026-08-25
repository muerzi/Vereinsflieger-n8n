import type {
	ICredentialsDecrypted,
	ICredentialTestFunctions,
	IDataObject,
	IExecuteFunctions,
	INodeCredentialTestResult,
	INodeExecutionData,
	INodeType,
	INodeTypeDescription,
} from 'n8n-workflow';
import { NodeConnectionTypes, NodeOperationError } from 'n8n-workflow';

import { articleFields, articleOperations, executeArticleOperation } from './descriptions/ArticleDescription';
import { backupFields, backupOperations, executeBackupOperation } from './descriptions/BackupDescription';
import { bookingFields, bookingOperations, executeBookingOperation } from './descriptions/BookingDescription';
import {
	calendarFields,
	calendarOperations,
	executeCalendarOperation,
} from './descriptions/CalendarDescription';
import { executeFlightOperation, flightFields, flightOperations } from './descriptions/FlightDescription';
import {
	executeMaintenanceOperation,
	maintenanceFields,
	maintenanceOperations,
} from './descriptions/MaintenanceDescription';
import { executeMemberOperation, memberFields, memberOperations } from './descriptions/MemberDescription';
import {
	executeReservationOperation,
	reservationFields,
	reservationOperations,
} from './descriptions/ReservationDescription';
import { executeSaleOperation, saleFields, saleOperations } from './descriptions/SaleDescription';
import { executeUserOperation, userFields, userOperations } from './descriptions/UserDescription';
import { executeVoucherOperation, voucherFields, voucherOperations } from './descriptions/VoucherDescription';
import {
	executeWorkHoursOperation,
	workHoursFields,
	workHoursOperations,
} from './descriptions/WorkHoursDescription';
import { md5, vereinsfliegerLogin, vereinsfliegerLogout, type VereinsfliegerSession } from './GenericFunctions';

export class Vereinsflieger implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Vereinsflieger',
		name: 'vereinsflieger',
		icon: 'file:vereinsflieger.svg',
		group: ['transform'],
		version: 1,
		subtitle: '={{$parameter["operation"] + ": " + $parameter["resource"]}}',
		description: 'Interact with the Vereinsflieger.de / Flightcenter Plus REST API',
		defaults: {
			name: 'Vereinsflieger',
		},
		inputs: [NodeConnectionTypes.Main],
		outputs: [NodeConnectionTypes.Main],
		usableAsTool: true,
		credentials: [
			{
				name: 'vereinsfliegerApi',
				required: true,
				testedBy: 'vereinsfliegerApiTest',
			},
		],
		properties: [
			{
				displayName: 'Resource',
				name: 'resource',
				type: 'options',
				noDataExpression: true,
				options: [
					{ name: 'Article', value: 'article' },
					{ name: 'Backup', value: 'backup' },
					{ name: 'Booking', value: 'booking' },
					{ name: 'Calendar', value: 'calendar' },
					{ name: 'Flight', value: 'flight' },
					{ name: 'Maintenance', value: 'maintenance' },
					{ name: 'Member', value: 'member' },
					{ name: 'Reservation', value: 'reservation' },
					{ name: 'Sale', value: 'sale' },
					{ name: 'User', value: 'user' },
					{ name: 'Voucher', value: 'voucher' },
					{ name: 'Work Hours', value: 'workHours' },
				],
				default: 'flight',
			},
			...articleOperations,
			...backupOperations,
			...bookingOperations,
			...calendarOperations,
			...flightOperations,
			...maintenanceOperations,
			...memberOperations,
			...reservationOperations,
			...saleOperations,
			...userOperations,
			...voucherOperations,
			...workHoursOperations,
			...articleFields,
			...backupFields,
			...bookingFields,
			...calendarFields,
			...flightFields,
			...maintenanceFields,
			...memberFields,
			...reservationFields,
			...saleFields,
			...userFields,
			...voucherFields,
			...workHoursFields,
		],
	};

	methods = {
		credentialTest: {
			async vereinsfliegerApiTest(
				this: ICredentialTestFunctions,
				credential: ICredentialsDecrypted,
			): Promise<INodeCredentialTestResult> {
				const credentials = credential.data as IDataObject;
				const baseUrl = (credentials.baseUrl as string).replace(/\/+$/, '');
				// Deliberately just the two calls needed to prove the login works
				// (token + sign-in). Signing out again is skipped here - it isn't
				// needed to validate the credential, and every extra round trip
				// adds latency that a slow connection can least afford while a
				// human is waiting on the "Test" button.
				const REQUEST_TIMEOUT_MS = 15000;

				try {
					const tokenResponse = await this.helpers.request({
						method: 'GET',
						uri: `${baseUrl}/interface/rest/auth/accesstoken`,
						json: true,
						timeout: REQUEST_TIMEOUT_MS,
					});

					const accesstoken = tokenResponse?.accesstoken;
					if (!accesstoken) {
						return {
							status: 'Error',
							message: 'Vereinsflieger did not return an access token. Check the Environment (base URL).',
						};
					}

					const signinBody: IDataObject = {
						accesstoken,
						username: credentials.username,
						password: md5(credentials.password as string),
						appkey: credentials.appKey,
					};
					if (credentials.cid) {
						signinBody.cid = credentials.cid;
					}
					if (credentials.authSecret) {
						signinBody.auth_secret = credentials.authSecret;
					}

					await this.helpers.request({
						method: 'POST',
						uri: `${baseUrl}/interface/rest/auth/signin`,
						body: signinBody,
						json: true,
						timeout: REQUEST_TIMEOUT_MS,
					});
				} catch (error) {
					return {
						status: 'Error',
						message: `Connection failed: ${(error as Error).message}`,
					};
				}

				return { status: 'OK', message: 'Connection successful!' };
			},
		},
	};

	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		const items = this.getInputData();
		const returnData: INodeExecutionData[] = [];

		const resource = this.getNodeParameter('resource', 0) as string;
		const operation = this.getNodeParameter('operation', 0) as string;

		// The public calendar endpoint (4.1) is explicitly documented to work
		// without a login, so it is the only operation that skips the
		// Vereinsflieger session entirely.
		const needsSession = !(resource === 'calendar' && operation === 'getPublic');

		let session: VereinsfliegerSession | undefined;
		if (needsSession) {
			const credentials = await this.getCredentials('vereinsfliegerApi');
			session = await vereinsfliegerLogin.call(this, credentials);
		}

		try {
			for (let i = 0; i < items.length; i++) {
				try {
					// Backup is the only resource that returns binary data instead
					// of JSON (11.1 returns a zip file), so it builds and pushes its
					// own output item rather than going through the generic
					// JSON-wrapping path below.
					if (resource === 'backup') {
						const item = await executeBackupOperation.call(this, operation, i, session as VereinsfliegerSession);
						returnData.push(item);
						continue;
					}

					let responseData: IDataObject | IDataObject[];

					if (resource === 'flight') {
						responseData = await executeFlightOperation.call(this, operation, i, session as VereinsfliegerSession);
					} else if (resource === 'calendar') {
						responseData = await executeCalendarOperation.call(this, operation, i, session);
					} else if (resource === 'user') {
						responseData = await executeUserOperation.call(this, operation, i, session as VereinsfliegerSession);
					} else if (resource === 'member') {
						responseData = await executeMemberOperation.call(this, operation, i, session as VereinsfliegerSession);
					} else if (resource === 'reservation') {
						responseData = await executeReservationOperation.call(
							this,
							operation,
							i,
							session as VereinsfliegerSession,
						);
					} else if (resource === 'maintenance') {
						responseData = await executeMaintenanceOperation.call(
							this,
							operation,
							i,
							session as VereinsfliegerSession,
						);
					} else if (resource === 'booking') {
						responseData = await executeBookingOperation.call(this, operation, i, session as VereinsfliegerSession);
					} else if (resource === 'workHours') {
						responseData = await executeWorkHoursOperation.call(
							this,
							operation,
							i,
							session as VereinsfliegerSession,
						);
					} else if (resource === 'article') {
						responseData = await executeArticleOperation.call(this, operation, i, session as VereinsfliegerSession);
					} else if (resource === 'sale') {
						responseData = await executeSaleOperation.call(this, operation, i, session as VereinsfliegerSession);
					} else if (resource === 'voucher') {
						responseData = await executeVoucherOperation.call(this, operation, i, session as VereinsfliegerSession);
					} else {
						throw new NodeOperationError(this.getNode(), `Unknown resource: "${resource}"`, {
							itemIndex: i,
						});
					}

					const responseItems = Array.isArray(responseData) ? responseData : [responseData];
					for (const responseItem of responseItems) {
						returnData.push({
							json: responseItem ?? {},
							pairedItem: { item: i },
						});
					}
				} catch (error) {
					if (this.continueOnFail()) {
						returnData.push({
							json: { error: (error as Error).message },
							pairedItem: { item: i },
						});
						continue;
					}
					throw error;
				}
			}
		} finally {
			if (session) {
				await vereinsfliegerLogout.call(this, session);
			}
		}

		return [returnData];
	}
}
