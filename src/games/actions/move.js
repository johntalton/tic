import { gameStore } from '../../store/couch/game.js'
import { timed, TIMING } from '../../util/timing.js'
import { Tic } from '../tic.js'
import { computeAndUpdateELO, resolveFromStore } from '../util.js'

/** @import { StoreUserId } from '../../types/store.js' */
/** @import { EncodedGameId } from '../../types/public.js' */
/** @import { ActionableGame } from '../tic.js' */
/** @import { BodyFuture } from '../../util//body.js' */
/** @import { TimingsInfo } from '../../util/server-timing.js' */

/**
 * @param {EncodedGameId} encodedGameId
 * @param {StoreUserId} userId
 * @param {BodyFuture} _body
 * @param {URLSearchParams} query
 * @param {Array<TimingsInfo>} handlerPerformance
 * @returns {Promise<ActionableGame>}
 */
export async function handleMove(encodedGameId, userId, _body, query, handlerPerformance) {
	const { game, gameObject } = await resolveFromStore(encodedGameId, userId, handlerPerformance)

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

	await timed(
		TIMING.GAME_MOVE,
		handlerPerformance,
		() => gameStore.set(gameObject._id, updatedGameObject))

	const actionableGame = Tic.actionable(updatedGame, userId)

	await computeAndUpdateELO(actionableGame, handlerPerformance)

	return actionableGame
}