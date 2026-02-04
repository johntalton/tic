import { MATCHES } from '../../route.js'
import { userStore } from '../../store/store.js'
import { timed, TIMING } from '../../util/timing.js'
import { encodedUserId, fromEncodedUserId, isEncodedUserId } from '../util.js'

/** @import { HandlerFn } from '../../util/dig.js' */
/** @import { FriendsInfoList } from '../../types/public.user.js' */

/** @type {HandlerFn<FriendsInfoList>} */
export async function handleListFriends(matches, sessionUser, _body, _query, _stream, handlerPerformance) {
	const userId = await userStore.fromToken(sessionUser.tokens.access, handlerPerformance)

	const forEncodedUserId = matches.get(MATCHES.USER_ID)
	if(!isEncodedUserId(forEncodedUserId)) { throw new Error('invalid user id brand') }

	const forUserId = await fromEncodedUserId(forEncodedUserId)

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

	return {
		friends: await Promise.all(resolvedFriends.map(async friend => ({
			...friend,
			storeUserId: undefined,
			id: await encodedUserId(friend.storeUserId)
		})))
	}
}