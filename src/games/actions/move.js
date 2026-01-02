import { gameStore } from '../../store/game.js'
import { Tic } from '../tic.js'
import { computeAndUpdateELO, resolveFromStore } from '../util.js'

/** @import { StoreUserId } from '../../types/store.js' */
/** @import { EncodedGameId } from '../../types/public.js' */
/** @import { ActionableGame } from '../tic.js' */
/** @import { BodyFuture } from '../../util//body.js' */

/**
 * @param {EncodedGameId} encodedGameId
 * @param {StoreUserId} userId
 * @param {BodyFuture} _body
 * @param {URLSearchParams} query
 * @returns {Promise<ActionableGame>}
 */
export async function handleMove(encodedGameId, userId, _body, query) {
	const { game, gameObject } = await resolveFromStore(encodedGameId, userId)

	const positionStr = query.get('position')
	if(positionStr === null) { throw new Error('missing move position') }
	const position = parseInt(positionStr, 10)
	const positionPlayerId = game.board[position]
	if(positionPlayerId !== 0) { throw new Error('invalid move position') }

 	const updatedGame = Tic.move(game, userId, { position })

	const updatedGameObject = {
		...gameObject,
		meta: {
			...gameObject.meta,
			updatedAt: Date.now()
		},
		game: updatedGame
	}

	await gameStore.set(gameObject._id, updatedGameObject)

	const actionableGame = Tic.actionable(updatedGame, userId)

	await computeAndUpdateELO(actionableGame)

	return actionableGame
}