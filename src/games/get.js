import { Tic, isViewable } from './tic.js'
import { identifiableGame, resolveFromStore } from './util.js'
import { MATCHES } from '../route.js'

/**
 * @import { HandlerFn } from '../util/dig.js'
 */

/** @type {HandlerFn} */
export async function handleGame(matches, sessionUser, requestBody, query) {
	const id = matches.get(MATCHES.GAME_ID)
	if(id === undefined) { throw new Error('id invalid') }
	const { user, game, gameObject } = await resolveFromStore(id, sessionUser)

	if(!isViewable(game, user)) {
		throw new Error('not viewable')
	}

	const actionableGame = Tic.actionable(game, user)
	return identifiableGame(gameObject._id, actionableGame)
}