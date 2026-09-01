import { createHash } from 'crypto';

import type {
	IDataObject,
	IExecuteFunctions,
	IHttpRequestMethods,
	IHttpRequestOptions,
	ILoadOptionsFunctions,
	JsonObject,
} from 'n8n-workflow';
import { NodeApiError, NodeOperationError } from 'n8n-workflow';

export type VfContext = IExecuteFunctions | ILoadOptionsFunctions;

export interface VereinsfliegerSession {
	baseUrl: string;
	accesstoken: string;
}

// Vereinsflieger calls have been observed to take several seconds even under
// normal conditions (residential/NAS-hosted instances in particular), so this
// is generous on purpose - it exists to turn a genuinely stuck connection
// into a clear error instead of a request that hangs until some unrelated
// proxy in front of n8n gives up first.
const REQUEST_TIMEOUT_MS = 30000;

function stripTrailingSlash(url: string): string {
	return url.replace(/\/+$/, '');
}

export function md5(value: string): string {
	return createHash('md5').update(value, 'utf8').digest('hex');
}

/**
 * Performs the two-step Vereinsflieger login (2.1 Sitzungsschlüssel
 * anfordern + 2.2 Anmelden) and returns the resulting session. Vereinsflieger
 * does not support a static, long-lived API key, so a fresh session is
 * requested once per node execution and reused for every input item, then
 * closed again with vereinsfliegerLogout (2.3 Abmelden).
 */
