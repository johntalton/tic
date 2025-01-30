import { Tic, isViewable } from './tic.js'
import { resolveFromStore } from './actions/util.js'
import { MATCHES } from '../route.js'

export async function handleGame(matches, sessionUser, body, query) {
	const id = matches.get(MATCHES.GAME_ID)
	const { user, game } = await resolveFromStore(id, sessionUser)

	if(!isViewable(game, user)) {
		throw new Error('not viewable')
	}

	return Tic.actionable(game, user)
}