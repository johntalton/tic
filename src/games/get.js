import { Tic, isViewable } from './tic.js'
import { identifiableGame, isStoreEncodedGameId, resolveFromStore } from './util.js'
import { MATCHES } from '../route.js'
import { userStore } from '../store/couch/user.js'

/** @import { HandlerFn } from '../util/dig.js' */
/** @import { IdentifiableActionableGame } from '../types/public.js' */

/** @type {HandlerFn<IdentifiableActionableGame>} */
export async function handleGame(matches, sessionUser, _body, _query, _stream, handlerPerformance) {
	const gameId = matches.get(MATCHES.GAME_ID)
	if(gameId === undefined) { throw new Error('id invalid') }
	if(!isStoreEncodedGameId(gameId)) { throw new Error('invalid encoded game id brand') }

	if(sessionUser.tokens.access === undefined) { throw new Error('access token required') }
	const userId = await userStore.fromToken(sessionUser.tokens.access, handlerPerformance)
	const { game, gameObject } = await resolveFromStore(gameId, userId, handlerPerformance)

	if(!isViewable(game, userId)) {
		throw new Error('not viewable')
	}

	const actionableGame = Tic.actionable(game, userId)
	return identifiableGame(gameObject._id, actionableGame)
}