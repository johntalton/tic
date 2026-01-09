
import { MATCHES } from '../../route.js'
import { isStoreUserId, userStore } from '../../store/couch/user.js'
import { removeFriend } from './alter.js'

/** @import { HandlerFn } from '../../util/dig.js' */
/** @import { FriendsListing } from '../../types/public.js' */

// /u/USER/friend/FRIEND
// removing FRIEND to USER
/** @type {HandlerFn<FriendsListing>} */
export async function handleRemoveFriend(matches, sessionUser, _body, _query, _stream, handlerPerformance) {
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
    // unfriending yourself
    throw new Error('you cant unfriend yourself')
  }

  return removeFriend(forUserId, friendId, handlerPerformance)
}

// /u/USER
// removing USER as friend to Self
/** @type {HandlerFn<FriendsListing>} */
export async function handleRemoveUserAsFriend(matches, sessionUser, _body, _query, _stream, handlerPerformance) {
  if(sessionUser.tokens.access === undefined) { throw new Error('access token required') }
	const userId = await userStore.fromToken(sessionUser.tokens.access, handlerPerformance)

  const friendUserId = matches.get(MATCHES.USER_ID)
  if(friendUserId === undefined) { throw new Error('can not remove unknown friend') }
	if(!isStoreUserId(friendUserId)) { throw new Error('invalid id brand') }

  if(friendUserId === userId) {
    // Unfriend yourself, sad
    throw new Error('you cant unfriend yourself')
  }

  return removeFriend(userId, friendUserId, handlerPerformance)
}


