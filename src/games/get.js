import { Tic, isViewable } from './tic.js'
import { identifiableGame, isStoreEncodedGameId, resolveFromStore } from './util.js'
import { MATCHES } from '../route.js'
import { userStore } from '../store/store.js'

/** @import { HandlerFn } from '../util/dig.js' */
/** @import { IdentifiableActionableGame } from '../types/public.game.js' */

/** @type {HandlerFn<IdentifiableActionableGame>} */
export async function handleGame(matches, sessionUser, _body, _query, _stream, handlerPerformance) {
	const encodedGameId = matches.get(MATCHES.GAME_ID)
	if(!isStoreEncodedGameId(encodedGameId)) { throw new Error('invalid encoded game id brand') }

	const userId = await userStore.fromToken(sessionUser.tokens.access, handlerPerformance)
	const { game, gameObject } = await resolveFromStore(encodedGameId, userId, handlerPerformance)

	if(!isViewable(game, userId)) {
		// console.log('not viewable', userId, game)
		throw new Error('not viewable')
	}

	const actionableGame = Tic.actionable(game, userId)
	return identifiableGame(gameObject.storeGameId, actionableGame)
}