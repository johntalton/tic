import {
	GET, POST, PATCH, DELETE,
	MATCH, NAME, METADATA
} from './util/dig.js'

import {
	handleGame,
	handleList,
	handleNew
} from './games/index.js'

import {
	handleAction
} from './games/actions/index.js'

import { handleGameFeed } from './games/feed.js'

import {
	getSelf,
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
import { MIME_TYPE_EVENT_STREAM } from './util/content-type.js'

export const MATCHES = {
	USER_ID: 'userId',
	GAME_ID: 'gameId',
	FRIEND_ID: 'friendId'
}

const GAMES_ROUTE =  {
	[GET]: handleList,
	//[POST]: handleNew
}

const GAME_ROUTE = {
	[POST]: handleNew,
	[MATCH]: {
		// [METADATA]: { encodings: [ ] },
		[NAME]: MATCHES.GAME_ID,
		[GET]: handleGame,
		[MATCH]: {
			[NAME]: 'action',
			[PATCH]: handleAction
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
			[NAME]: MATCHES.FRIEND_ID,
			[PATCH]: handleAddFriend,
			[DELETE]: handleRemoveFriend
		}
	}
}

const USERS_ROUTE = {
	[GET]: listUsers,
}

const USER_ROUTE = {
	self: {
		[GET]: getSelf
	},
	[MATCH]: {
		[NAME]: MATCHES.USER_ID,
		[PATCH]: patchUser,
		[GET]: getUser,
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
				[METADATA]: { sse: true, bom: true, active: true, mimeTypes: [ MIME_TYPE_EVENT_STREAM ] },
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

