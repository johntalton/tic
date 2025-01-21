import { Tic } from './tic.js'
import { gameStore } from '../store/game.js'
import { userStore } from '../store/user.js'

export async function handleNew(sessionUser, body, query) {
	const user = await userStore.fromToken(sessionUser.token)
	if(user === undefined) {
		throw new Error('invalid user token')
	}

	const now = Date.now()

	const game = Tic.create(user)
	game.id = crypto.randomUUID() // `game:${user}-${now}`

	// const targets = query.getAll('t')
	// const offer = { targets }
	// const updatedGame = Tic.offer(game, user, offer)

	// const autoAccept = query.get('a') ?? query.get('accept')
	// const updatedGame = Tic.accept(game, user)

	const ok = await gameStore.set(game.id, {
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

	return Tic.actionable(game, user)
}