import { Tic } from '../tic.js'
import { resolveFromStore } from './util.js'

export async function handleOffer(id, sessionUser, body, query) {
	const { user, game } = await resolveFromStore(id, sessionUser)

	// console.log('offer to', offer)
	const updatedGame = Tic.offer(game, user, offer)

	// todo store

	const actionableGame = Tic.actionable(updatedGame, user)

	return {
		...actionableGame
	}
}