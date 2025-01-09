import { isViewable } from './tic.js'
import { gameStore } from '../store/game.js'
import { userStore } from '../store/user.js'

export async function handleList(sessionUser, query) {
	const user = await userStore.fromToken(sessionUser.token)
	if(user === undefined) {
		throw new Error('invalid user token')
	}

	const state = query.get('filter') ?? undefined
	const allGames = await gameStore.list(user, state)

	// console.log({ allGames })
	// const games = allGames.filter(game => isViewable(game, user))

	return {
		games: allGames
	}
}