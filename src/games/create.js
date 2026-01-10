import { Tic } from './tic.js'
import { gameStore, storeGameIdFromString } from '../store/store.js'
import { userStore } from '../store/couch/user.js'
import { identifiableGame } from './util.js'
import { timed, TIMING } from '../util/timing.js'

/** @import { HandlerFn } from '../util/dig.js' */
/** @import { IdentifiableActionableGame } from '../types/public.js' */

/** @type {HandlerFn<IdentifiableActionableGame>} */
export async function handleNew(_matches, sessionUser, _body, _query, _stream, handlerPerformance) {
	if(sessionUser.tokens.access === undefined) { throw new Error('access token required') }
	const userId = await userStore.fromToken(sessionUser.tokens.access, handlerPerformance)

	const now = Date.now()

	const game = Tic.create(userId)
	const gameId = storeGameIdFromString(crypto.randomUUID())

	const ok = await timed(
		TIMING.GAME_CREATE,
		handlerPerformance,
		() => gameStore.set(gameId, {
			type: 'game.tic.v1',
			meta: {
				createdAt: now,
				updatedAt: now
			},
			game
		}))

	if(!ok) { throw new Error('store failure') }

	const actionableGame = Tic.actionable(game, userId)
	return identifiableGame(gameId, actionableGame)
}