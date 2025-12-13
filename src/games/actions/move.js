import { gameStore } from '../../store/game.js'
import { Tic } from '../tic.js'
import { computeAndUpdateELO, resolveFromStore } from '../util.js'

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
export async function handleMove(id, sessionUser, body, query) {
	const { user, game, gameObject } = await resolveFromStore(id, sessionUser)

	// console.log('handleMove - ', body, query)
	const positionStr = query.get('position')
	if(positionStr === null) { throw new Error('missing move position') }
	const position = parseInt(positionStr, 10)
	const positionPlayerId = game.board[position]
	if(positionPlayerId !== 0) { throw new Error('invalid move position') }

	// const game = await gameStore.get(id)
 	const updatedGame = Tic.move(game, user, { position })

	const updatedGameObject = {
		...gameObject,
		meta: {
			...gameObject.meta,
			updatedAt: Date.now()
		},
		game: updatedGame
	}

	await gameStore.set(gameObject._id, updatedGameObject)

	const actionableGame = Tic.actionable(updatedGame, user)

	await computeAndUpdateELO(actionableGame)

	return actionableGame
}