import { Fetch2 } from './fetch2.js'

export class GameAPI {
	#baseUrl
	#user

	constructor(user, baseUrl) {
		this.#user = user
		this.#baseUrl = baseUrl
	}

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

	async accept(gameId) {
		return this.#action(gameId, 'accept')
	}

	async decline(gameId) {
		return this.#action(gameId, 'decline')
	}

	async close(gameId, reason) {
		const sp = new URLSearchParams()
		if ((reason !== undefined) && (reason !== '')) { sp.set('reason', reason) }
		return this.#action(gameId, 'close', sp)
	}

	async forfeit(gameId) {
		return this.#action(gameId, 'forfeit')
	}

	async offer(gameId, targets) {
		const sp = new URLSearchParams()
		targets.forEach(target => sp.append('t', target))
		return this.#action(gameId, 'offer', sp)
	}

	async move(gameId, position) {
		const sp = new URLSearchParams()
		sp.set('position', position)
		return this.#action(gameId, 'move', sp)
	}
}

// const gameApi = new GameAPI({ accessToken:'token:access:agent' }, 'https://tic.next.local:8443')
// console.log(await gameApi.listing(['resolved']))