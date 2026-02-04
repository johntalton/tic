import { Fetch2 } from '../../agent/fetch2.js'
import { EventSource } from '../../util/event-source.js'
import { storeGameIdFromString } from '../store.js'

/** @import { StoreGameId, StoreGameEnvelope, StoreGameEnvelopeBase, StoreGameListItem, StoreGameListItemRow} from '../../types/store.game.js' */
/** @import { CanapeGenericRows, CanapeStoreGame } from '../../types/canape.js' */

export class CanapeGameStore {
	#url
	#feedChannel = new BroadcastChannel('SSE')

	/**
	 * @param {string} url
	 */
	constructor(url) {
		this.#url = url

		const feed = new EventSource(`${url}/sse`)
		feed.addEventListener('open', () => { console.log('Canape SSE Open') })
		feed.addEventListener('error', () => { console.log('Canape SSE Error') })
		feed.addEventListener('message', event => { console.log('Canape SSE Message', event) })
		feed.addEventListener('update', event => {
			// @ts-ignore
			const { data, lastEventId, origin } = event

			/** @type {{ id: StoreGameId }} */
			const json = JSON.parse(data)
			const { id } = json

			console.log('Canape SSE Update', id)

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
				.catch(error => console.warn('update error from sse', error))
		})
	}

	/**
	 * @param {StoreGameId} id
	 */
	async has(id) {
		const response = await Fetch2.fetch(`${this.#url}/${id}`, {
			method: 'HEAD',
			headers: {
				'Accept': 'application/json'
			}
		})
		return response.ok
	}

	/**
	 * @param {StoreGameId} id
	 * @returns {Promise<StoreGameEnvelope>}
	 */
	async get(id) {
		const response = await Fetch2.fetch(`${this.#url}/${id}`, {
			method: 'GET',
			headers: {
				'accept': 'application/json'
			},
			signal: AbortSignal.timeout(200)
		})
			.catch(e => {
				// console.log(e)
				if(e.code === 'ECONNREFUSED') {
					throw new Error('canape offline', { cause: e })
				}

				throw new Error('canape get game error', { cause: e })
			})

		if(!response.ok) {
			console.log('game not found', response.status, await response.text())
			throw new Error('canape game not found')
		}

		/** @type {CanapeStoreGame} */
		const result = await response.json()

		return {
			...result,
			['settee:id']: undefined,
			['settee:revision']: undefined,
			storeGameId: storeGameIdFromString(result['settee:id']),
			storeGameRevision: result['settee:revision']
		}
	}

	/**
	 * @param {StoreGameId} id
	 * @param {StoreGameEnvelope | StoreGameEnvelopeBase} value
	 */
	async set(id, value) {
		const response = await Fetch2.fetch(`${this.#url}/${id}`, {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json',
				'Accept': 'application/json'
			},
			signal: AbortSignal.timeout(200),
			body: JSON.stringify({
				...value,
				storeGameId: undefined,
				storeGameRevision: undefined,
				['settee:id']: id, //('storeGameId' in value) ? value.storeGameId : undefined,
				['settee:revision']: ('storeGameRevision' in value) ? value.storeGameRevision : undefined
			})
		})

		return response.ok
	}

	/**
	 * @param {string} user
	 * @returns {Promise<Array<StoreGameListItem>>}
	 */
	async list(user) {
		const response = await Fetch2.fetch(`${this.#url}/view/games_by_viewer?key=${user}`,{
			method: 'GET',
			headers: {
				'accept': 'application/json'
			},
			signal: AbortSignal.timeout(200)
		})

		if(!response.ok) {
			throw new Error('canape view not found')
		}

		/** @type {CanapeGenericRows<StoreGameListItemRow>}  */
		const result = await response.json()

		return result.rows.map(row => ({
			storeGameId: storeGameIdFromString(row.id),
			...row.value,
			active: row.value.active?.includes(user)
		}))
	}
}

