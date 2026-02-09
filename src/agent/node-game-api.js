import { Fetch2 } from './fetch2.js'

/** @import { Token } from '../types/global.js' */
/** @import { EncodedGameId, IdentifiableActionableGame, GameListing } from '../types/public.game.js' */
/** @import { EncodedUserId, IdentifiableUser } from '../types/public.user.js' */
/** @import { ActionableGame } from '../games/tic.js' */

export class GameAPI {
	#baseUrl
	#user

	/**
	 * @param {{ id: EncodedUserId, accessToken: Token }} user
	 * @param {string} baseUrl
	 */
	constructor(user, baseUrl) {
		this.#user = user
		this.#baseUrl = baseUrl
	}

	/**
	 * @param {Array<string>} filter
	 * @returns {Promise<GameListing>}
	 */
	async listing(filter) {
		const url = new URL('/tic/v1/games', this.#baseUrl)
		url.searchParams.set('filter', filter.join('|'))

		const response = await Fetch2.fetch(url, {
			method: 'GET',
			mode: 'cors',
			headers: {
				'Accept': 'application/json',
				'Authorization': `Bearer ${this.#user.accessToken}`
			},
			// signal: AbortSignal.timeout(1000)
		})

		// console.log(response)


		if (!response.ok) {
			const text = await response.text()
			throw new Error(`"listing" response not ok (${response.status}) (${text})`)
		}

		return response.json()
	}

	/**
	 * @returns {Promise<IdentifiableActionableGame>}
	 */
	async create() {
		const url = new URL(`/tic/v1/game`, this.#baseUrl)
		url.searchParams.set('t', this.#user.id)
		url.searchParams.set('a', 'true')

		const response = await Fetch2.fetch(url, {
			method: 'POST',
			mode: 'cors',
			headers: {
				'Accept': 'application/json',
				'Authorization': `Bearer ${this.#user.accessToken}`
			}
		})

		if (!response.ok) {
			const text = await response.text()
			throw new Error(`"create" response not ok (${response.status}) (${text})`)
		}

		return response.json()
	}

	/**
	 * @param {EncodedGameId} gameId
	 * @returns {Promise<IdentifiableActionableGame>}
	 */
	async fetch(gameId) {
		// console.log('fetching game', gameId)
		const response = await Fetch2.fetch(new URL(`/tic/v1/game/${gameId}`, this.#baseUrl), {
			method: 'GET',
			mode: 'cors',
			headers: {
				'Accept': 'application/json',
				'Authorization': `Bearer ${this.#user.accessToken}`
			}
		})

		// console.log('fetch game', response)

		if (!response.ok) {
			const text = await response.text()
			throw new Error(`"get(${gameId})" response not ok (${response.status}) (${text})`)
		}

		return response.json()
	}

	/**
	 * @param {EncodedGameId} gameId
	 * @param {string} action
	 * @param {URLSearchParams|undefined} [query]
	 * @returns {Promise<IdentifiableActionableGame>}
	 */
	async #action(gameId, action, query) {
		// console.log('New Action', action)
		const url = new URL(`/tic/v1/game/${gameId}/${action}`, this.#baseUrl)
		if (query !== undefined) { url.search = query }

		const response = await Fetch2.fetch(url, {
			method: 'PATCH',
			mode: 'cors',
			headers: {
				'Accept': 'application/json',
				'Authorization': `Bearer ${this.#user.accessToken}`
			},
			// signal: AbortSignal.timeout(3000)
		})

		// console.log({ response })

		if (!response.ok) {
			const text = await response.text()
			throw new Error(`"${action}" response not ok (${response.status}) (${text})`)
		}

		return response.json()

		// const json = await response.json()
		// console.log(json)
		// return json
	}

	/**
	 * @param {EncodedGameId} gameId
	 * @returns {Promise<IdentifiableActionableGame>}
	 */
	async accept(gameId) {
		return this.#action(gameId, 'accept')
	}

	/**
	 * @param {EncodedGameId} gameId
	 * @returns {Promise<IdentifiableActionableGame>}
	 */
	async decline(gameId) {
		return this.#action(gameId, 'decline')
	}

	/**
	 * @param {EncodedGameId} gameId
	 * @param {string} reason
	 * @returns {Promise<IdentifiableActionableGame>}
	 */
	async close(gameId, reason) {
		const sp = new URLSearchParams()
		if ((reason !== undefined) && (reason !== '')) { sp.set('reason', reason) }
		return this.#action(gameId, 'close', sp)
	}

	/**
	 * @param {EncodedGameId} gameId
	 * @returns {Promise<IdentifiableActionableGame>}
	 */
	async forfeit(gameId) {
		return this.#action(gameId, 'forfeit')
	}

	/**
	 * @param {EncodedGameId} gameId
	 * @param {Array<EncodedUserId>} targets
	 * @returns {Promise<IdentifiableActionableGame>}
	 */
	async offer(gameId, targets) {
		const sp = new URLSearchParams()
		targets.forEach(target => sp.append('t', target))
		return this.#action(gameId, 'offer', sp)
	}

	/**
	 * @param {EncodedGameId} gameId
	 * @param {number} position
	 * @returns {Promise<IdentifiableActionableGame>}
	 */
	async move(gameId, position) {
		const sp = new URLSearchParams()
		sp.set('position', position)
		return this.#action(gameId, 'move', sp)
	}
}

// const gameApi = new GameAPI({ accessToken:'token:access:agent' }, 'https://tic.next.local:8443')
// console.log(await gameApi.listing(['resolved']))