export async function vereinsfliegerLogin(
	this: VfContext,
	credentials: IDataObject,
): Promise<VereinsfliegerSession> {
	const baseUrl = stripTrailingSlash(credentials.baseUrl as string);

	let tokenResponse: IDataObject;
	try {
		tokenResponse = (await this.helpers.httpRequest({
			method: 'GET',
			url: `${baseUrl}/interface/rest/auth/accesstoken`,
			json: true,
			timeout: REQUEST_TIMEOUT_MS,
		})) as IDataObject;
	} catch (error) {
		throw new NodeApiError(this.getNode(), error as JsonObject, {
			message: 'Could not request a Vereinsflieger access token',
			description: 'Check the selected Environment (base URL) in the credential.',
		});
	}

	const accesstoken = tokenResponse?.accesstoken as string | undefined;
	if (!accesstoken) {
		throw new NodeOperationError(
			this.getNode(),
			'Vereinsflieger did not return an access token for the session request',
		);
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

	try {
		await this.helpers.httpRequest({
			method: 'POST',
			url: `${baseUrl}/interface/rest/auth/signin`,
			body: signinBody,
			json: true,
			timeout: REQUEST_TIMEOUT_MS,
		});
	} catch (error) {
		throw new NodeApiError(this.getNode(), error as JsonObject, {
			message: 'Vereinsflieger sign-in failed',
			description:
				'Check Username, Password, App Key and, if applicable, Club ID (CID) and the Two-Factor Secret in the credential.',
		});
	}

	return { baseUrl, accesstoken };
}

/**
 * Closes the Vereinsflieger session (2.3 Abmelden). Logout failures are
 * swallowed on purpose: the workflow result must never fail just because
 * the session could not be closed cleanly - it will simply expire.
 */
export async function vereinsfliegerLogout(
	this: VfContext,
	session: VereinsfliegerSession,
): Promise<void> {
	try {
		await this.helpers.httpRequest({
			method: 'DELETE',
			url: `${session.baseUrl}/interface/rest/auth/signout/${session.accesstoken}`,
			json: true,
			timeout: REQUEST_TIMEOUT_MS,
		});
	} catch {
		// Intentionally ignored, see doc comment above.
	}
}

/**
 * Performs an authenticated Vereinsflieger REST API call. For GET requests
 * the payload (including the access token) is sent as a query string, for
 * every other method it is sent as an (implicitly form-encoded) request
 * body, matching the "GET-Parameter" / "Post-Parameter" distinction made
 * throughout the official REST API specification.
 */
export async function vereinsfliegerApiRequest(
	this: VfContext,
	session: VereinsfliegerSession,
	method: IHttpRequestMethods,
	endpoint: string,
	data: IDataObject = {},
): Promise<any> {
	const payload: IDataObject = { accesstoken: session.accesstoken, ...data };

	const options: IHttpRequestOptions = {
		method,
		url: `${session.baseUrl}${endpoint}`,
		json: true,
		timeout: REQUEST_TIMEOUT_MS,
	};

	if (method === 'GET') {
		options.qs = payload;
	} else {
		options.body = payload;
	}

	try {
		return await this.helpers.httpRequest(options);
	} catch (error) {
		throw new NodeApiError(this.getNode(), error as JsonObject);
	}
}

/**
 * Performs an unauthenticated Vereinsflieger REST API call. Only used for
 * 4.1 "Öffentlichen Kalender auslesen", which explicitly requires no login.
 */
export async function vereinsfliegerPublicApiRequest(
	this: VfContext,
	baseUrl: string,
	method: IHttpRequestMethods,
	endpoint: string,
	data: IDataObject = {},
): Promise<any> {
	const options: IHttpRequestOptions = {
		method,
		url: `${stripTrailingSlash(baseUrl)}${endpoint}`,
		json: true,
		timeout: REQUEST_TIMEOUT_MS,
	};

	if (method === 'GET') {
		options.qs = data;
	} else {
		options.body = data;
	}

	try {
		return await this.helpers.httpRequest(options);
	} catch (error) {
		throw new NodeApiError(this.getNode(), error as JsonObject);
	}
}

/**
 * Performs an authenticated Vereinsflieger REST API call that returns raw
 * binary data instead of JSON. Only used for 11.1 "Datensicherungsdatei
 * abrufen", which returns a zip file rather than a JSON body.
 */
export async function vereinsfliegerBinaryApiRequest(
	this: VfContext,
	session: VereinsfliegerSession,
	method: IHttpRequestMethods,
	endpoint: string,
): Promise<Buffer> {
	const options: IHttpRequestOptions = {
		method,
		url: `${session.baseUrl}${endpoint}`,
		qs: { accesstoken: session.accesstoken },
		encoding: 'arraybuffer',
		timeout: REQUEST_TIMEOUT_MS,
	};

	try {
		const response = await this.helpers.httpRequest(options);
		return Buffer.isBuffer(response) ? response : Buffer.from(response as ArrayBuffer);
	} catch (error) {
		throw new NodeApiError(this.getNode(), error as JsonObject);
	}
}

/**
 * Normalizes a "list" endpoint's response into a genuine array of records.
 *
 * Vereinsflieger's PHP backend only produces a JSON array (`[...]`) when the
 * underlying PHP array happens to be indexed sequentially from 0. Several
 * list endpoints instead key their result by record ID (e.g. flid, uid),
 * which PHP's json_encode serializes as a JSON *object* (`{"123": {...},
 * "456": {...}}`) even though the API documentation describes it as a plain
 * listing. Without this normalization, such a response would be treated as
 * a single record instead of being split into one n8n item per record,
 * forcing users to add a Code node just to unwrap it.
 */
export function toItemArray(response: unknown): IDataObject[] {
	if (Array.isArray(response)) {
		return response as IDataObject[];
	}
	if (response && typeof response === 'object') {
		return Object.values(response as Record<string, unknown>) as IDataObject[];
	}
	return [];
}

/**
 * Converts an n8n dateTime value (ISO 8601, any offset) to the
 * "YYYY-mm-dd HH:ii" UTC format the Vereinsflieger API expects for
 * datetime fields (e.g. departuretime, arrivaltime).
 */
export function toApiDateTime(value: string, fieldName: string): string {
	const date = new Date(value);
	if (Number.isNaN(date.getTime())) {
		throw new Error(`Invalid value for "${fieldName}": "${value}". Expected a date/time.`);
	}
	return date.toISOString().slice(0, 16).replace('T', ' ');
}

/**
 * Converts an n8n dateTime value to the "YYYY-mm-dd" format the
 * Vereinsflieger API expects for plain date fields (e.g. dateparam,
 * datefrom, dateto).
 */
export function toApiDate(value: string, fieldName: string): string {
	const date = new Date(value);
	if (Number.isNaN(date.getTime())) {
		throw new Error(`Invalid value for "${fieldName}": "${value}". Expected a date.`);
	}
	return date.toISOString().slice(0, 10);
}
