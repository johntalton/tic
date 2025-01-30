import { MATCHES } from '../route.js'
import { userStore } from '../store/user.js'

const VALID_PATCH_KEYS = [ 'displayName', 'glyph' ]

export async function patchUser(matches, sessionUser, body, query) {
	const id = matches.get(MATCHES.USER_ID)

	const user = await userStore.fromToken(sessionUser.token)
	if (user === undefined) {
		throw new Error('invalid user token')
	}

	if(user !== id) { throw new Error('can only patch self') }


	const keys = Object.keys(body)
	if(keys.length <= 0) { throw new Error('no data in body') }
	for(const key of keys) {
		if(!VALID_PATCH_KEYS.includes(key)) {
			throw new Error('invalid key for user patch')
		}
	}

	const userObject = await userStore.get(id)
	if (userObject === undefined) { throw new Error('unknown user') }
	const { user: requestedUser } = userObject

	const updatedUser = {
		...requestedUser,
		...body
	}

	const updatedUserObject = {
		...userObject,
		meta: {
			...userObject.meta,
			updatedAt: Date.now()
		},
		user: updatedUser
	}

	const ok = await userStore.set(id, updatedUserObject)
	if(!ok) { throw new Error('failure to store patched user') }

	return {
		id,
		...updatedUser
	}
}