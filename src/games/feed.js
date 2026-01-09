import { ServerSentEvents } from '@johntalton/sse-util'

import { isViewable } from './tic.js'
import { userStore } from '../store/couch/user.js'
import { identifiableGameId } from './util.js'

/** @import { HandlerFn } from '../util/dig.js' */

/** @type {HandlerFn<void>} */
export async function handleGameFeed(_matches, sessionUser, _body, _query, stream, handlerPerformance, shutdownSignal) {
	const channel = new BroadcastChannel('SSE')
	console.log('SSE channel up')

	if(sessionUser.tokens.sse === undefined) { throw new Error('access token required') }
	const userId = await userStore.fromSSEToken(sessionUser.tokens.sse)
		.catch(e => {
			// console.warn('invalid user for feed')

			ServerSentEvents.messageToEventStreamLines({
				comment: `Offline`,
				retryMs: 1000 * 60,
			}).forEach(line => stream.write(line))

			stream.end()

			stream.close()
			channel.close()

			throw e
		})

	// stream.on('aborted', () => console.log('game feed stream aborted'))

	const abortHandler = () => {
		console.log('SSE Game Feed Aborted', shutdownSignal.reason)
		stream.close()
		channel.close()
	}

	shutdownSignal.addEventListener('abort', abortHandler)

	stream.on('close', () => {
		console.log('SSE Game Feed Closed')
		stream.close()
		channel.close()
		shutdownSignal.removeEventListener('abort', abortHandler)
	})

	stream.on('error', error => {
		console.warn('Game Feed Error', error.message)
		stream.close()
		channel.close()
		shutdownSignal.removeEventListener('abort', abortHandler)
	})

	// console.log('new Game SSE for', user)
	ServerSentEvents.messageToEventStreamLines({
		comment: `SSE for ${userId}`,
		retryMs: 1000 * 10
	}).forEach(line => stream.write(line))

	channel.onmessage = msg => {
		const { data } = msg
		const { type, _id, game } = data

		if(type !== 'game-change') { return }

		if(!isViewable(game, userId)) { return }

		identifiableGameId(_id)
			.then(id => {
				// console.log('SSE event send id', id)
				ServerSentEvents.messageToEventStreamLines({
					// id: 1,
					event: 'update',
					// data: [ JSON.stringify(game) ]
					data: [ JSON.stringify({ id }) ]
				}).forEach(line => stream.write(line))
			})
	}
}