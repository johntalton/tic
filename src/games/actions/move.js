import { gameStore } from '../../store/store.js'
import { TIMING, timed } from '../../util/timing.js'
import { EMPTY, GameManager } from '../game.js'
import { computeAndUpdateELO, resolveFromStore } from '../util.js'

/** @import { ActionHandlerFn } from './index.js' */
/** @import { StoreGameEnvelope } from '../../types/store.game.js' */

/** @type {ActionHandlerFn} */
export async function handleMove(encodedGameId, userId, _body, query, handlerPerformance) {
	const { game, gameObject } = await resolveFromStore(encodedGameId, userId, handlerPerformance)

	const positionStr = query.get('position') ?? query.get('p')
	if(positionStr === null) { throw new Error('missing move position') }
	const position = Number.parseInt(positionStr, 10)

	// const positionPlayerId = game.board[position]
	// if(positionPlayerId !== EMPTY) { throw new Error('invalid move position') }

 	const updatedGame = GameManager.move(game, userId, { position })

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
		TIMING.GAME_MOVE,
		handlerPerformance,
		() => gameStore.set(gameObject.storeGameId, updatedGameObject))

	const actionableGame = GameManager.actionable(updatedGame, userId)

	await computeAndUpdateELO(actionableGame, handlerPerformance)
		.catch(error => console.warn('error updating elo', error))

	return actionableGame
}