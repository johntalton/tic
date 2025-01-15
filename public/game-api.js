export class GameAPI {
	#baseUrl
	#user

	constructor(user, baseUrl) {
		this.#user = user
		this.#baseUrl = baseUrl
	}

	async listing() {
		const response = await fetch(new URL('/tic/v1/games?filter=new|active|pending', this.#baseUrl), {
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

	async accept(gameId) {
		return this.#action(gameId, 'accept')
	}

	async decline(gameId) {
		return this.#action(gameId, 'decline')
	}

	async close(gameId, reason) {
		const sp = new URLSearchParams()
		if((reason !== undefined) && (reason !== '')) { sp.set('reason', reason) }
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