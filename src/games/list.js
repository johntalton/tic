import { gameStore } from '../store/store.js'
import { userStore } from '../store/store.js'
import { encodedUserId } from '../users/util.js'
import { SearchQueryList } from '../util/search-query-list.js'
import { timed, TIMING } from '../util/timing.js'
import { identifiableGameId } from './util.js'

/** @import { HandlerFn } from '../util/dig.js' */
/** @import { GameListing } from '../types/public.game.js' */

export const QUERY_FILTER = 'filter'
export const QUERY_FILTER_SHORT = 'f'
export const FILTER_ALL = '*'

/** @type {HandlerFn<GameListing>} */
export async function handleList(_matches, sessionUser, _body, query, _stream, handlerPerformance) {
	const userId = await userStore.fromToken(sessionUser.tokens.access, handlerPerformance)

	const allDBGames = await timed(
		TIMING.GAME_LIST,
		handlerPerformance,
		() => gameStore.list(userId))

	const allGames = await Promise.all(allDBGames.map(async game => {
		const id = await identifiableGameId(game.storeGameId)
		return {
			id,
			...game,
			owner: await encodedUserId(game.owner),
			players: await Promise.all(game.players.map(encodedUserId)),
			storeGameId: undefined
		}
	}))

	const stateFilter = SearchQueryList.get(query, {
			plural: QUERY_FILTER,
			short: QUERY_FILTER_SHORT
		})
		.map(f => f.toLowerCase())

	if(stateFilter.includes(FILTER_ALL)) { return { games: allGames }}

	const games = allGames.filter(row => stateFilter.includes(row.state.toLowerCase()))

	return {
		games
	}
}