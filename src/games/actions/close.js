import { Tic } from '../tic.js'
import { resolveFromStore } from './util.js'
import { gameStore } from '../../store/game.js'

export async function handleClose(id, sessionUser, body, query) {
	const { user, game, gameObject } = await resolveFromStore(id, sessionUser)

	const reason = query.get('reason')
	// console.log('closing game', game.id, reason)
	const updatedGame = Tic.close(game, user)

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