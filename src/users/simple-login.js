import { storeUserIdFromString, userStore } from '../store/store.js'
import { ID } from '../util/id.js'
// import { isSingleGrapheme } from './grapheme.js'
import { TIMING, timed } from '../util/timing.js'
import { accessTokenFromString, refreshTokenFromString, sseTokenFromString } from '../util/token.js'
import { encodedUserId } from './util.js'

export const DEFAULT_ELO = 100

/** @import { HandlerFn } from '../util/dig.js' */
/** @import { SigninInfo } from '../types/public.login.js' */
/** @import { StoreUserEnvelopeBase } from '../types/store.user.js' */

/** @type {HandlerFn<SigninInfo>} */
export async function handleSimpleLogin(_matches, _sessionUser, _body, query, _stream, handlerPerformance) {
	const name = query.get('name')
	if(name === null) { throw new Error('missing name') }

	console.log('--- attempting simple login for', name)

	const fromId = name.startsWith('user:')

	if(fromId) {
		//
	} else {
		const now = Date.now()
		const newUserId = storeUserIdFromString(`user:${ID.generate()}`)
		const accessToken = accessTokenFromString(`token:access:${ID.generate()}`)
		const sseToken = sseTokenFromString(`token:sse:${ID.generate()}`)
		const refreshToken = refreshTokenFromString(`token:refresh:${ID.generate()}`)
		const displayName = name

		// const suggestedGlyph = '👩🏻‍❤️‍💋‍👩🏼'
		// const glyph = isSingleGrapheme(suggestedGlyph) ? suggestedGlyph : undefined

		/** @type {StoreUserEnvelopeBase} */
		const userOptions = {
			'type': 'user.tic.v1',
			'user': {
				'displayName': displayName,
				// 'glyph': glyph,
				'friends': [
					storeUserIdFromString('user:Agent')
				],
				'elo': DEFAULT_ELO
			},
			'session': {
			// 	'key': ',
				'token': accessToken,
				'refreshToken': refreshToken,
				'sseToken': sseToken,
			// 	'expiresAt': ',
			// 	'lastLogin': ',
			// 	'fromAddresses': []
			},
			meta: {
				createdAt: now,
				updatedAt: now
			}
		}

		const userObject = await timed(
			TIMING.USER_CREATE,
			handlerPerformance,
			() => userStore.create(newUserId, userOptions)
		)


		console.log('created user', userObject)

		return {
			id: await encodedUserId(newUserId),
			displayName,
			accessToken,
			sseToken,
			refreshToken
		}
	}

	throw new Error('invalid user')
}