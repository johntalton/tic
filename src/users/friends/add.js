import { MATCHES } from '../../route.js'
import { userStore } from '../../store/user.js'
import { addFriend } from './alter.js'

// /u/USER/friend/FRIEND
// adding FRIEND to USER
export async function handleAddFriend(matches, sessionUser, body, query) {
	const user = await userStore.fromToken(sessionUser.token)
  if (user === undefined) {
    throw new Error('invalid user token')
  }

	const friendId = matches.get(MATCHES.FRIEND_ID)
	const userId = matches.get(MATCHES.USER_ID)

	if(userId !== user) {
		throw new Error('unable to modify other peoples friends')
	}

	if(userId === friendId) {
		// Friending yourself, thats nice
		throw new Error('your always your own friend')
	}

	return addFriend(userId, friendId)
}

// /u/USER
// adding USER as friend to Self
export async function handleAddUserAsFriend(matches, sessionUser, body, query) {
	const user = await userStore.fromToken(sessionUser.token)
  if (user === undefined) {
    throw new Error('invalid user token')
  }

	const userId = matches.get(MATCHES.USER_ID)

	if(userId === user) {
		// Friending yourself, thats nice
		throw new Error('your always your own friend')
	}

	return addFriend(user, userId)
}


