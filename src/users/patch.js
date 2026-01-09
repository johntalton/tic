import { MATCHES } from '../route.js'
import { isStoreUserId, userStore } from '../store/user.js'
import { timed, TIMING } from '../util/timing.js'

/** @import { HandlerFn } from '../util/dig.js' */
/** @import { UserPatchOptions, IdentifiableUser } from '../types/public.js' */

export const VALID_PATCH_KEYS = [ 'displayName', 'glyph' ]

/**
 * @param {any} body
 * @returns {body is UserPatchOptions}
 */
function isPatchSafe(body) {
	for(const key of Object.keys(body)) {
		if(!VALID_PATCH_KEYS.includes(key)) {
			return false
		}
	}

	return true
}

/** @type {HandlerFn<IdentifiableUser>} */
export async function patchUser(matches, sessionUser, requestBody, _query, _stream, handlerPerformance) {
	const patchUserId = matches.get(MATCHES.USER_ID)
	if(patchUserId === undefined) { throw new Error('unspecified user') }
	if(!isStoreUserId(patchUserId)) { throw new Error('invalid user id brand') }

	if(sessionUser.tokens.access === undefined) { throw new Error('access token required') }
	const userId = await userStore.fromToken(sessionUser.tokens.access, handlerPerformance)

	if(userId !== patchUserId) { throw new Error('can only patch self') }

	const body = await requestBody.json()

	if(Object.keys(body).length === 0) {
		throw new Error('empty patch set')
	}

	if(!isPatchSafe(body)) {
		throw new Error('invalid patch keys')
	}

	const userObject = await timed(
		TIMING.USER_PATCH_GET,
		handlerPerformance,
		() => userStore.get(patchUserId))

	if (userObject === undefined) { throw new Error('unknown user') }
	const { user: requestedUser } = userObject

	const updatedUser = {
		...requestedUser,
		displayName: body.displayName ?? requestedUser.displayName,
		glyph: body.glyph ?? requestedUser.glyph
	}

	const updatedUserObject = {
		...userObject,
		meta: {
			...userObject.meta,
			updatedAt: Date.now()
		},
		user: updatedUser
	}

	const ok = await timed(
		TIMING.USER_PATCH_SET,
		handlerPerformance,
		() => userStore.set(patchUserId, updatedUserObject))

	if(!ok) { throw new Error('failure to store patched user') }

	return {
		id: patchUserId,
		...updatedUser
	}
}