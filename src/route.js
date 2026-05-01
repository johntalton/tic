import { MIME_TYPE_EVENT_STREAM } from '@johntalton/http-util/headers'

import { handleAction } from './games/actions/index.js'
import { handleGameFeed } from './games/feed.js'

import {
	handleGame,
	handleList,
	handleNew
} from './games/index.js'
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
import {
	DELETE,
	GET,
	MATCH,
	METADATA,
	NAME,
	PATCH,
	POST,
} from './util/dig.js'

/**
 * @import { RouteDefinition } from './util/dig.js'
 */

export const MATCHES = {
	USER_ID: 'userId',
	GAME_ID: 'gameId',
	FRIEND_ID: 'friendId',
	ACTION: 'action'
}

/** @type {RouteDefinition<any>} */
export const GAMES_ROUTE =  {
	[GET]: handleList,
	//[POST]: handleNew
}

/** @type {RouteDefinition<any>} */
export const GAME_ROUTE = {
	[POST]: handleNew,
	[MATCH]: {
		// [METADATA]: { encodings: [ ] },
		[NAME]: MATCHES.GAME_ID,
		[GET]: handleGame,
		[MATCH]: {
			[NAME]: MATCHES.ACTION,
			[PATCH]: handleAction
		}
	}
}

/** @type {RouteDefinition<any>} */
export const FRIENDS_ROUTE = {
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

/** @type {RouteDefinition<any>} */
export const USERS_ROUTE = {
	[GET]: listUsers,
}

/** @type {RouteDefinition<any>} */
export const USER_ROUTE = {
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

/** @type {RouteDefinition<any>} */
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

