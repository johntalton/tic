import { CouchUtil } from './couch.js'

const couchURL = process.env.COUCH_URL
const username = process.env.COUCH_USER
const password = process.env.COUCH_PASSWORD
const authorizationHeaders = CouchUtil.basicAuthHeader(username, password)


async function fromView(url) {
	// console.log('fromView', url)
	const response = await fetch(url, {
		method: 'GET',
		headers: {
			...authorizationHeaders
		}
	})
	.catch(e => {
		// console.log('user DB fetch error', e)
		throw new Error(`User DB fetch failure: ${e.message}`, { cause: e })
	})

	if(!response.ok) { throw new Error('User DB Fetch no Ok') }

	const result = await response.json()

	// console.log(result)

	if(result.rows.length !== 1) { throw new Error('User DB invalid rows length') }
	return result.rows[0].value
}


export class CouchUserStore {
	#url
	#accessTokenCache = new Map()
	#userCache = new Map()

	constructor(url) { this.#url = url }

	async create(id, userObject) {
		const response = await fetch(`${this.#url}`, {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json',
				...authorizationHeaders
			},
			body: JSON.stringify({
				_id: id,
				...userObject
			})
		})

		if(!response.ok) {
			const text = await response.text()
			console.log('create fail', response.status, text)
			return undefined
		}

		return response.json()
	}

	async set(id, userObject) {
		this.#userCache.delete(id)

		const response = await fetch(`${this.#url}`, {
			method: 'POST',
			headers: {
				...authorizationHeaders,
				'Content-Type': 'application/json'
			},
			body: JSON.stringify({ _id: id, ...userObject })
		})

		return response.ok
	}

	async #get(id) {
		const response = await fetch(`${this.#url}/${id}`, {
			method: 'GET',
			headers: {
				...authorizationHeaders,
				'Accept': 'application/json'
			}
		})

		if(!response.ok) {
			throw new Error('get user by id not ok')
		}

		return response.json()
	}

	async get(id) {
		if(this.#userCache.has(id)) {
			return this.#userCache.get(id)
		}

		const futureUser = this.#get(id)

		this.#userCache.set(id, futureUser)

		return futureUser
	}

	async list(user) {
		const url = new URL(`${this.#url}/_design/basic/_view/user_by_user`)

		const response = await fetch(url, {
			method: 'GET',
			headers: {
				...authorizationHeaders
			}
		})
		.catch(e => {
			if(e.code === 'ETIMEDOUT') {
				throw new Error(`DB listing timeout: ${e.message}`, { cause: e })
			}

			throw new Error(`DB listing failure: ${e.message}`, { cause: e })
		})


		if(!response.ok) {
			const text = await response.text()
			console.log('game listing error', response.status, text)
			throw new Error('game listing error')
		}

		const result = await response.json()

		return result.rows.map(row => ({
			id: row.key,
			...row.value
		}))
	}

	async fromToken(token) {
		// console.log('fromToken', this.#accessTokenCache)
		const now = Date.now()

		if(this.#accessTokenCache.has(token)) {
			const potential = this.#accessTokenCache.get(token)
			if(potential.expireAt > now) {
				return potential.futureUserInfo
			}
		}

		const futureUserInfo = fromView(`${this.#url}/_design/basic/_view/user_by_token?key="${token}"&limit=1`)

		this.#accessTokenCache.set(token, {
			expireAt: now + (1000 * 60),
			futureUserInfo
		})

		return futureUserInfo
	}

	// async fromName(name) {
	// 	return fromView(`${this.#url}/_design/basic/_view/user_by_name?key="${name}"&limit=1`)
	// }

	// async fromWebAuthNUserId(id) {
	// 	return fromView(`${this.#url}/_design/basic/_view/user_by_webauthn_id?key="${id}"&limit=1`)
	// }
}


export const userStore = new CouchUserStore(couchURL)