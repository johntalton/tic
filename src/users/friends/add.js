import { MATCHES } from '../../route.js'
import { isStoreUserId, userStore } from '../../store/couch/user.js'
import { addFriend } from './alter.js'

/** @import { HandlerFn } from '../../util/dig.js' */
/** @import { FriendsListing } from '../../types/public.js' */

// /u/USER/friend/FRIEND
// adding FRIEND to USER
/** @type {HandlerFn<FriendsListing>} */
export async function handleAddFriend(matches, sessionUser, _body, _query, _stream, handlerPerformance) {
	if(sessionUser.tokens.access === undefined) { throw new Error('access token required') }
	const userId = await userStore.fromToken(sessionUser.tokens.access, handlerPerformance)

	const friendId = matches.get(MATCHES.FRIEND_ID)
	const forUserId = matches.get(MATCHES.USER_ID)

	if(friendId === undefined) { throw new Error('unknown friend id') }
	if(!isStoreUserId(friendId)) { throw new Error('invalid friend id brand') }

	if(forUserId === undefined) { throw new Error('unknown id') }
	if(!isStoreUserId(forUserId)) { throw new Error('invalid id brand') }

	if(forUserId !== userId) {
		throw new Error('unable to modify other peoples friends')
	}

	if(forUserId === friendId) {
		// Friending yourself, thats nice
		throw new Error('you are always your own friend')
	}

	return addFriend(forUserId, friendId, handlerPerformance)
}

// /u/USER
// adding USER as friend to Self
/** @type {HandlerFn<FriendsListing>} */
export async function handleAddUserAsFriend(matches, sessionUser, _body, _query, _stream, handlerPerformance) {
	if(sessionUser.tokens.access === undefined) { throw new Error('access token required') }
	const userId = await userStore.fromToken(sessionUser.tokens.access, handlerPerformance)

	const friendUserId = matches.get(MATCHES.USER_ID)

	if(friendUserId === undefined) { throw new Error('can not add unknown friend') }
	if(!isStoreUserId(friendUserId)) { throw new Error('invalid id brand') }

	if(friendUserId === userId) {
		// Friending yourself, thats nice
		throw new Error('your always your own friend')
	}

	return addFriend(userId, friendUserId, handlerPerformance)
}


