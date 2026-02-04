import { MATCHES } from '../route.js'
import { userStore } from '../store/store.js'
import { encodedUserId, fromEncodedUserId, isEncodedUserId } from '../users/util.js'
import { timed, TIMING } from '../util/timing.js'

/** @import { HandlerFn } from '../util/dig.js' */
/** @import { IdentifiableUser } from '../types/public.user.js' */

/** @type {HandlerFn<IdentifiableUser>} */
export async function getUser(matches, sessionUser, _body, _query, _stream, handlerPerformance) {
	const lookupEncodedUserId = matches.get(MATCHES.USER_ID)

	if(!isEncodedUserId(lookupEncodedUserId)) { throw new Error('invalid user id brand') }

	const userId = await userStore.fromToken(sessionUser.tokens.access, handlerPerformance)

	const lookupStoreUserId = await fromEncodedUserId(lookupEncodedUserId)

	const isSelf = userId === lookupStoreUserId
	if(!isSelf) {
		// should we limit access
	}

	const requestedUserObject = await timed(
		TIMING.USER_GET,
		handlerPerformance,
		() => userStore.get(lookupStoreUserId))

	const { user: requestedUser } = requestedUserObject

	return {
		id: lookupEncodedUserId,
		...requestedUser,
		friends: await Promise.all(requestedUser.friends.map(encodedUserId))
	}
}
