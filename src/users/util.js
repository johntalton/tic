import { storeUserIdFromString } from '../store/store.js'

/** @import { EncodedUserId } from '../types/public.user.js' */
/** @import { StoreUserId } from '../types/store.user.js' */

/**
 * @param {string|undefined} id
 * @returns {EncodedUserId}
 */
export function encodedUserIdFromString(id) {
	if(isEncodedUserId(id)) { return id }
	throw new Error(`not a encoded game id: ${id}`)
}

/**
 * @param {string|undefined} id
 * @returns {id is EncodedUserId}
 */
export function isEncodedUserId(id) {
	if(id === undefined) { return false }
	if(id === '') { return false }
	if(!id.startsWith('U:')) { return false }
	return true
}

/**
 * @param {EncodedUserId} encodedUserId
 * @returns {Promise<StoreUserId>}
 */
export async function fromEncodedUserId(encodedUserId) {
	if(!isEncodedUserId(encodedUserId)) { throw new Error('not an encoded user id') }
	return storeUserIdFromString(encodedUserId.substring(2))
}

/**
 * @param {StoreUserId} id
 * @returns {Promise<EncodedUserId>}
 */
export async function encodedUserId(id) {
	return encodedUserIdFromString(`U:${id}`)
}