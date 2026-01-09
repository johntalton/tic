import { DisposableTimer } from '../../util/timing.js'
import {
	COUCH_STATUS_NOT_MODIFIED,
	CouchUtil
} from './couch.js'

/** @import { Token, SSEToken } from '../../types/global.js' */
/** @import { CouchGenericRows } from '../../types/couch.js' */
/** @import { StoreUserId, StoreUser, StoreUserListItem, StoreUserListItemRaw } from '../../types/store.js' */
/** @import { TimingsInfo } from '../../util/server-timing.js' */

/**
 * @typedef {Object} AccessTokenCacheItem
 * @property {number} expireAt
 * @property {StoreUserId} userId
 */

const couchURL = process.env['COUCH_URL']
const username = process.env['COUCH_USER']
const password = process.env['COUCH_PASSWORD']

if(couchURL === undefined) { throw new Error('unspecified couch url') }
if(username === undefined) { throw new Error('unspecified couch user') }
if(password === undefined) { throw new Error('unspecified couch password') }

const authorizationHeaders = CouchUtil.basicAuthHeader(username, password)

/**
 * @param {string} id
 * @returns {StoreUserId}
 */
export function storeUserIdFromString(id) {
	if(isStoreUserId(id)) { return id }
	throw new Error('not a store user id')
}

/**
 * @param {string} id
 * @returns {id is StoreUserId}
 */
export function isStoreUserId(id) {
	if(id === undefined) { return false }
	if(id === '') { return false }
	return true
}

export class CouchUserStore {
	#url

	/** @type {Map<string, AccessTokenCacheItem>} */
	#accessTokenCache = new Map()

	/** @type {Map<StoreUserId, Promise<StoreUser>>} */
	#userCache = new Map()

	/**
	 * @param {string} url
	 */
	constructor(url) { this.#url = url }

	/**
	 * @param {StoreUserId} id
	 * @param {Omit<StoreUser, '_id'|'_rev'>} userObject
	 * @returns {Promise<StoreUser|undefined>}
	 */
	async create(id, userObject) {
		return CouchUtil.fetchJSON(`${this.#url}`, {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json',
				...authorizationHeaders,
				'Accept': 'application/json'
			},
			body: JSON.stringify({
				...userObject,
				_id: id
			})
		})
	}

	/**
	 * @param {StoreUserId} id
	 * @param {StoreUser} userObject
	 */
	async set(id, userObject) {
		this.#userCache.delete(id)

		const response = await CouchUtil.fetch(`${this.#url}`, {
			method: 'POST',
			headers: {
				...authorizationHeaders,
				'Content-Type': 'application/json',
				'Accept': 'application/json'
			},
			body: JSON.stringify({ ...userObject, _id: id })
		})

		return response.ok
	}

	/**
	 * @param {StoreUserId} id
	 * @returns {Promise<StoreUser>}
	 */
	async #get(id) {
		return CouchUtil.fetchJSON(`${this.#url}/${id}`, {
			method: 'GET',
			headers: {
				...authorizationHeaders,
				'Accept': 'application/json'
			}
		})
	}

	/**
	 * @param {StoreUserId} id
	 * @param {string} etag
	 */
	async #isModified(id, etag) {
		const response = await CouchUtil.fetch(`${this.#url}/${id}`, {
			method: 'HEAD',
			headers: {
				...authorizationHeaders,
				'Accept': 'application/json',
				'If-None-Match': `"${etag}"`
			}
		})

		return (response.status !== COUCH_STATUS_NOT_MODIFIED)
	}

	/**
	 * @param {StoreUserId} id
	 * @returns {Promise<StoreUser>}
	 */
	async get(id) {
		const potential = this.#userCache.get(id)
		if(potential !== undefined) {
			return potential
		}

		const futureUser = this.#get(id)

		this.#userCache.set(id, futureUser)

		return futureUser
	}

	/**
	 * @param {StoreUserId} _user
	 * @param {Array<StoreUserId>} [usersList]
	 * @returns {Promise<Array<StoreUserListItem>>}
	 */
	async list(_user, usersList) {
		const url = new URL(`${this.#url}/_design/basic/_view/user_by_user`)

		if(usersList !== undefined && usersList.length > 0) {
			const userListKey = `[${usersList.map(u => `"${u}"`).join(',')}]`
			url.searchParams.set('keys', userListKey)
		}

		/** @type {CouchGenericRows<StoreUserListItemRaw>} */
		const result = await CouchUtil.fetchJSON(url, {
			method: 'GET',
			headers: {
				...authorizationHeaders,
				'Accept': 'application/json'
			}
		})

		return result.rows.map(row => ({
			id: storeUserIdFromString(row.key),
			...row.value
		}))
	}

	/**
	 * @param {Token} token
	 * @returns {Promise<StoreUserId>}
	 * @param {Array<TimingsInfo>} handlerPerformance
	 */
	async fromToken(token, handlerPerformance) {
		using _timer = new DisposableTimer('token', handlerPerformance)
		const now = Date.now()

		const potential = this.#accessTokenCache.get(token)
		if((potential !== undefined) && (potential.expireAt > now)){
			return potential.userId
		}

		/** @type {CouchGenericRows<StoreUserId>} */
		const result = await CouchUtil.fetchJSON(`${this.#url}/_design/basic/_view/user_by_token?key="${token}"&limit=1`, {
			method: 'GET',
			headers: {
				...authorizationHeaders,
				'Accept': 'application/json'
			}
		})

		if(result.rows.length !== 1) { throw new Error('User DB invalid rows length') }
		if(result.rows[0] === undefined) { throw new Error('User DB invalid row') }
		const userId = result.rows[0].value

		this.#accessTokenCache.set(token, {
			expireAt: now + (1000 * 60),
			userId
		})

		return userId
	}

	/**
	 * @param {SSEToken} token
	 * @returns {Promise<StoreUserId>}
	 */
	async fromSSEToken(token) {
		/** @type {CouchGenericRows<StoreUserId>} */
		const result = await CouchUtil.fetchJSON(`${this.#url}/_design/basic/_view/user_by_sse_token?key="${token}"&limit=1`, {
			method: 'GET',
			headers: {
				...authorizationHeaders,
				'Accept': 'application/json'
			}
		})

		if(result.rows.length !== 1) { throw new Error('User DB invalid rows length') }
		if(result.rows[0] === undefined) { throw new Error('User DB invalid row') }
		const userId = result.rows[0].value
		return userId
	}
}

export const userStore = new CouchUserStore(couchURL)