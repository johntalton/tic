
import { MATCHES } from '../../route.js'
import { userStore } from '../../store/store.js'
import { fromEncodedUserId, isEncodedUserId } from '../util.js'
import { removeFriend } from './alter.js'

/** @import { HandlerFn } from '../../util/dig.js' */
/** @import { FriendsListing } from '../../types/public.user.js' */

// /u/USER/friend/FRIEND
// removing FRIEND to USER
/** @type {HandlerFn<FriendsListing>} */
export async function handleRemoveFriend(matches, sessionUser, _body, _query, _stream, handlerPerformance) {
	const userId = await userStore.fromToken(sessionUser.tokens.access, handlerPerformance)

	const encodedFriendId = matches.get(MATCHES.FRIEND_ID)
	const forEncodedUserId = matches.get(MATCHES.USER_ID)

	if (!isEncodedUserId(encodedFriendId)) { throw new Error('invalid friend id brand') }
	if (!isEncodedUserId(forEncodedUserId)) { throw new Error('invalid id brand') }

	const forUserId = await fromEncodedUserId(forEncodedUserId)
	const friendId = await fromEncodedUserId(encodedFriendId)

	if (forUserId !== userId) {
		throw new Error('unable to modify other peoples friends')
	}

	if (forUserId === friendId) {
		// unfriending yourself
		throw new Error('you cant unfriend yourself')
	}

	return removeFriend(forUserId, friendId, handlerPerformance)
}

// /u/USER/friend
// removing USER as friend to Self
/** @type {HandlerFn<FriendsListing>} */
export async function handleRemoveUserAsFriend(matches, sessionUser, _body, _query, _stream, handlerPerformance) {
	const userId = await userStore.fromToken(sessionUser.tokens.access, handlerPerformance)

	const friendEncodedUserId = matches.get(MATCHES.USER_ID)
	if (!isEncodedUserId(friendEncodedUserId)) { throw new Error('invalid id brand') }

	const friendUserId = await fromEncodedUserId(friendEncodedUserId)

	if (friendUserId === userId) {
		// Unfriend yourself, sad
		throw new Error('you cant unfriend yourself')
	}

	return removeFriend(userId, friendUserId, handlerPerformance)
}


