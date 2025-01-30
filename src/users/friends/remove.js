
import { MATCHES } from '../../route.js'
import { userStore } from '../../store/user.js'
import { removeFriend } from './alter.js'

// /u/USER/friend/FRIEND
// removing FRIEND to USER
export async function handleRemoveFriend(matches, sessionUser, body, query) {
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
    // unfriending yourself
    throw new Error('you cant unfriend yourself')
  }

  return removeFriend(userId, friendId)
}

// /u/USER
// removing USER as friend to Self
export async function handleRemoveUserAsFriend(matches, sessionUser, body, query) {
  const user = await userStore.fromToken(sessionUser.token)
  if (user === undefined) {
    throw new Error('invalid user token')
  }

  const userId = matches.get(MATCHES.USER_ID)

  if(userId === user) {
    // Friending yourself, thats nice
    throw new Error('you cant unfriend yourself')
  }

  return removeFriend(user, userId)
}


