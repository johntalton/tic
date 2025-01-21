import { Tic } from '../tic.js'
import { resolveFromStore } from './util.js'
import { gameStore } from '../../store/game.js'

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

	await gameStore.set(game.id, updatedGameObject)

	const actionableGame = Tic.actionable(updatedGame, user)

	return {
		...actionableGame
	}
}