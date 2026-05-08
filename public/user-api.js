/** @import { UserId, SessionUser, User } from './types.js' */


export class UserAPI {
	/** @type {URL|string} */
	#baseUrl
	#user

	/**
	 * @param {SessionUser} user
	 * @param {URL|string} baseUrl
	 */
	constructor(user, baseUrl) {
		this.#user = user
		this.#baseUrl = baseUrl
	}

	/**
	 * @returns {Promise<{ friends: Array<User> }>}
	 */
	async friends() {
		if(!this.#user.isLoggedIn) { throw new Error('user not logged in') }

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

	/**
	 * @param {Array<UserId>} ids
	 * @returns {Promise<{ users: Array<User> }>}
	 */
	async list(ids) {
		if(!this.#user.isLoggedIn) { throw new Error('user not logged in') }

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
			throw new Error('unable to fetch user listing')
		}

		return response.json()
	}
}