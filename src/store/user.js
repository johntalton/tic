import { CouchUtil } from './couch.js'

const couchURL = process.env.COUCH_URL
const username = process.env.COUCH_USER
const password = process.env.COUCH_PASSWORD
const authorizationHeaders = CouchUtil.basicAuthHeader(username, password)

async function fromView(url) {
	const response = await fetch(url, {
		method: 'GET',
		headers: {
			...authorizationHeaders
		}
	})
	.catch(e => {
		throw new Error(`DB fetch failure: ${e.message}`, { cause: e })
	})

	if(!response.ok) { throw new Error('DB Fetch no Ok') }

	const result = await response.json()

	// console.log(result)

	if(result.rows.length !== 1) { throw new Error('DB invalid rows length') }
	return result.rows[0].value
}


export class CouchUserStore {
	#url

	constructor(url) { this.#url = url }

	async create(name, webAuthNuserId) {
		const response = await fetch(`${this.#url}/tic`, {
			method: 'POST',
			headers: {
				...authorizationHeaders
			},
			body: JSON.stringify({
				id: name,
				'type': 'user.tic.v1',
				'displayName': name,
				'glyph': '👩🏻‍❤️‍💋‍👩🏼',
				'friends': [
					'alice.one'
				],
				'webauthn': {
					'userId': webAuthNuserId
				},
				'elo': 0,
				// 'session': {
				// 	'key': ',
				// 	'token': 'abcd1234',
				// 	'refreshToken': 'ref1234',
				// 	'sseToken': 'xyz1234',
				// 	'expiresAt': ',
				// 	'lastLogin': ',
				// 	'fromAddresses': []
				// }
			})
		})

		if(!response.ok) { return undefined }
	}


	async fromToken(token) {
		return fromView(`${this.#url}/_design/basic/_view/user_by_token?key="${token}"&limit=1`)
	}

	async fromName(name) {
		return fromView(`${this.#url}/_design/basic/_view/user_by_name?key="${name}"&limit=1`)
	}

	async fromWebAuthNUserId(id) {
		return fromView(`${this.#url}/_design/basic/_view/user_by_webauthn_id?key="${id}"&limit=1`)
	}

}


export const userStore = new CouchUserStore(couchURL)