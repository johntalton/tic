import { Tic, isViewable } from './tic.js'
import { resolveFromStore } from './actions/util.js'
import { MATCHES } from '../route.js'

/**
 * @import { HandlerFn } from '../util/dig.js'
 */

/** @type {HandlerFn} */
export async function handleGame(matches, sessionUser, requestBody, query) {
	const id = matches.get(MATCHES.GAME_ID)
	const { user, game } = await resolveFromStore(id, sessionUser)

	if(!isViewable(game, user)) {
		throw new Error('not viewable')
	}

	return Tic.actionable(game, user)
}