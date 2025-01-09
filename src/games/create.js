import { Tic, isViewable } from './tic.js'
import { gameStore } from '../store/game.js'
import { userStore } from '../store/user.js'

export async function handleNew(sessionUser, body, query) {
	const user = await userStore.fromToken(sessionUser.token)
	if(user === undefined) {
		throw new Error('invalid user token')
	}

	const game = Tic.create(user)

	const ok = await gameStore.set(game.id, {
		type: 'game.tic.v1',
		game
	})

	if(!ok) {
		throw new Error('store failure')
	}

	// if(isViewable(game, user)) {
	// 	user.notify(game)
	// }

	return Tic.actionable(game, user)
}