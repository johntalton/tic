import { userStore } from '../../store/store.js'
import { timed, TIMING } from '../../util/timing.js'
import { encodedUserId } from '../util.js'

/** @import { FriendsListing } from '../../types/public.user.js' */
/** @import { StoreUserId } from '../../types/store.user.js' */
/** @import { TimingsInfo } from '@johntalton/http-util/headers' */

/**
 * @param {StoreUserId} userId
 * @param {boolean} add
 * @param {StoreUserId} friendId
 * @param {Array<TimingsInfo>} handlerPerformance
 * @returns {Promise<FriendsListing>}
 */
async function alterFriend(userId, add, friendId, handlerPerformance) {
	const userObject = await timed(
			TIMING.FRIENDS_ALTER_GET,
			handlerPerformance,
			() => userStore.get(userId))

	const { user } = userObject
	const { friends } = user

	const updatedFriends = new Set(friends)

	if(add) {
		if(updatedFriends.has(friendId)) {
			// already friends
			return { friends: await Promise.all(friends.map(encodedUserId)) }
		}

		updatedFriends.add(friendId)
	}
	else {
		if(updatedFriends.has(userId)) {
			// not friends already
			return { friends: await Promise.all(friends.map(encodedUserId)) }
		}

		updatedFriends.delete(friendId)
	}

	const updatedUserObject = {
		...userObject,
		user: {
			...user,
			friends: [ ...updatedFriends ]
		},
		meta: {
			...userObject.meta,
			updatedAt: Date.now()
		}
	}

	const ok = await timed(
		TIMING.FRIENDS_ALTER_SET,
		handlerPerformance,
		() => userStore.set(userId, updatedUserObject))

	if(!ok) { throw new Error('updating friends not ok') }

	return { friends: await Promise.all([ ...updatedFriends ].map(encodedUserId)) }
}

/**
 * @param {StoreUserId} userId
 * @param {StoreUserId} friendId
 * @param {Array<TimingsInfo>} handlerPerformance
 */
export async function addFriend(userId, friendId, handlerPerformance) { return alterFriend(userId, true, friendId, handlerPerformance) }

/**
 * @param {StoreUserId} userId
 * @param {StoreUserId} friendId
 * @param {Array<TimingsInfo>} handlerPerformance
 */
export async function removeFriend(userId, friendId, handlerPerformance) { return alterFriend(userId, false, friendId, handlerPerformance) }
