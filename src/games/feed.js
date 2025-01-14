import { ServerSentEvents } from '@johntalton/sse-util'

import { isViewable } from './tic.js'
import { userStore } from '../store/user.js'


export async function handleGameFeed(stream, sessionUser, query) {
	const channel = new BroadcastChannel('SSE')

	const user = await userStore.fromToken(sessionUser.token)
	if(user === undefined) {
		throw new Error('invalid user token')
	}

	stream.on('error', error => {
		console.log('Game Feed Closed')
		stream.close()
		channel.close()
	})

	ServerSentEvents.messageToEventStreamLines({
		comment: `SSE for ${user}`,
		retryMs: 1000 * 10
	}).forEach(line => stream.write(line))

	channel.onmessage = msg => {
		const { data } = msg
		const { game } = data

		// console.log('SSE', data)

		if(!isViewable(game, user)) { return }

		ServerSentEvents.messageToEventStreamLines({
			// id: 1,
			event: 'update',
			// data: [ JSON.stringify(game) ]
			data: [ JSON.stringify({ id: game.id }) ]
		}).forEach(line => stream.write(line))
	}
}