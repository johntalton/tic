import { gameStore } from '../../store/store.js'
import { encodedUserIdFromString, fromEncodedUserId } from '../../users/util.js'
import { SearchQueryList } from '../../util/search-query-list.js'
import { timed, TIMING } from '../../util/timing.js'
import { Tic } from '../tic.js'
import { resolveFromStore } from '../util.js'

/** @import { ActionHandlerFn } from './index.js' */
/** @import { StoreGameEnvelope } from '../../types/store.game.js' */
/** @import { StoreUserId } from '../../types/store.user.js' */
/** @import { Offer } from '../tic.js' */

/** @type {ActionHandlerFn} */
export async function handleOffer(encodedGameId, userId, _body, query, handlerPerformance) {
	const { game, gameObject } = await resolveFromStore(encodedGameId, userId, handlerPerformance)

	const targetsList = SearchQueryList.get(query, { plural: 'targets', singular: 'target', short: 't' })

	/** @type {Offer<StoreUserId>} */
	const offer = { targets: await Promise.all(targetsList.map(t => fromEncodedUserId(encodedUserIdFromString(t)))) }

	const updatedGame = Tic.offer(game, userId, offer)

	/** @type {StoreGameEnvelope} */
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
		() => gameStore.set(gameObject.storeGameId, updatedGameObject))

	return Tic.actionable(updatedGame, userId)
}