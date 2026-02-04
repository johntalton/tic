import { userStore } from '../store/store.js'
import { timed, TIMING } from '../util/timing.js'
import { encodedUserId } from './util.js'

/** @import { HandlerFn } from '../util/dig.js' */
/** @import { IdentifiableUser } from '../types/public.user.js' */

/** @type {HandlerFn<IdentifiableUser>} */
export async function getSelf(_matches, sessionUser, _body, _query, _stream, handlerPerformance) {
	const userId = await userStore.fromToken(sessionUser.tokens.access, handlerPerformance)

	const requestedUserObject = await timed(
		TIMING.USER_SELF,
		handlerPerformance,
		() => userStore.get(userId))

	const { user: requestedUser } = requestedUserObject

	return {
		id: await encodedUserId(userId),
		...requestedUser,
		friends: await Promise.all(requestedUser.friends.map(encodedUserId))
	}
}