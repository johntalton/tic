import { Tic, isViewable } from './tic.js'
import { resolveFromStore } from './actions/util.js'

export async function handleGame(id, sessionUser, query) {
	const { user, game } = await resolveFromStore(id, sessionUser)

	if(!isViewable(game, user)) {
		throw new Error('not viewable')
	}

	return Tic.actionable(game, user)
}