import { gameStore } from '../store/game.js'
import { userStore } from '../store/user.js'
import { identifiableGameId } from './util.js'

/**
 * @import { HandlerFn } from '../util/dig.js'
 */

/** @type {HandlerFn} */
export async function handleList(matches, sessionUser, body, query) {
	const user = await userStore.fromToken(sessionUser.token)
	if(user === undefined) {
		throw new Error('invalid user token')
	}

	const allDBGames = await gameStore.list(user)
	const allGames = await Promise.all(allDBGames.map(async game => {
		const id = await identifiableGameId(game._id)
		return {
			...game,
			_id: undefined,
			id,
		}
	}))

	const stateFilter = query.get('f') ?? query.get('filter') ?? ''
	if(stateFilter === '*') { return { games: allGames }}

	const stateFilterList = stateFilter.split('|')
	const games = allGames.filter(row => stateFilterList.includes(row.state))

	return {
		games
	}
}