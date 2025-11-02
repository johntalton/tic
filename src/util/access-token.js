const SPACE_CHAR = ' '
const BEARER = 'Bearer'

/**
 * @param {string|undefined} authorizationHeader
 * @param {URLSearchParams} query
 */
export function accessToken(authorizationHeader, query) {
	if(authorizationHeader !== undefined) {
		const [ bearer, token ] = authorizationHeader.split(SPACE_CHAR)
		if(bearer !== BEARER) { throw new Error('authorization type not Bearer') }
		return token
	}

	if(query.has('token')) {
		return query.get('token')
	}

	return undefined
}
