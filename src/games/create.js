import { gameStore, storeGameIdFromString, userStore } from '../store/store.js'
import { TIMING, timed } from '../util/timing.js'
import { Tic } from './tic.js'
import { identifiableGame } from './util.js'

/** @import { HandlerFn } from '../util/dig.js' */
/** @import { IdentifiableActionableGame } from '../types/public.game.js' */

/** @type {HandlerFn<IdentifiableActionableGame>} */
export async function handleNew(_matches, sessionUser, _body, _query, _stream, handlerPerformance) {
	const userId = await userStore.fromToken(sessionUser.tokens.access, handlerPerformance)

	const now = Date.now()
	const gameId = storeGameIdFromString(crypto.randomUUID())
	// console.log('created game with new id', gameId)

	const game = Tic.create(userId)

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

	const actionableGame = Tic.actionable(game, userId)
	return identifiableGame(gameId, actionableGame)
}