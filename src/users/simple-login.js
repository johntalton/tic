import { userStore } from '../store/user.js'
import { ID } from '../util/id.js'


const DEFAULT_ELO = 100

export async function handleSimpleLogin(matches, sessionUser, body, query) {
	const name = query.get('name')

	console.log('--- attempting simple login for', name)

	const fromId = name.startsWith('user:')

	if(fromId) {
		//
	} else {
		const newUserId = `user:${ID.generate()}`
		const accessToken = `token:access:${ID.generate()}`
		const sseToken = `token:sse:${ID.generate()}`
		const displayName = name
		const { id } = await userStore.create(newUserId, {
			'type': 'user.tic.v1',
			'user': {
				'displayName': displayName,
				// 'glyph': '👩🏻‍❤️‍💋‍👩🏼',
				'friends': [
					// 'alice.one'
				],
				// 'webauthn': {
				// 	'userId': webAuthNuserId
				// },
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
				createdAt: Date.now()
			}
		})


		// console.log('created user', user)

		return {
			id,
			displayName,
			accessToken
		}
	}

	throw new Error('invalid user')
}