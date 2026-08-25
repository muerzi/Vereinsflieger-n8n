import type { ICredentialType, INodeProperties } from 'n8n-workflow';

export class VereinsfliegerApi implements ICredentialType {
	name = 'vereinsfliegerApi';

	displayName = 'Vereinsflieger API';

	documentationUrl = 'https://github.com/muerzi/Vereinsflieger-n8n#credentials';

	// Vereinsflieger has no static API key / bearer auth. Every operation
	// requires a short-lived session that is obtained via a two-step login
	// (GET accesstoken, then POST signin). That flow is performed by the
	// node itself (see GenericFunctions.ts) rather than through the generic
	// `authenticate` property, because it needs two sequential requests with
	// different payloads.
	properties: INodeProperties[] = [
		{
			displayName: 'Environment',
			name: 'baseUrl',
			type: 'options',
			options: [
				{
					name: 'Vereinsflieger (www.vereinsflieger.de)',
					value: 'https://www.vereinsflieger.de',
				},
				{
					name: 'Flightcenter Plus (www.flightcenterplus.de)',
					value: 'https://www.flightcenterplus.de',
				},
			],
			default: 'https://www.vereinsflieger.de',
			description: 'Which platform your club account is hosted on',
		},
		{
			displayName: 'Username',
			name: 'username',
			type: 'string',
			default: '',
			required: true,
			description: 'Your Vereinsflieger login (member) username',
		},
		{
			displayName: 'Password',
			name: 'password',
			type: 'string',
			typeOptions: {
				password: true,
			},
			default: '',
			required: true,
			description:
				'Your Vereinsflieger login password. It is hashed with MD5 by this node before every request, exactly as the REST API requires; the plain text value never leaves n8n unhashed.',
		},
		{
			displayName: 'App Key',
			name: 'appKey',
			type: 'string',
			typeOptions: {
				password: true,
			},
			default: '',
			required: true,
			description:
				'Application key created under Stammdaten → Einstellungen → REST Interface in Vereinsflieger. Requests made with this key are limited to 500 per day. Commercial use of the interface is prohibited by Vereinsflieger.',
		},
		{
			displayName: 'Club ID (CID)',
			name: 'cid',
			type: 'number',
			default: '',
			description:
				'Only required if your user account exists in more than one club (Verein). Leave empty otherwise.',
		},
		{
			displayName: 'Two-Factor Secret',
			name: 'authSecret',
			type: 'string',
			typeOptions: {
				password: true,
			},
			default: '',
			description:
				'Current TOTP code, only required if two-factor authentication is enabled for this Vereinsflieger user',
		},
	];
}
