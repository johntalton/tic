

export class UserAPI {
	#baseUrl
	#user

	constructor(user, baseUrl) {
		this.#user = user
		this.#baseUrl = baseUrl
	}


	async friends() {
		const url = new URL(`/tic/v1/user/${this.#user.id}/friends`, this.#baseUrl)

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
			throw new Error('unable to fetch friends')
		}

		return response.json()
	}

	async list(ids) {
		const url = new URL(`/tic/v1/users`, this.#baseUrl)
		ids.forEach(id => url.searchParams.append('u', id))

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
			throw new Error('unable to fetch friends')
		}

		return response.json()
	}
}