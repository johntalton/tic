import { MATCHES } from '../../route.js'
import { isStoreUserId, userStore } from '../../store/couch/user.js'
import { timed, TIMING } from '../../util/timing.js'

/** @import { HandlerFn } from '../../util/dig.js' */
/** @import { FriendsInfoList } from '../../types/public.js' */

/** @type {HandlerFn<FriendsInfoList>} */
export async function handleListFriends(matches, sessionUser, _body, _query, _stream, handlerPerformance) {
	if(sessionUser.tokens.access === undefined) { throw new Error('access token required') }
	const userId = await userStore.fromToken(sessionUser.tokens.access, handlerPerformance)

	const forUserId = matches.get(MATCHES.USER_ID)
	if(forUserId === undefined) { throw new Error('unspecified user') }

	if(!isStoreUserId(forUserId)) { throw new Error('invalid user id brand') }

	const isSelf = userId === forUserId
	if(!isSelf) {
		// listing other people friends, should limit?
	}

	const requestedUserObject = await timed(
		TIMING.FRIENDS_GET,
		handlerPerformance,
		() => userStore.get(forUserId))

	const { user: requestedUser } = requestedUserObject
	const { friends } = requestedUser

	if(friends === undefined || friends.length === 0) {
		return { friends: [] }
	}

	const resolvedFriends = await timed(
		TIMING.FRIENDS_LIST,
		handlerPerformance,
		() => userStore.list(forUserId, friends))

	return { friends: resolvedFriends }
}