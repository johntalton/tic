import { MATCHES } from '../../route.js'
import { isStoreUserId, userStore } from '../../store/store.js'
import { fromEncodedUserId, isEncodedUserId } from '../util.js'
import { addFriend } from './alter.js'

/** @import { HandlerFn } from '../../util/dig.js' */
/** @import { FriendsListing } from '../../types/public.user.js' */

// /u/USER/friend/FRIEND
// adding FRIEND to USER
/** @type {HandlerFn<FriendsListing>} */
export async function handleAddFriend(matches, sessionUser, _body, _query, _stream, handlerPerformance) {
	const userId = await userStore.fromToken(sessionUser.tokens.access, handlerPerformance)

	const encodedFriendId = matches.get(MATCHES.FRIEND_ID)
	const forEncodedUserId = matches.get(MATCHES.USER_ID)

	if(!isEncodedUserId(encodedFriendId)) { throw new Error('invalid friend id brand') }
	if(!isEncodedUserId(forEncodedUserId)) { throw new Error('invalid id brand') }

	const forUserId = await fromEncodedUserId(forEncodedUserId)
	const friendId = await fromEncodedUserId(encodedFriendId)

	if(forUserId !== userId) {
		throw new Error('unable to modify other peoples friends')
	}

	if(forUserId === friendId) {
		// Friending yourself, thats nice
		throw new Error('you are always your own friend')
	}

	return addFriend(forUserId, friendId, handlerPerformance)
}

// /u/USER/friend
// adding USER as friend to Self
/** @type {HandlerFn<FriendsListing>} */
export async function handleAddUserAsFriend(matches, sessionUser, _body, _query, _stream, handlerPerformance) {
	const userId = await userStore.fromToken(sessionUser.tokens.access, handlerPerformance)

	const friendEncodedUserId = matches.get(MATCHES.USER_ID)
	if(!isEncodedUserId(friendEncodedUserId)) { throw new Error('invalid id brand') }

	const friendUserId = await fromEncodedUserId(friendEncodedUserId)

	if(friendUserId === userId) {
		// Friending yourself, thats nice
		throw new Error('your always your own friend')
	}

	return addFriend(userId, friendUserId, handlerPerformance)
}


