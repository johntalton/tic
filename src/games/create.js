import { Tic } from './tic.js'
import { gameStore } from '../store/game.js'
import { userStore } from '../store/user.js'
import { identifiableGame } from './util.js'

/**
 * @import { HandlerFn } from '../util/dig.js'
 */

/** @type {HandlerFn} */
export async function handleNew(matches, sessionUser, body, query) {
	const user = await userStore.fromToken(sessionUser.token)
	if(user === undefined) {
		throw new Error('invalid user token')
	}

	const now = Date.now()

	const game = Tic.create(user)
	const gameId = crypto.randomUUID() // `game:${user}-${now}`

	// const targets = query.getAll('t')
	// const offer = { targets }
	// const updatedGame = Tic.offer(game, user, offer)

	// const autoAccept = query.get('a') ?? query.get('accept')
	// const updatedGame = Tic.accept(game, user)

	const ok = await gameStore.set(gameId, {
		type: 'game.tic.v1',
		meta: {
			createdAt: now,
			updatedAt: now
		},
		game
	})

	if(!ok) {
		throw new Error('store failure')
	}

	// return Tic.actionable(game, user)
	const actionableGame = Tic.actionable(game, user)

	return identifiableGame(gameId, actionableGame)
}