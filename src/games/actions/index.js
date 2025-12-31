import { handleAccept } from './accept.js'
import { handleClose } from './close.js'
import { handleDecline } from './decline.js'
import { handleForfeit } from './forfeit.js'
import { handleMove } from './move.js'
import { handleOffer } from './offer.js'

import { MATCHES } from '../../route.js'
import { identifiableGameWithEncodedId, isStoreEncodedGameId } from '../util.js'
import { userStore } from '../../store/user.js'

const ACTION_MAP = new Map([
	[ 'accept', handleAccept ],
	[ 'close', handleClose ],
	[ 'decline', handleDecline ],
	[ 'forfeit', handleForfeit ],
	[ 'move', handleMove ],
	[ 'offer', handleOffer ]
])

/**
 * @import { HandlerFn } from '../../util/dig.js'
 */

/**
 * @import { IdentifiableActionableGame } from '../../types/public.js'
 */

/** @type {HandlerFn<IdentifiableActionableGame>} */
export async function handleAction(matches, sessionUser, requestBody, query) {
	if(sessionUser.tokens.access === undefined) { throw new Error('access token required') }
	const userId = await userStore.fromToken(sessionUser.tokens.access)

	const action = matches.get(MATCHES.ACTION)
	const gameId = matches.get(MATCHES.GAME_ID)

	if(action === undefined) { throw new Error('undefined action') }
	if(gameId === undefined) { throw new Error('unknown game id') }

	if(!isStoreEncodedGameId(gameId)) { throw new Error('invalid game id brand') }

	const handler = ACTION_MAP.get(action)
	if(handler === undefined) { throw new Error('unknown action') }

	const actionableGame = await handler(gameId, userId, requestBody, query)
	return identifiableGameWithEncodedId(gameId, actionableGame)
}
