import { Tic } from '../tic.js'
import { resolveFromStore } from '../util.js'
import { gameStore } from '../../store/game.js'

/** @import { StoreGameId } from '../../store/game.js' */
/** @import { ActionableGame } from '../tic.js' */
/** @import { BodyFuture } from '../../util//body.js' */

/**
 * @param {StoreGameId} id
 * @param {{ token: string }} sessionUser
 * @param {BodyFuture} body
 * @param {URLSearchParams} query
 * @returns {Promise<ActionableGame>}
 */
export async function handleAccept(id, sessionUser, body, query) {
	const { user, game, gameObject } = await resolveFromStore(id, sessionUser)

	const updatedGame = Tic.accept(game, user)


	const updatedGameObject = {
		...gameObject,
		meta: {
			...gameObject.meta,
			updatedAt: Date.now()
		},
		game: updatedGame
	}

	await gameStore.set(gameObject._id, updatedGameObject)

	return Tic.actionable(updatedGame, user)
}