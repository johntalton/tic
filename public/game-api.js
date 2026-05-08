/** @import { SessionUser, GameId, Game, BoardType } from './types.js' */

export class GameAPI {
	#baseUrl
	#user

	/**
	 * @param {SessionUser} user
	 * @param {string|URL} baseUrl
	 */
	constructor(user, baseUrl) {
		this.#user = user
		this.#baseUrl = baseUrl
	}

	/**
	 * @param {Array<string>} filter
	 * @returns {Promise<Array<Game>>}
	 */
	async listing(filter) {
		if(!this.#user.isLoggedIn) { throw new Error('user not logged in') }

		const url = new URL('/tic/v1/games', this.#baseUrl)
		url.searchParams.set('filter', filter.join('|'))

		const response = await fetch(url, {
			method: 'GET',
			mode: 'cors',
			headers: {
				'Accept': 'application/json',
				'Authorization': `Bearer ${this.#user.accessToken}`
			}
		})

		if(!response.ok) {
			const text = await response.text()
			throw new Error(`"listing" response not ok (${response.status}) (${text})`)
		}

		return response.json()
	}

	/**
	 * @param {BoardType} type
	 * @returns {Promise<Game>}
	 */
	async create(type) {
		if(!this.#user.isLoggedIn) { throw new Error('user not logged in') }

		const url = new URL('/tic/v1/game', this.#baseUrl)
		// url.searchParams.set('t', this.#user.id)
		// url.searchParams.set('a', 'true')
		url.searchParams.set('type', type)

		const response = await fetch(url, {
			method: 'POST',
			mode: 'cors',
			headers: {
				'Accept': 'application/json',
				'Authorization': `Bearer ${this.#user.accessToken}`
			}
		})

		if(!response.ok) {
			const text = await response.text()
			throw new Error(`"create" response not ok (${response.status}) (${text})`)
		}

		return response.json()
	}

	/**
	 * @param {string} gameId
	 * @returns {Promise<Game>}
	 */
	async fetch(gameId) {
		if(!this.#user.isLoggedIn) { throw new Error('user not logged in') }

		const response = await fetch(new URL(`/tic/v1/game/${gameId}`, this.#baseUrl), {
			method: 'GET',
			mode: 'cors',
			headers: {
				'Accept': 'application/json',
				'Authorization': `Bearer ${this.#user.accessToken}`
			}
		})

		if(!response.ok) {
			const text = await response.text()
			throw new Error(`"get(${gameId})" response not ok (${response.status}) (${text})`)
		}

		return response.json()
	}

	/**
	 * @param {GameId} gameId
	 * @param {string} action
	 * @param {URLSearchParams} [query]
	 * @returns {Promise<Game>}
	 */
	async #action(gameId, action, query) {
		if(!this.#user.isLoggedIn) { throw new Error('user not logged in') }

		const url = new URL(`/tic/v1/game/${gameId}/${action}`, this.#baseUrl)
		if(query !== undefined) { url.search = query.toString() }

		const response = await fetch(url, {
			method: 'PATCH',
			mode: 'cors',
			headers: {
				'Accept': 'application/json',
				'Authorization': `Bearer ${this.#user.accessToken}`
			}
		})

		if(!response.ok) {
			const text = await response.text()
			throw new Error(`"${action}" response not ok (${response.status}) (${text})`)
		}

		return response.json()

		// const json = await response.json()
		// console.log(json)
		// return json
	}

	/**
	 * @param {GameId} gameId
	 * @returns {Promise<Game>}
	 */
	async accept(gameId) {
		return this.#action(gameId, 'accept')
	}

	/**
	 * @param {GameId} gameId
	 * @returns {Promise<Game>}
	 */
	async decline(gameId) {
		return this.#action(gameId, 'decline')
	}

	/**
	 * @param {GameId} gameId
	 * @param {string|undefined} reason
	 * @returns {Promise<Game>}
	 */
	async close(gameId, reason) {
		const sp = new URLSearchParams()
		if((reason !== undefined) && (reason !== '')) { sp.set('reason', reason) }
		return this.#action(gameId, 'close', sp)
	}

	/**
	 * @param {GameId} gameId
	 * @returns {Promise<Game>}
	 */
	async forfeit(gameId) {
		return this.#action(gameId, 'forfeit')
	}

	/**
	 * @param {GameId} gameId
	 * @param {Array<string>} targets
	 * @returns {Promise<Game>}
	 */
	async offer(gameId, targets) {
		const sp = new URLSearchParams()
		for(const target of targets) { sp.append('t', target)}
		return this.#action(gameId, 'offer', sp)
	}

	/**
	 * @param {GameId} gameId
	 * @param {string} position
	 * @returns {Promise<Game>}
	 */
	async move(gameId, position) {
		const sp = new URLSearchParams()
		sp.set('position', position)
		return this.#action(gameId, 'move', sp)
	}
}