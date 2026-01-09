import { userStore } from '../store/user.js'
import { timed, TIMING } from '../util/timing.js'

/** @import { HandlerFn } from '../util/dig.js' */
/** @import { IdentifiableUser } from '../types/public.js' */

/** @type {HandlerFn<IdentifiableUser>} */
export async function getSelf(_matches, sessionUser, _body, _query, _stream, handlerPerformance) {
	if(sessionUser.tokens.access === undefined) { throw new Error('access token required') }
	const userId = await userStore.fromToken(sessionUser.tokens.access, handlerPerformance)

	const requestedUserObject = await timed(
		TIMING.USER_SELF,
		handlerPerformance,
		() => userStore.get(userId))

	if(requestedUserObject === undefined) { throw new Error('unknown user') }

	const { user: requestedUser } = requestedUserObject

	return {
		id: userId,
		...requestedUser
	}
}