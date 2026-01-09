import { Tic } from '../tic.js'
import { resolveFromStore } from '../util.js'
import { gameStore } from '../../store/couch/game.js'
import { timed, TIMING } from '../../util/timing.js'

/** @import { StoreUserId } from '../../types/store.js' */
/** @import { EncodedGameId } from '../../types/public.js' */
/** @import { ActionableGame } from '../tic.js' */
/** @import { BodyFuture } from '../../util//body.js' */
/** @import { TimingsInfo } from '../../util/server-timing.js' */

/**
 * @param {EncodedGameId} encodedGameId
 * @param {StoreUserId} userId
 * @param {BodyFuture} _body
 * @param {URLSearchParams} _query
 * @param {Array<TimingsInfo>} handlerPerformance
 * @returns {Promise<ActionableGame>}
 */
export async function handleAccept(encodedGameId, userId, _body, _query, handlerPerformance) {
	const { game, gameObject } = await resolveFromStore(encodedGameId, userId, handlerPerformance)

	const updatedGame = Tic.accept(game, userId)

	const updatedGameObject = {
		...gameObject,
		meta: {
			...gameObject.meta,
			updatedAt: Date.now()
		},
		game: updatedGame
	}


	await timed(
		TIMING.GAME_ACCEPT,
		handlerPerformance,
		() => gameStore.set(gameObject._id, updatedGameObject))

	return Tic.actionable(updatedGame, userId)
}