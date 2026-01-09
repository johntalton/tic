import { gameStore } from '../store/couch/game.js'
import { userStore } from '../store/couch/user.js'
import { timed, TIMING } from '../util/timing.js'
import { identifiableGameId } from './util.js'

/** @import { HandlerFn } from '../util/dig.js' */
/** @import { GameListing } from '../types/public.js' */

export const QUERY_FILTER = 'filter'
export const QUERY_FILTER_SHORT = 'f'
export const FILTER_ALL = '*'
export const FILTER_SEPARATOR = '|'
export const FILTER_BLANK = ''

/** @type {HandlerFn<GameListing>} */
export async function handleList(_matches, sessionUser, _body, query, _stream, handlerPerformance) {
	if(sessionUser.tokens.access === undefined) { throw new Error('access token required') }
	const userId = await userStore.fromToken(sessionUser.tokens.access, handlerPerformance)

	const allDBGames = await timed(
		TIMING.GAME_LIST,
		handlerPerformance,
		() => gameStore.list(userId))

	const allGames = await Promise.all(allDBGames.map(async game => {
		const id = await identifiableGameId(game._id)
		return {
			...game,
			_id: undefined,
			id,
		}
	}))

	const stateFilter = query.get(QUERY_FILTER_SHORT) ?? query.get(QUERY_FILTER) ?? FILTER_BLANK
	if(stateFilter === FILTER_ALL) { return { games: allGames }}

	const stateFilterList = stateFilter.split(FILTER_SEPARATOR)
	const games = allGames.filter(row => stateFilterList.includes(row.state))

	return {
		games
	}
}