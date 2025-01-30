import { MATCHES } from '../../route.js'
import { userStore } from '../../store/user.js'

export async function handleListFriends(matches, sessionUser, body, query) {
	const user = await userStore.fromToken(sessionUser.token)
	if (user === undefined) {
		throw new Error('invalid user token')
	}

	const userId = matches.get(MATCHES.USER_ID)

	const isSelf = user === userId

	const requestedUserObject = await userStore.get(userId)
	const { user: requestedUser } = requestedUserObject
	const { friends } = requestedUser

	return { friends }
}