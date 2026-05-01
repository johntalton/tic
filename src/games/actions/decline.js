import { gameStore } from '../../store/store.js'
import { TIMING, timed } from '../../util/timing.js'
import { GameManager } from '../game.js'
import { resolveFromStore } from '../util.js'

/** @import { ActionHandlerFn } from './index.js' */
/** @import { StoreGameEnvelope } from '../../types/store.game.js'  */

/** @type {ActionHandlerFn} */
export async function handleDecline(id, userId, _body, _query, handlerPerformance) {
	const { game, gameObject } = await resolveFromStore(id, userId, handlerPerformance)

	const updatedGame = GameManager.decline(game, userId)

	/** @type {StoreGameEnvelope} */
	const updatedGameObject = {
		...gameObject,
		meta: {
			...gameObject.meta,
			updatedAt: Date.now()
		},
		game: updatedGame
	}

	await timed(
		TIMING.GAME_DECLINE,
		handlerPerformance,
		() => gameStore.set(gameObject.storeGameId, updatedGameObject))


	return GameManager.actionable(updatedGame, userId)
}