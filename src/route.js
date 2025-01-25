import { GET, POST, PATCH, DELETE, MATCH, NAME, METADATA } from './util/dig.js'

import {
	handleGame,
	handleList,
	handleNew
} from './games/index.js'

import {
	handleAccept,
	handleClose,
	handleDecline,
	handleForfeit,
	handleMove,
	handleOffer,
} from './games/actions/index.js'

import { handleGameFeed } from './games/feed.js'

import {
	getUser,
	listUsers,
	patchUser
} from './users/index.js'

import { simpleLogin } from './users/simple-login.js'

const gamesRoute =  {
	[GET]: (matches, user, body, query) => handleList(user, query),
	//[POST]: (matches, user, body, query) => handleNew(user, body, query)
}

const gameRoute = {
	[POST]: (matches, user, body, query) => handleNew(user, body, query),
	[MATCH]: {
		[NAME]: 'gameId',
		[GET]: (matches, user, body, query) => handleGame(matches.get('gameId'), user, query),
		[MATCH]: {
			[NAME]: 'action',
			[PATCH]: (matches, user, body, query) => {
				const action = matches.get('action')
				const gameId = matches.get('gameId')
				switch(action) {
					case 'accept': return handleAccept(gameId, user, body, query)
					case 'close': return handleClose(gameId, user, body, query)
					case 'decline': return handleDecline(gameId, user, body, query)
					case 'forfeit': return handleForfeit(gameId, user, body, query)
					case 'move': return handleMove(gameId, user, body, query)
					case 'offer': return handleOffer(gameId, user, body, query)
					default: throw new Error('unknown action')
				}
			}
		}
	}
}

export const ROUTES = {
	'tic': {
		v1: {
			events: {
				[METADATA]: { sse: true, bom: true, active: true },
				[GET]: handleGameFeed
			},
			games: gamesRoute,
			game: gameRoute,
			g: {
				...gamesRoute,
			  ...gameRoute
			},
			// 'users': {
			// 	[GET]: () => console.log('get User'),
			// },
			// user: {
			// 	[MATCH]: {
			// 		[NAME]: 'userId',
			// 		[POST]: () => console.log(),
			// 		[PATCH]: () => console.log(),
			// 		[GET]: () => console.log(),
			// 		[DELETE]: () => console.log(),

			// 		friends: {
			// 			[GET]: () => console.log('get friends of userId')
			// 		},
			// 		friend: {
			// 			[POST]: () => console.log('Add userId as friend'),
			// 			[DELETE]: () => console.log('Remove userId as friend'),
			// 			[MATCH]: {
			// 				[NAME]: 'friendId',
			// 				[POST]: () => console.log('Add friendId to userId'),
			// 				[DELETE]: () => console.log('remove friend')
			// 			}
			// 		}
			// 	}
			// }
		}
	}
}