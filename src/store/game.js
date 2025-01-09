import { CouchContinuous } from './couch-continous.js'
import { CouchUtil } from './couch.js'
// import { Temporal, Intl } from '@js-temporal/polyfill'

export class MemoryGameStore {
	#store = new Map()

	has(id) { return this.#store.has(id) }
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
	// #eventSource
	#feedUrl
	#feed
	#feedChannel = new BroadcastChannel('SSE')

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
						game
					})
				})
				.catch(e => console.warn(e))
		})
	}


	async has(id) {
		if(this.#cache.has(id)) {
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

	async get(id, user) {
		// console.log('couch get game by id', id)
		if(this.#cache.has(id)) {
			const doc = this.#cache.get(id)
			const etag = doc._rev

			const response = await fetch(`${this.#url}/${id}`, {
				method: 'HEAD',
				headers: {
					...authorizationHeaders,
					'Accept': '*/*',
					'If-None-Match': `"${etag}"`
				}
			})

			if(response.status === COUCH_HEADER_NOT_MODIFIED) {
				console.log('couchDB cache hit')
				return doc
			}
		}

		const response = await fetch(`${this.#url}/${id}`, {
			method: 'GET',
			headers: {
				...authorizationHeaders,
				'Accept': '*/*'
			}
		})

		// console.log(response)
		// const { promise, resolve, reject } = Promise.withResolvers()
		// setTimeout(resolve, 2000)
		// await promise

		if(!response.ok) {
			throw new Error('get game by id not ok')
		}

		const doc = await response.json()
		this.#cache.set(id, doc)
		return doc
	}

	async set(id, value) {
		// clear from cache
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

	async list(user, query) {
		const limit = 100
		// console.log('fetching listing ...')
		const response = await fetch(`${this.#url}/_design/basic/_view/games_by_viewer?key="${user}"&reduce=false&limit=${limit}`, {
				method: 'GET',
				headers: {
					...authorizationHeaders
				}
			})
			.catch(e => {
				throw new Error(`DB listing failure: ${e.message}`, { cause: e })
			})


		if(!response.ok) { throw new Error('game listing error') }

		const result = await response.json()
		// console.log(result)

		const full = result.rows.map(row => ({
			id: row.id,
			state: row.value.toLowerCase()
		}))

		if(query === undefined || query === null || query === '') { return full }

		const anyQuery = query.split('|')

		return full.filter(row => anyQuery.includes(row.state))
	}
}

export const gameStore = new CouchGameStore(couchURL)

