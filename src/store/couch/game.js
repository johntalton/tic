import { CouchContinuous, DEFAULT_RECONNECT_INTERVAL_MS } from './couch-continuous.js'
import { COUCH_STATUS_NOT_MODIFIED, CouchUtil } from './couch.js'
import { storeGameIdFromString } from '../store.js'

/** @import { CouchGenericRows, CouchStoreGame } from '../../types/couch.js' */
/** @import { StoreGameId, StoreGameEnvelope, StoreGameEnvelopeBase, StoreGameListItem, StoreGameListItemRow} from '../../types/store.game.js' */

/**
 * @typedef {Object} CouchCacheGetGame
 * @property {number} expireAt
 * @property {Promise<CouchStoreGame>} futureDoc
 * @property {Promise<boolean>|undefined} futureIsModified
 */

const couchURL = process.env['COUCH_URL']
const username = process.env['COUCH_USER']
const password = process.env['COUCH_PASSWORD']

if(couchURL === undefined) { throw new Error('unspecified couch url') }
if(username === undefined) { throw new Error('unspecified couch user') }
if(password === undefined) { throw new Error('unspecified couch password') }

const authorizationHeaders = CouchUtil.basicAuthHeader(username, password)

const RECONNECT_INTERVAL_INITIAL_MS = DEFAULT_RECONNECT_INTERVAL_MS
const RECONNECT_INTERVAL_STEP_MS = (10 * 1000)
const RECONNECT_INTERVAL_MAX_MS = (60 * 1000)

export class CouchGameStore {
	#url
	/** @type {Map<StoreGameId, CouchCacheGetGame>} */
	#cache = new Map()
	#useCache = true

	// #eventSource

	/** @type {URL} */
	#feedUrl
	/**@type {CouchContinuous} */
	#feed
	#feedChannel = new BroadcastChannel('SSE')

	/**
	 * @param {string|undefined} [url]
	 */
	constructor(url) {
		this.#url = url ?? couchURL

		// this.#eventSource = new EventSource(`${url}/_changes?feed=eventsource`)
		// this.#eventSource.addEventListener('message', event => {
		// 	console.log('CouchDB event', event)
		// })

		this.#feedUrl = new URL(`${this.#url}/_changes?feed=continuous&heartbeat=true&filter=_view&view=basic/games_by_viewer`)
		this.#feed = this.#feedConnect()
	}

