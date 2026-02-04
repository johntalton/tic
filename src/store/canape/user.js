import { storeUserIdFromString } from '../store.js'

/** @import { Token, SSEToken } from '../../types/global.js' */
/** @import { StoreUserId, StoreUserEnvelope, StoreUserListItem, StoreUserListItemRow, StoreUserEnvelopeBase } from '../../types/store.user.js' */
/** @import { TimingsInfo } from '@johntalton/http-util/headers' */
/** @import { CanapeGenericRows, CanapeStoreUser } from '../../types/canape.js' */


import { Fetch2 } from '../../agent/fetch2.js'
import { DisposableTimer } from '../../util/timing.js'

export class CanapeUserStore {
	#url

	/**
	 * @param {string} url
	 */
	constructor(url) {
		this.#url = url
	}

	/**
	 * @param {StoreUserId} id
	 * @param {StoreUserEnvelopeBase} userObject
	 * @returns {Promise<StoreUserEnvelope|undefined>}
	 */
	async create(id, userObject) {
		throw new Error('create unimplemented')
	}

	/**
	 * @param {StoreUserId} id
	 * @param {StoreUserEnvelope} userObject
	 */
	async set(id, userObject) {
		const response = await Fetch2.fetch(`${this.#url}/${id}`, {
			method: 'POST',
			headers: {
				'content-type': 'application/json',
				'accept': 'application/json'
			},
			body: JSON.stringify({
				...userObject,
				storeUserId: undefined,
				storeUserRevision: undefined,
				['settee:id']: userObject.storeUserId,
				['settee:revision']: userObject.storeUserRevision
			}),
			signal: AbortSignal.timeout(200)
		})

		return response.ok
	}

	/**
	 * @param {StoreUserId} id
	 * @returns {Promise<StoreUserEnvelope>}
	 */
	async get(id) {
		const response = await Fetch2.fetch(`${this.#url}/${id}`, {
			method: 'GET',
			headers: {
				'accept': 'application/json'
			},
			signal: AbortSignal.timeout(200)
		})

		if(!response.ok) {
			// console.log('response', await response.text())
			throw new Error('canape get user not ok')
		}

		/** @type {CanapeStoreUser} */
		const result = await response.json()

		return {
			...result,
			storeUserId: storeUserIdFromString(result['settee:id']),
			storeUserRevision: result['settee:revision']
		}
	}

		/**
	 * @param {StoreUserId} _user
	 * @param {Array<StoreUserId>} [usersList]
	 * @returns {Promise<Array<StoreUserListItem>>}
	 */
	async list(_user, usersList) {
		const url = new URL(`${this.#url}/view/user_by_user`)
		usersList?.forEach(user => url.searchParams.append('key', user))

		const response = await Fetch2.fetch(url, {
			method: 'GET',
			headers: {
				'accept': 'application/json'
			},
			signal: AbortSignal.timeout(200)
		})

		if(!response.ok) {
			// console.log('listing not ok', response)
			throw new Error('canape list users not ok')
		}

		/** @type {CanapeGenericRows<StoreUserListItemRow>} */
		const result = await response.json()
		// console.log(result)

		return result.rows.map(row => ({
			storeUserId: storeUserIdFromString(row.id),
			...row.value
		}))
	}

	/**
	 * @param {Token|undefined} token
	 * @param {Array<TimingsInfo>} handlerPerformance
	 * @returns {Promise<StoreUserId>}
	 */
	async fromToken(token, handlerPerformance) {
		using _timer = new DisposableTimer('token', handlerPerformance)
		if(token === undefined) { throw new Error('access token required') }

		const response = await Fetch2.fetch(`${this.#url}/view/user_by_token?key=${token}`, {
			method: 'GET',
			headers: {
				'accept': 'application/json'
			},
			signal: AbortSignal.timeout(200)
		})

		if(!response.ok) { throw new Error('canape user by token not ok') }

		/** @type {CanapeGenericRows<StoreUserId>} */
		const result = await response.json()

		if(result.rows[0] === undefined) { throw new Error('no user found for token') }

		// console.log('fromToken -> ', result.rows[0])
		return result.rows[0].value
	}

	/**
	 * @param {SSEToken} token
	 * @returns {Promise<StoreUserId>}
	 */
	async fromSSEToken(token) {
		const response = await Fetch2.fetch(`${this.#url}/view/user_by_sse_token?key=${token}`, {
			method: 'GET',
			headers: {
				'accept': 'application/json'
			},
			signal: AbortSignal.timeout(200)
		})

		if(!response.ok) { throw new Error('canape user by token not ok') }

		/** @type {CanapeGenericRows<StoreUserId>} */
		const result = await response.json()

		if(result.rows[0] === undefined) { throw new Error('no user found sse token') }

		// console.log('fromSSEToken -> ', result.rows[0])
		return result.rows[0].value
	}
}
