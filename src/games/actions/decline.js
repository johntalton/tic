import { gameStore } from '../../store/game.js'
import { userStore } from '../../store/user.js'
import { Tic } from '../tic.js'
import { resolveFromStore } from '../util.js'

/** @import { StoreUserId } from '../../types/store.js' */
/** @import { EncodedGameId } from '../../types/public.js' */
/** @import { ActionableGame } from '../tic.js' */
/** @import { BodyFuture } from '../../util//body.js' */

/**
 * @param {EncodedGameId} id
 * @param {StoreUserId} userId
 * @param {BodyFuture} body
 * @param {URLSearchParams} query
 * @returns {Promise<ActionableGame>}
 */
export async function handleDecline(id, userId, body, query) {
	const { game, gameObject } = await resolveFromStore(id, userId)

	const updatedGame = Tic.decline(game, userId)

	const updatedGameObject = {
		...gameObject,
		meta: {
			...gameObject.meta,
			updatedAt: Date.now()
		},
		game: updatedGame
	}

	await gameStore.set(gameObject._id, updatedGameObject)

	return Tic.actionable(updatedGame, userId)
}