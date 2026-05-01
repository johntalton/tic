import { gameStore } from '../../store/store.js'
import { encodedUserIdFromString, fromEncodedUserId } from '../../users/util.js'
import { SearchQueryList } from '../../util/search-query-list.js'
import { TIMING, timed} from '../../util/timing.js'
import { GameManager } from '../game.js'
import { resolveFromStore } from '../util.js'

/** @import { ActionHandlerFn } from './index.js' */
/** @import { StoreGameEnvelope } from '../../types/store.game.js' */
/** @import { StoreUserId } from '../../types/store.user.js' */
/** @import { Offer } from '../game.js' */

/** @type {ActionHandlerFn} */
export async function handleOffer(encodedGameId, userId, _body, query, handlerPerformance) {
	const { game, gameObject } = await resolveFromStore(encodedGameId, userId, handlerPerformance)

	const targetsList = SearchQueryList.get(query, { plural: 'targets', singular: 'target', short: 't' })

	/** @type {Offer<StoreUserId>} */
	const offer = { targets: await Promise.all(targetsList.map(t => fromEncodedUserId(encodedUserIdFromString(t)))) }

	const updatedGame = GameManager.offer(game, userId, offer)

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

	return GameManager.actionable(updatedGame, userId)
}