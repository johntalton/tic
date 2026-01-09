/** @import { TokenSet, Token, SSEToken, RefreshToken } from '../types/global.js' */

export const SPACE_CHAR = ' '
export const BEARER = 'Bearer'

/**
 * @param {string} str
 * @returns {Token}
 */
export function accessTokenFromString(str) {
	return /** @type {Token} */ (str)
}

/**
 * @param {string} str
 * @returns {SSEToken}
 */
export function sseTokenFromString(str) {
	return /** @type {SSEToken} */ (str)
}

/**
 * @param {string|undefined} authorizationHeader
 * @returns {Token|undefined}
 */
export function accessToken(authorizationHeader) {
	if(authorizationHeader === undefined) { return undefined }

	const [ bearer, token ] = authorizationHeader.split(SPACE_CHAR)
	if(bearer !== BEARER) { throw new Error('authorization type not Bearer') }
	if(token == undefined || token === '') { return undefined }
	return accessTokenFromString(token)
}

/**
 * @param {URLSearchParams} query
 * @returns {SSEToken|undefined}
 */
export function sseToken(query) {
	if(!query.has('token')) { return undefined }
	const sseToken = query.get('token') ?? undefined
	if(sseToken === undefined) { return undefined}
	return sseTokenFromString(sseToken)
}

/**
 * @param {string|undefined} authorizationHeader
 * @param {URLSearchParams} query
 * @returns {TokenSet}
 */
export function getTokens(authorizationHeader, query) {
	return {
		access: accessToken(authorizationHeader),
		sse: sseToken(query),
		refresh: undefined
	}
}