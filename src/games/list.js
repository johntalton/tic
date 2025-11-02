import { gameStore } from '../store/game.js'
import { userStore } from '../store/user.js'

/**
 * @import { HandlerFn } from '../util/dig.js'
 */

/** @type {HandlerFn} */
export async function handleList(matches, sessionUser, body, query) {
	const user = await userStore.fromToken(sessionUser.token)
	if(user === undefined) {
		throw new Error('invalid user token')
	}

	const allGames = await gameStore.list(user)

	const stateFilter = query.get('f') ?? query.get('filter') ?? ''
	const stateFilterList = stateFilter.split('|')
	const games = allGames.filter(row => stateFilterList.includes(row.state))


	return {
		games
	}
}