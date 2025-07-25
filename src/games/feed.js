import { ServerSentEvents } from '@johntalton/sse-util'

import { isViewable } from './tic.js'
import { userStore } from '../store/user.js'


export async function handleGameFeed(matches, sessionUser, body, query, stream) {
	const channel = new BroadcastChannel('SSE')

	const user = await userStore.fromToken(sessionUser.token)
		.catch(error => {
			console.log('fromToken error', error)
			stream.close()
			channel.close()
		})

	if(user === undefined) {
		// throw new Error('invalid user token')
		console.warn('invalid user')
		stream.close()
		channel.close()
		return
	}

	// stream.on('aborted', () => console.log('game feed stream aborted'))

	stream.on('close', () => {
		// console.log('SSE Game Feed Closed')
		stream.close()
		channel.close()
	})

	stream.on('error', error => {
		console.warn('Game Feed Error')
		stream.close()
		channel.close()
	})

	// console.log('new Game SSE for', user)
	ServerSentEvents.messageToEventStreamLines({
		comment: `SSE for ${user}`,
		retryMs: 1000 * 10
	}).forEach(line => stream.write(line))

	channel.onmessage = msg => {
		const { data } = msg
		const { game } = data

		// console.log('SSE', data.game.id)

		if(!isViewable(game, user)) { return }

		ServerSentEvents.messageToEventStreamLines({
			// id: 1,
			event: 'update',
			// data: [ JSON.stringify(game) ]
			data: [ JSON.stringify({ id: game.id }) ]
		}).forEach(line => stream.write(line))
	}
}