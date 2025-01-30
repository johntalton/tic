import { GameAPI } from './node-game-api.js'
import { EventSource } from '../util/event-source.js'

const USER_AGENT_ID = 'user:Agent'

class BasicAI {
	async #shouldAccept(game) {
		return true
	}

	async #proposeMove(board) {
		const validSpots = board.map((player, idx) => ({
			player, idx
		}))
		.filter(({ player }) => player === 0)
		.map(({ idx }) => idx )

		console.log(validSpots)
		const count = validSpots.length - 1
		const randomIdx = Math.round(Math.random() * count)
		console.log('proposing move', count, randomIdx, validSpots[randomIdx])
		return validSpots[randomIdx]
	}

	async proposeAction(game) {
		const { board, state, actions } = game

		switch(state) {
			case 'new':
				console.log('proposeAction - New')
				const isOwner = game.owner === USER_AGENT_ID

				return { type: 'None' }

				break
			case 'pending':
				console.log('proposeAction - Pending ')
				if(game.offers.includes(USER_AGENT_ID) && game.actions.includes('Accept')) {
					console.log('Accepting Offered Game from', game.owner)
					const shouldAccept = await this.#shouldAccept(game)
					const type = shouldAccept ? 'Accept' : 'Decline'
					return {
						type
					}
				}

				return { type: 'None' }

				break
			case 'active':
				console.log('proposeAction - Active')
				if(game.active.includes(USER_AGENT_ID)) {
					console.log('proposeAction - Active Agents Turn')

					const position = await this.#proposeMove(board)

					return {
						type: 'Move',
						position
					}
				}

				return { type: 'None' }

				break
			case 'resolved':
				console.log('proposeAction - Resolved')
				return { type: 'None' }
				break
			default:
				console.warn('proposeAction - Unknown State')
				return { type: 'None' }
				break
		}
	}
}

class GameAgent {
	#channel = new MessageChannel()
	#serviceUrl = 'https://tic.next.local:8443'
	#api
	#accessToken
	#sse
	#ai = new BasicAI()

	async #handleAction(game, action) {
		const { type } = action
		switch(type) {
			case 'Accept':
				console.log('handleAction - Accept')
				const acceptedGame = await this.#api.accept(game.id)
				console.log({ acceptedGame })
				break
			case 'Decline':
				break
			case 'Forfeit':
				break
			case 'Close':
				break
			case 'Move':
				const { position } = action
				console.log('handleAction - Move', position)
				const updatedGame = await this.#api.move(game.id, position)
				break
			case 'Offer':
				break
			default:
				console.log('Default Action ', type)
				break
		}
	}

	async #handleGame(game) {
		// console.log(game)
		const action = await this.#ai.proposeAction(game)
		await this.#handleAction(game, action)
	}

	async #fetchAndProcessGames() {
		this.#sse = new EventSource(`${this.#serviceUrl}/tic/v1/events?token=${this.#accessToken}`)
		this.#sse?.addEventListener('update', update => {
			const { lastEventId, data } = update
			const json = JSON.parse(data)
			console.log('sse update', json)

			this.#api.fetch(json.id)
				.then(async game => {
					await this.#handleGame(game)
				})
				.catch(error => console.warn('error in sse update handler', error))

		})
		// this.#sse.onmessage = message => {
		// 	console.log('sse message', message)
		// }
		this.#sse?.addEventListener('error', error => {
			console.log('sse error', error)
		})


		const knownGames = await this.#api.listing([ 'new', 'pending', 'active' ])
		// console.log(knownGames)

		for (const knownGame of knownGames.games) {
			const game = await this.#api.fetch(knownGame.id)
			await this.#handleGame(game)
				.catch(e => console.warn('error in list handler', e))
		}
	}

	constructor(accessToken) {
		this.#accessToken = accessToken

		this.#api = new GameAPI({ accessToken }, this.#serviceUrl)

		// const { port1 } = this.#channel
		// port1.addEventListener('message', message => {
		// 	console.log('agent message', message)
		// })

		this.#fetchAndProcessGames()
			.catch(e => console.warn('error initializing', e))
	}
}

const gameAgent = new GameAgent('token:access:agent')