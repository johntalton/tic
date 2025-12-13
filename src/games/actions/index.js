import { handleAccept } from './accept.js'
import { handleClose } from './close.js'
import { handleDecline } from './decline.js'
import { handleForfeit } from './forfeit.js'
import { handleMove } from './move.js'
import { handleOffer } from './offer.js'

import { MATCHES } from '../../route.js'
import { identifiableGame } from '../util.js'

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

/** @type {HandlerFn} */
export async function handleAction(matches, sessionUser, requestBody, query) {
	const action = matches.get('action')
	const gameId = matches.get(MATCHES.GAME_ID)

	if(action === undefined) { throw new Error('undefined action') }
	if(gameId === undefined) { throw new Error('unknown game id') }

	const handler = ACTION_MAP.get(action)
	if(handler === undefined) { throw new Error('unknown action') }

	const actionableGame = await handler(gameId, sessionUser, requestBody, query)
	return identifiableGame(gameId, actionableGame)
}
