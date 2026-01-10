import { gameStore } from '../../store/store.js'
import { timed, TIMING } from '../../util/timing.js'
import { Tic } from '../tic.js'
import { resolveFromStore } from '../util.js'

/** @import { StoreUserId } from '../../types/store.js' */
/** @import { EncodedGameId } from '../../types/public.js' */
/** @import { ActionableGame } from '../tic.js' */
/** @import { BodyFuture } from '@johntalton/http-util/body' */
/** @import { TimingsInfo } from '@johntalton/http-util/headers' */

/**
 * @param {EncodedGameId} encodedGameId
 * @param {StoreUserId} userId
 * @param {BodyFuture} _body
 * @param {URLSearchParams} query
 * @param {Array<TimingsInfo>} handlerPerformance
 * @returns {Promise<ActionableGame>}
 */
export async function handleOffer(encodedGameId, userId, _body, query, handlerPerformance) {
	const { game, gameObject } = await resolveFromStore(encodedGameId, userId, handlerPerformance)

	const targets = [ ...query.getAll('t'), ...query.getAll('targets'), ...query.getAll('target') ]
	const offer = { targets }
	const updatedGame = Tic.offer(game, userId, offer)

	// const autoAccept = query.get('a') ?? query.get('accept')
	// const updatedGame = Tic.accept(game, user)

	const updatedGameObject = {
		...gameObject,
		meta: {
			...gameObject.meta,
			updatedAt: Date.now()
		},
		game: updatedGame
	}

	await timed(
		TIMING.GAME_OFFER,
		handlerPerformance,
		() => gameStore.set(gameObject._id, updatedGameObject))

	return Tic.actionable(updatedGame, userId)
}