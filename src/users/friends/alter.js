import { userStore } from '../../store/user.js'

/** @import { StoreUserId } from '../../types/store.js' */
/** @import { FriendsListing } from '../../types/public.js' */

/**
 * @param {StoreUserId} userId
 * @param {boolean} add
 * @param {StoreUserId} friendId
 * @returns {Promise<FriendsListing>}
 */
async function alterFriend(userId, add, friendId) {
	const userObject = await userStore.get(userId)
	const { user } = userObject
	const { friends } = user

	const updatedFriends = new Set(friends)

	if(add) {
		if(updatedFriends.has(friendId)) {
			// already friends
			return { friends }
		}

		updatedFriends.add(friendId)
	}
	else {
		if(updatedFriends.has(userId)) {
			// not friends already
			return { friends }
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

	const ok = await userStore.set(userId, updatedUserObject)
	if(!ok) { throw new Error('updating friends not ok') }

	return { friends: [ ...updatedFriends ] }
}

/**
 * @param {StoreUserId} userId
 * @param {StoreUserId} friendId
 */
export async function addFriend(userId, friendId) { return alterFriend(userId, true, friendId) }

/**
 * @param {StoreUserId} userId
 * @param {StoreUserId} friendId
 */
export async function removeFriend(userId, friendId) { return alterFriend(userId, false, friendId) }