	#feedConnect() {
		const feed = new CouchContinuous(this.#feedUrl, {
			reconnectIntervalMS: RECONNECT_INTERVAL_INITIAL_MS,
			headers: {
				...authorizationHeaders
			}
		})

		feed.addEventListener('open', () => console.log('CouchDB Feed Open'))
		feed.addEventListener('close', () => console.log('CouchDB Feed Close'))
		feed.addEventListener('error', _event => {
			// add time to the interval up to max
			if(feed.reconnectIntervalMS < RECONNECT_INTERVAL_MAX_MS) {
				feed.reconnectIntervalMS += RECONNECT_INTERVAL_STEP_MS
			}

			console.log('CouchDB Feed Error', feed.reconnectIntervalMS)
		})
		feed.addEventListener('data', event => {
			// @ts-ignore
			const { data } = event
			const { id } = data

			// console.log('change', data)

			// reset reconnect to default on success
			feed.reconnectIntervalMS = RECONNECT_INTERVAL_INITIAL_MS

			this.get(id)
				.then(gameObject => {
					if(gameObject.type !== 'game.tic.v1') { return }
					const { game } = gameObject

					this.#feedChannel.postMessage({
						type: 'game-change',
						storeGameId: id,
						game
					})
				})
				.catch(e => console.warn('game change update error:', e))
		})

		return feed
	}

	/**
	 * @param {StoreGameId} id
	 */
	async has(id) {
		if(this.#useCache && this.#cache.has(id)) {
			// todo kinda ok for now
			return true
		}

		const response = await CouchUtil.fetch(`${this.#url}/${id}`, {
			method: 'HEAD',
			headers: {
				...authorizationHeaders,
				'Accept': 'application/json'
			}
		})

		// console.log(response)
		return response.ok
	}

	/**
	 * @param {StoreGameId} id
	 * @returns {Promise<CouchStoreGame>}
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
	 * @param {StoreGameId} id
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
	 * @param {StoreGameId} id
	 * @returns {Promise<StoreGameEnvelope>}
	 */
	async get(id) {
		// console.log('get game', { id })
		const now = Date.now()

		// console.log('couch get game by id', id)
		const potential = this.#cache.get(id)
		if(this.#useCache && potential !== undefined) {
			// console.log('try from cache', potential)

			if(potential.expireAt > now) {
				// console.log('cache not expired, return doc', now - potential.expireAt)
				return potential.futureDoc.then(doc => ({
					...doc,
					_id: undefined,
					_rev: undefined,
					storeGameId: storeGameIdFromString(doc._id),
					storeGameRevision: doc._rev
				}))
			}

			const doc = await potential.futureDoc
			const etag = doc._rev

			if(potential.futureIsModified === undefined) {

				potential.futureIsModified = this.#isModified(id, etag)
					.then(isModified => {
						// console.log('clear future mod')
						potential.futureIsModified = undefined

						if(!isModified) {
							// console.log('extending unmodified doc cache time')
							potential.expireAt = now + (1000 * 5)
						}
						else {
							// console.log('refresh from modified futureDoc')
							potential.futureDoc = this.#get(id)
							potential.expireAt = now + (1000 * 5)
						}

						return isModified
				})
				.catch(error => {
					// toss catch and throw
					// console.log('in is modified call delete cache')
					this.#cache.delete(id)
					throw error
				})
			}

			return potential.futureIsModified
				.then(() => potential.futureDoc)
				.then(doc => ({
					...doc,
					_id: undefined,
					_rev: undefined,
					storeGameId: storeGameIdFromString(doc._id),
					storeGameRevision: doc._rev
				}))
		}

		// console.log('refresh from futureDoc', id)
		const futureDoc = this.#get(id)

		futureDoc.catch(error => {
			// console.warn('cached game error removal', e)
			this.#cache.delete(id)
		})

		this.#cache.set(id, {
			expireAt: now + (1000 * 5),
			futureDoc,
			futureIsModified: undefined
		})

		return futureDoc.then(doc => ({
				...doc,
				_id: undefined,
				_rev: undefined,
				storeGameId: storeGameIdFromString(doc._id),
				storeGameRevision: doc._rev
			}))
	}

	/**
	 * @param {StoreGameId} id
	 * @param {StoreGameEnvelope | StoreGameEnvelopeBase} value
	 */
	async set(id, value) {
		this.#cache.delete(id)

		const response = await CouchUtil.fetch(`${this.#url}`, {
			method: 'POST',
			headers: {
				...authorizationHeaders,
				'Content-Type': 'application/json',
				'Accept': 'application/json'
			},
			body: JSON.stringify({
				...value,
				storeGameId: undefined,
				storeGameRevision: undefined,
				_id: id, // ('storeGameId' in value) ? value.storeGameId : undefined,
				_rev: ('storeGameRevision' in value) ? value.storeGameRevision : undefined
			})
		})

		return response.ok
	}

	/**
	 * @param {string} user
	 * @returns {Promise<Array<StoreGameListItem>>}
	 */
	async list(user) {
		const limit = 100
		const includeDocs = false

		const url = new URL(`${this.#url}/_design/basic/_view/games_by_viewer`)
		url.searchParams.set('key', `"${user}"`)
		url.searchParams.set('limit', `${limit}`)
		url.searchParams.set('reduce', 'false')
		url.searchParams.set('include_docs', `${includeDocs}`)

		/** @type {CouchGenericRows<StoreGameListItemRow>} */
		const result = await CouchUtil.fetchJSON(url, {
				method: 'GET',
				headers: {
					...authorizationHeaders,
					'Accept': 'application/json'
				}
			})

		return result.rows.map(row => ({
			storeGameId: storeGameIdFromString(row.id),
			...row.value,
			active: row.value.active?.includes(user)
		}))
	}
}
