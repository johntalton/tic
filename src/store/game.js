import { CouchContinuous } from './couch-continous.js'
import { CouchUtil } from './couch.js'
// import { Temporal, Intl } from '@js-temporal/polyfill'

/**
 * @import { Game } from '../games/tic.js'
 */

/**
 * @typedef {string} StoreGameId
 */

/**
 * @typedef {Object} StoreGameMetadata
 * @property {number} createdAt
 * @property {number} updatedAt
 */

/**
 * @typedef {Object} StoreGameBase
 * @property {'game.tic.v1'} type
 * @property {Game} game
 * @property {StoreGameMetadata} meta
 */

/**
 * @typedef {Object} StoreGameExtension
 * @property {StoreGameId} _id
 * @property {string} _rev
 */

/**
 * @typedef {StoreGameBase & StoreGameExtension} StoreGame
 */

/**
 * @typedef {Object} StoreGameListItem
 * @property {StoreGameId} _id
 * @property {string} state
 * @property {string} owner
 * @property {Array<string>} active
 * @property {Array<string>} players
 * @property {number} createdAt
*/


export class MemoryGameStore {
	#store = new Map()

	/**
	 * @param {StoreGameId} id
	 */
	has(id) { return this.#store.has(id) }

	/**
	 * @param {StoreGameId} id
	 * @param {StoreGame} user
	 */
	get(id, user) {
		// console.log('Store: get game', id, this.#store.get(id))
		return this.#store.get(id)
	}
	set(id, value) {
		// console.log('Store: game', id)
		return this.#store.set(id, value)
	}

	list() {
		return [ ...this.#store.entries() ]
			.map(([ id, value]) => {
				return {
					id,
					state: value.game.state,
					// _game: value
				}
			})
	}
}

const couchURL = process.env.COUCH_URL
const username = process.env.COUCH_USER
const password = process.env.COUCH_PASSWORD
const authorizationHeaders = CouchUtil.basicAuthHeader(username, password)

const COUCH_HEADER_NOT_MODIFIED = 304

export class CouchGameStore {
	#url
	#cache = new Map()
	#useCache = true

	// #eventSource

	/** @type {URL} */
	#feedUrl
	/**@type {CouchContinuous} */
	#feed
	#feedChannel = new BroadcastChannel('SSE')

	/**
	 * @param {string} url
	 */
	constructor(url) {
		this.#url = url

		// this.#eventSource = new EventSource(`${url}/_changes?feed=eventsource`)
		// this.#eventSource.addEventListener('message', event => {
		// 	console.log('CouchDB event', event)
		// })

		this.#feedUrl = new URL(`${url}/_changes?feed=continuous&heartbeat=true&filter=_view&view=basic/games_by_viewer`)
		this.#feedConnect()
	}

	#feedConnect() {
		this.#feed = new CouchContinuous(this.#feedUrl, {
			headers: {
				...authorizationHeaders
			}
		})


		this.#feed.addEventListener('open', () => console.log('CouchDB Feed Open'))
		this.#feed.addEventListener('close', () => console.log('CouchDB Feed Close'))
		this.#feed.addEventListener('error', error => console.log('CouchDB Error', error))
		this.#feed.addEventListener('data', event => {
			const { data } = event
			const { id } = data

			this.get(id)
				.then(gameObject => {
					const { game } = gameObject
					this.#feedChannel.postMessage({
						type: 'game-change',
						_id: id,
						game
					})
				})
				.catch(e => console.warn('game watcher error:', e))
		})
	}

	/**
	 * @param {StoreGameId} id
	 */
	async has(id) {
		if(this.#useCache && this.#cache.has(id)) {
			// todo kinda ok for now
			return true
		}

		const response = await fetch(`${this.#url}/${id}`, {
			method: 'HEAD',
			headers: authorizationHeaders
		})

		// console.log(response)
		return response.ok
	}

	/**
	 * @param {StoreGameId} id
	 * @returns {Promise<StoreGame>}
	 */
	async #get(id) {
		const response = await fetch(`${this.#url}/${id}`, {
			method: 'GET',
			headers: {
				...authorizationHeaders,
				'Accept': '*/*'
			}
		})

		if(!response.ok) {
			throw new Error('get game by id not ok')
		}

		return response.json()
	}

	/**
	 * @param {StoreGameId} id
	 * @param {string} etag
	 */
	async #isModified(id, etag) {
		const response = await fetch(`${this.#url}/${id}`, {
			method: 'HEAD',
			headers: {
				...authorizationHeaders,
				'Accept': '*/*',
				'If-None-Match': `"${etag}"`
			}
		})

		return (response.status !== COUCH_HEADER_NOT_MODIFIED)
	}

	/**
	 * @param {StoreGameId} id
	 * @returns {Promise<StoreGame>}
	 */
	async get(id) {
		// console.log('get game', { id })
		const now = Date.now()

		// console.log('couch get game by id', id)
		if(this.#useCache && this.#cache.has(id)) {
			const potential = this.#cache.get(id)

			// console.log('from cache', potential)

			if(potential.expireAt > now) {
				return potential.futureDoc
			}

			const doc = await potential.futureDoc
			const etag = doc._rev

			if(potential.futureIsModified === undefined) {

				potential.futureIsModified = this.#isModified(id, etag)
					.then(isModified => {
						// console.log('clear future mod')
						potential.futureIsModified = undefined

						if(!isModified) {
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
					this.#cache.delete(id)
					throw error
				})
			}

			return potential.futureIsModified
				.then(() => potential.futureDoc)
		}

		// console.log('refresh from futureDoc', id)
		const futureDoc = this.#get(id)

		this.#cache.set(id, {
			expireAt: now + (1000 * 5),
			futureDoc,
			futureIsModified: undefined
		})

		return futureDoc
	}

	/**
	 * @param {StoreGameId} id
	 * @param {StoreGame | StoreGameBase} value
	 */
	async set(id, value) {
		// clear from cache
		// console.log('clear cache', { id })
		this.#cache.delete(id)

		const response = await fetch(`${this.#url}`, {
			method: 'POST',
			headers: {
				...authorizationHeaders,
				'Content-Type': 'application/json'
			},
			body: JSON.stringify({ _id: id, ...value })
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
		// console.log(result)

		const full = result.rows.map(row => ({
			_id: row.id,
			...row.value
		}))
		.map(row => ({
			...row,
			active: row.active?.includes(user)
		}))

		return full
	}
}

export const gameStore = new CouchGameStore(couchURL)

