/**
 * @typedef {Object} User
 * @property {string} id
 * @property {string} accessToken
 */

/**
 * @typedef {string} GameId
 */



export class GameAPI {
	#baseUrl
	/** @type {User} */
	#user

	/**
	 * @param {User} user
	 * @param {string|URL} baseUrl
	 */
	constructor(user, baseUrl) {
		this.#user = user
		this.#baseUrl = baseUrl
	}

	/**
	 * @param {Array<string>} filter
	 */
	async listing(filter) {
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

	async create() {
		const url = new URL(`/tic/v1/game`, this.#baseUrl)
		url.searchParams.set('t', this.#user.id)
		url.searchParams.set('a', 'true')

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
	 */
	async fetch(gameId) {
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
	 */
	async #action(gameId, action, query) {
		const url = new URL(`/tic/v1/game/${gameId}/${action}`, this.#baseUrl)
		if(query !== undefined) { url.search = query }

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
	 */
	async accept(gameId) {
		return this.#action(gameId, 'accept')
	}

	/**
	 * @param {GameId} gameId
	 */
	async decline(gameId) {
		return this.#action(gameId, 'decline')
	}

	/**
	 * @param {GameId} gameId
	 * @param {string} reason
	 */
	async close(gameId, reason) {
		const sp = new URLSearchParams()
		if((reason !== undefined) && (reason !== '')) { sp.set('reason', reason) }
		return this.#action(gameId, 'close', sp)
	}

	/**
	 * @param {GameId} gameId
	 */
	async forfeit(gameId) {
		return this.#action(gameId, 'forfeit')
	}

	/**
	 * @param {GameId} gameId
	 * @param {Array<string>} targets
	 */
	async offer(gameId, targets) {
		const sp = new URLSearchParams()
		targets.forEach(target => sp.append('t', target))
		return this.#action(gameId, 'offer', sp)
	}

	/**
	 * @param {GameId} gameId
	 * @param {string} position
	 */
	async move(gameId, position) {
		const sp = new URLSearchParams()
		sp.set('position', position)
		return this.#action(gameId, 'move', sp)
	}
}