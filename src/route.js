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
	handleAddFriend,
	handleAddUserAsFriend,
	handleListFriends,
	handleRemoveFriend,
	handleRemoveUserAsFriend,
	listUsers,
	patchUser
} from './users/index.js'

import { handleSimpleLogin } from './users/simple-login.js'

const GAMES_ROUTE =  {
	[GET]: (matches, user, body, query) => handleList(user, query),
	//[POST]: (matches, user, body, query) => handleNew(user, body, query)
}

const GAME_ROUTE = {
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

const FRIENDS_ROUTE = {
	friends: {
		[GET]: handleListFriends
	},
	friend: {
		[PATCH]: handleAddUserAsFriend,
		[DELETE]: handleRemoveUserAsFriend,
		[MATCH]: {
			[NAME]: 'friendId',
			[PATCH]: handleAddFriend,
			[DELETE]: handleRemoveFriend
		}
	}
}

const USERS_ROUTE = {
	[GET]: (matches, user, body, query) => listUsers(user, query),
}

const USER_ROUTE = {
	[MATCH]: {
		[NAME]: 'userId',
		[PATCH]: (matches, user, body, query) => patchUser(matches.get('userId'), user, body, query),
		[GET]: (matches, user, body, query) => getUser(matches.get('userId'), user, query),
		...FRIENDS_ROUTE
	}
}

export const ROUTES = {
	authentication: {
		'simple-login': {
			[POST]: handleSimpleLogin
		}
	},
	'tic': {
		v1: {
			events: {
				[METADATA]: { sse: true, bom: true, active: true },
				[GET]: handleGameFeed
			},

			games: GAMES_ROUTE,
			game: GAME_ROUTE,
			g: {
				...GAMES_ROUTE,
			  ...GAME_ROUTE
			},

			users: USERS_ROUTE,
			user: USER_ROUTE,
			u: {
				...USERS_ROUTE,
				...USER_ROUTE
			}
		}
	}
}

