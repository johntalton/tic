import { MATCHES } from '../route.js'
import { isStoreUserId, userStore } from '../store/user.js'

/** @import { HandlerFn } from '../util/dig.js' */
/** @import { IdentifiableUser } from '../types/public.js' */

/** @type {HandlerFn<IdentifiableUser>} */
export async function getUser(matches, sessionUser, body, query) {
	const lookupUserId = matches.get(MATCHES.USER_ID)
	if(lookupUserId === undefined) { throw new Error('unknown user') }
	if(!isStoreUserId(lookupUserId)) { throw new Error('invalid user id brand') }

	if(sessionUser.tokens.access === undefined) { throw new Error('access token required') }
	const userId = await userStore.fromToken(sessionUser.tokens.access)

	const requestedUserObject = await userStore.get(lookupUserId)
	if(requestedUserObject === undefined) { throw new Error('unknown user') }

	const { user: requestedUser } = requestedUserObject

	return {
		id: lookupUserId,
		...requestedUser
	}
}
