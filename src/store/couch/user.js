import { DisposableTimer } from '../../util/timing.js'
import {
	COUCH_STATUS_NOT_MODIFIED,
	CouchUtil
} from './couch.js'
import { storeUserIdFromString } from '../store.js'

/** @import { Token, SSEToken } from '../../types/global.js' */
/** @import { CouchGenericRows, CouchStoreUser } from '../../types/couch.js' */
/** @import { StoreUserId, StoreUserEnvelope, StoreUserListItem, StoreUserListItemRow, StoreUserEnvelopeBase } from '../../types/store.user.js' */
/** @import { TimingsInfo } from '@johntalton/http-util/headers' */

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

export class CouchUserStore {
	#url

	/** @type {Map<string, AccessTokenCacheItem>} */
	#accessTokenCache = new Map()

	/** @type {Map<StoreUserId, Promise<CouchStoreUser>>} */
	#userCache = new Map()

	/**
	 * @param {string|undefined} [url]
	 */
	constructor(url) { this.#url = url ?? couchURL }

	/**
	 * @param {StoreUserId} id
	 * @param {StoreUserEnvelopeBase} userObject
	 * @returns {Promise<StoreUserEnvelope|undefined>}
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
	 * @param {StoreUserEnvelope} userObject
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
			body: JSON.stringify({
				...userObject,
				storeUserId: undefined,
				storeUserRevision: undefined,
				_id: userObject.storeUserId,
				_rev: userObject.storeUserRevision
			})
		})

		return response.ok
	}

	/**
	 * @param {StoreUserId} id
	 * @returns {Promise<CouchStoreUser>}
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
	 * @returns {Promise<StoreUserEnvelope>}
	 */
	async get(id) {
		const potential = this.#userCache.get(id)
		if(potential !== undefined) {
			return potential.then(user => ({
				...user,
				storeUserId: storeUserIdFromString(user._id),
				storeUserRevision: user._rev
			}))
		}

		const futureUser = this.#get(id)

		this.#userCache.set(id, futureUser)

		return futureUser.then(user => ({
				...user,
				storeUserId: storeUserIdFromString(user._id),
				storeUserRevision: user._rev
			}))
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

		/** @type {CouchGenericRows<StoreUserListItemRow>} */
		const result = await CouchUtil.fetchJSON(url, {
			method: 'GET',
			headers: {
				...authorizationHeaders,
				'Accept': 'application/json'
			}
		})

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
