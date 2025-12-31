import { Tic } from './tic.js'
import { gameStore, storeGameIdFromString } from '../store/game.js'
import { userStore } from '../store/user.js'
import { identifiableGame } from './util.js'

/** @import { HandlerFn } from '../util/dig.js' */
/** @import { IdentifiableActionableGame } from '../types/public.js' */

/** @type {HandlerFn<IdentifiableActionableGame>} */
export async function handleNew(matches, sessionUser, body, query) {
	if(sessionUser.tokens.access === undefined) { throw new Error('access token required') }
	const userId = await userStore.fromToken(sessionUser.tokens.access)

	const now = Date.now()

	const game = Tic.create(userId)
	const gameId = storeGameIdFromString(crypto.randomUUID())

	const ok = await gameStore.set(gameId, {
		type: 'game.tic.v1',
		meta: {
			createdAt: now,
			updatedAt: now
		},
		game
	})

	if(!ok) { throw new Error('store failure') }

	const actionableGame = Tic.actionable(game, userId)
	return identifiableGame(gameId, actionableGame)
}