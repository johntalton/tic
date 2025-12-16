import { MATCHES } from '../../route.js'
import { userStore } from '../../store/user.js'

/**
 * @import { HandlerFn } from '../../util/dig.js'
 */

/** @type {HandlerFn} */
export async function handleListFriends(matches, sessionUser, body, query) {
	const user = await userStore.fromToken(sessionUser.token)
	if (user === undefined) {
		throw new Error('invalid user token')
	}

	const userId = matches.get(MATCHES.USER_ID)
	if(userId === undefined) { throw new Error('unspecified user') }

	const isSelf = user === userId

	const requestedUserObject = await userStore.get(userId)
	const { user: requestedUser } = requestedUserObject
	const { friends } = requestedUser

	// resolve friends
	const resolvedFriends = await userStore.list(userId, friends)
	// console.log(resolvedFriends)

	return { friends: resolvedFriends }
}