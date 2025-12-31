import { userStore } from '../store/user.js'

/** @import { HandlerFn } from '../util/dig.js' */
/** @import { IdentifiableUser } from '../types/public.js' */

/** @type {HandlerFn<IdentifiableUser>} */
export async function getSelf(matches, sessionUser, body, query) {
	if(sessionUser.tokens.access === undefined) { throw new Error('access token required') }
	const userId = await userStore.fromToken(sessionUser.tokens.access)

	const requestedUserObject = await userStore.get(userId)
	if(requestedUserObject === undefined) { throw new Error('unknown user') }

	const { user: requestedUser } = requestedUserObject

	return {
		id: userId,
		...requestedUser
	}
}