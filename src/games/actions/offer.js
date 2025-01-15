import { gameStore } from '../../store/game.js'
import { Tic } from '../tic.js'
import { resolveFromStore } from './util.js'

export async function handleOffer(id, sessionUser, body, query) {
	const { user, game, gameObject } = await resolveFromStore(id, sessionUser)

	const targets = query.getAll('t')
	const offer = { targets }
	const updatedGame = Tic.offer(game, user, offer)

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