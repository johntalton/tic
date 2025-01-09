import { gameStore } from '../../store/game.js'
import { Tic } from '../tic.js'
import { resolveFromStore } from './util.js'

export async function handleMove(id, sessionUser, body, query) {
	const { user, game, gameObject } = await resolveFromStore(id, sessionUser)

	// console.log('handleMove - ', body, query)
	const positionStr = query.get('position')
	const position = parseInt(positionStr, 10)
	const positionPlayerId = game.board[position]
	if(positionPlayerId !== 0) { throw new Error('invalid move position') }

	// const game = await gameStore.get(id)
 	const updatedGame = Tic.move(game, user, { position })

	const updatedGameObject = {
		...gameObject,
		game: updatedGame
	}

	await gameStore.set(game.id, updatedGameObject)

	const actionableGame = Tic.actionable(updatedGame, user)

	return {
    ...actionableGame
	}
}