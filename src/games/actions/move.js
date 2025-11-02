import { gameStore } from '../../store/game.js'
import { Tic } from '../tic.js'
import { computeAndUpdateELO, resolveFromStore } from './util.js'

/**
 * @import { HandlerFn } from '../../util/dig.js'
 */

/** @type {HandlerFn} */
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

	await gameStore.set(game.id, updatedGameObject)

	const actionableGame = Tic.actionable(updatedGame, user)

	await computeAndUpdateELO(actionableGame)

	return {
    ...actionableGame
	}
}