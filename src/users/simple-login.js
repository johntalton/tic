import { storeUserIdFromString, userStore } from '../store/store.js'
import { ID } from '../util/id.js'
import { encodedUserId } from './util.js'
// import { isSingleGrapheme } from './grapheme.js'

export const DEFAULT_ELO = 100

/** @import { HandlerFn } from '../util/dig.js' */
/** @import { SigninInfo } from '../types/public.login.js' */

/** @type {HandlerFn<SigninInfo>} */
export async function handleSimpleLogin(matches, sessionUser, body, query, _stream, handlerPerformance) {
	const name = query.get('name')
	if(name === null) { throw new Error('missing name') }

	console.log('--- attempting simple login for', name)

	const fromId = name.startsWith('user:')

	if(fromId) {
		//
	} else {
		const now = Date.now()
		const newUserId = storeUserIdFromString(`user:${ID.generate()}`)
		const accessToken = `token:access:${ID.generate()}`
		const sseToken = `token:sse:${ID.generate()}`
		const displayName = name

		// const suggestedGlyph = '👩🏻‍❤️‍💋‍👩🏼'
		// const glyph = isSingleGrapheme(suggestedGlyph) ? suggestedGlyph : undefined

		const userObject = await userStore.create(newUserId, {
			'type': 'user.tic.v1',
			'user': {
				'displayName': displayName,
				// 'glyph': glyph,
				'friends': [
					// 'user:Agent'
				],
				'elo': DEFAULT_ELO
			},
			'session': {
			// 	'key': ',
				'token': accessToken,
				'refreshToken': '',
				'sseToken': sseToken,
			// 	'expiresAt': ',
			// 	'lastLogin': ',
			// 	'fromAddresses': []
			},
			meta: {
				createdAt: now,
				updatedAt: now
			}
		})


		// console.log('created user', user)

		return {
			id: await encodedUserId(newUserId),
			displayName,
			accessToken,
			sseToken
		}
	}

	throw new Error('invalid user')
}