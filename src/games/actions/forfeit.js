import { gameStore } from '../../store/store.js'
import { timed, TIMING } from '../../util/timing.js'
import { Tic } from '../tic.js'
import { resolveFromStore } from '../util.js'

/** @import { StoreUserId } from '../../types/store.js' */
/** @import { EncodedGameId } from '../../types/public.js' */
/** @import { ActionableGame } from '../tic.js' */
/** @import { BodyFuture } from '@johntalton/http-util/body' */
/** @import { TimingsInfo } from '@johntalton/http-util/headers' */

/**
 * @param {EncodedGameId} encodedGameId
 * @param {StoreUserId} userId
 * @param {BodyFuture} _body
 * @param {URLSearchParams} _query
 * @param {Array<TimingsInfo>} handlerPerformance
 * @returns {Promise<ActionableGame>}
 */
export async function handleForfeit(encodedGameId, userId, _body, _query, handlerPerformance) {
	const { game, gameObject } = await resolveFromStore(encodedGameId, userId, handlerPerformance)

	const updatedGame = Tic.forfeit(game, userId)

	const updatedGameObject = {
		...gameObject,
		meta: {
			...gameObject.meta,
			updatedAt: Date.now()
		},
		game: updatedGame
	}

	await timed(
		TIMING.GAME_FORFEIT,
		handlerPerformance,
		() => gameStore.set(gameObject._id, updatedGameObject))

	return Tic.actionable(updatedGame, userId)
}