import { Tic } from '../tic.js'
import { resolveFromStore } from '../util.js'
import { gameStore } from '../../store/store.js'
import { timed, TIMING } from '../../util/timing.js'

/** @import { ActionHandlerFn } from './index.js' */
/** @import { StoreGameEnvelope } from '../../types/store.game.js' */

/** @type {ActionHandlerFn} */
export async function handleClose(encodedGameId, userId, _body, query, handlerPerformance) {
	const { game, gameObject } = await resolveFromStore(encodedGameId, userId, handlerPerformance)

	const reason = query.get('reason') ?? 'unspecified'
	const updatedGame = Tic.close(game, userId, reason)

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
		TIMING.GAME_CLOSE,
		handlerPerformance,
		() => gameStore.set(gameObject.storeGameId, updatedGameObject))

	return Tic.actionable(updatedGame, userId)
}