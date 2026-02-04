import { MATCHES } from '../route.js'
import { userStore } from '../store/store.js'
import { timed, TIMING } from '../util/timing.js'
import { encodedUserId, fromEncodedUserId, isEncodedUserId } from './util.js'

/** @import { HandlerFn } from '../util/dig.js' */
/** @import { StoreUserEnvelope, StoreUserId } from '../types/store.user.js' */
/** @import { UserPatchOptions, IdentifiableUser, User } from '../types/public.user.js' */

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
	const patchEncodedUserId = matches.get(MATCHES.USER_ID)
	if(!isEncodedUserId(patchEncodedUserId)) { throw new Error('invalid user id brand') }

	const userId = await userStore.fromToken(sessionUser.tokens.access, handlerPerformance)

	const patchUserId = await fromEncodedUserId(patchEncodedUserId)
	if(userId !== patchUserId) { throw new Error('can only patch self') }

	const body = await requestBody.json()
	if(Object.keys(body).length === 0) { throw new Error('empty patch set') }
	if(!isPatchSafe(body)) { throw new Error('invalid patch keys') }

	const userObject = await timed(
		TIMING.USER_PATCH_GET,
		handlerPerformance,
		() => userStore.get(patchUserId))

	const { user: requestedUser } = userObject

	/** @type {User<StoreUserId>} */
	const updatedUser = {
		...requestedUser,
		displayName: body.displayName ?? requestedUser.displayName,
		glyph: body.glyph ?? requestedUser.glyph
	}

	/** @type {StoreUserEnvelope} */
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
		id: patchEncodedUserId,
		...updatedUser,
		friends: await Promise.all(updatedUser.friends.map(encodedUserId))
	}
}