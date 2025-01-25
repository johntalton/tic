import { userStore } from '../store/user.js'

export async function getUser(id, sessionUser, query) {
	const user = await userStore.fromToken(sessionUser.token)
	if (user === undefined) {
		throw new Error('invalid user token')
	}

	const requestedUserObject = await userStore.get(id)
	if(requestedUserObject === undefined) { throw new Error('unknown user') }

	const { user: requestedUser } = requestedUserObject

	return {
		id,
		...requestedUser
	}
}
