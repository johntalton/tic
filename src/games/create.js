import { gameStore, storeGameIdFromString, userStore } from '../store/store.js'
import { SearchQueryList } from '../util/search-query-list.js'
import { TIMING, timed } from '../util/timing.js'
import { isBoardType } from './boards/boards.js'
import { GameManager } from './game.js'
import { identifiableGame } from './util.js'

/** @import { HandlerFn } from '../util/dig.js' */
/** @import { IdentifiableActionableGame } from '../types/public.game.js' */

/** @type {HandlerFn<IdentifiableActionableGame>} */
export async function handleNew(_matches, sessionUser, _body, query, _stream, handlerPerformance) {
	const userId = await userStore.fromToken(sessionUser.tokens.access, handlerPerformance)

	const now = Date.now()
	const gameId = storeGameIdFromString(crypto.randomUUID())
	// console.log('created game with new id', gameId)

	const typeList = SearchQueryList.get(query, { singular: 'type', short: 't' })
	const [ type ] = typeList

	if(!isBoardType(type)) {
		throw new Error('unknown Board Type')
	}

	const game = GameManager.create(userId, type)

	const ok = await timed(
		TIMING.GAME_CREATE,
		handlerPerformance,
		() => gameStore.set(gameId, {
			type: 'game.tic.v1',
			meta: {
				createdAt: now,
				updatedAt: now
			},
			game
		}))

	if(!ok) { throw new Error('store failure') }

	const actionableGame = GameManager.actionable(game, userId)
	return identifiableGame(gameId, actionableGame)
}