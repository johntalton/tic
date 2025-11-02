import { userStore } from '../store/user.js'

/**
 * @import { HandlerFn } from '../util/dig.js'
 */

/** @type {HandlerFn} */
export async function listUsers(matches, sessionUser, body, query) {
	const user = await userStore.fromToken(sessionUser.token)
	if (user === undefined) {
		throw new Error('invalid user token')
	}

	const allUser = await userStore.list(user)


	return {
		users: allUser
	}
}