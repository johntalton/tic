import { GameAPI } from './node-game-api.js'
import { EventSource } from '../util/event-source.js'
import { Board, WIN_CONDITIONS } from '../games/tic.js'

class BasicAI {
	async #shouldAccept(game) {
		return true
	}

	async _proposeMove(agentUserId, board) {
		const validSpots = board.map((player, idx) => ({
			player, idx
		}))
		.filter(({ player }) => player === 0)
		.map(({ idx }) => idx )

		// console.log(validSpots)
		const count = validSpots.length - 1
		const randomIdx = Math.round(Math.random() * count)
		// console.log('proposing move', count, randomIdx, validSpots[randomIdx])
		return validSpots[randomIdx]
	}

	async proposeAction(agentUserId, game) {
		const { board, state, actions } = game

		switch(state) {
			case 'new':
				// console.log('proposeAction - New')
				const isOwner = game.owner === agentUserId

				return { type: 'None' }

				break
			case 'pending':
				// console.log('proposeAction - Pending ')
				if(game.offers.includes(agentUserId) && game.actions.includes('Accept')) {
					// console.log('Accepting Offered Game from', game.owner)
					const shouldAccept = await this.#shouldAccept(game)
					const type = shouldAccept ? 'Accept' : 'Decline'
					return {
						type
					}
				}

				return { type: 'None' }

				break
			case 'active':
				// console.log('proposeAction - Active')
				if(game.active.includes(agentUserId)) {
					// console.log('proposeAction - Active Agents Turn')

					const position = await this._proposeMove(agentUserId, board)

					return {
						type: 'Move',
						position
					}
				}

				return { type: 'None' }

				break
			case 'resolved':
				// console.log('proposeAction - Resolved')
				return { type: 'None' }
				break
			default:
				console.warn('proposeAction - Unknown State')
				return { type: 'None' }
				break
		}
	}
}

class BetterAI extends BasicAI {
	async _proposeMove(agentUserId, board) {
		const validSpots = board.map((player, idx) => ({
			player, idx
		}))
		.filter(({ player }) => player === 0)
		.map(({ idx }) => idx )

		const potentials = WIN_CONDITIONS.map(({ name, condition }) => {
			const playable = (new Set(condition)).intersection(new Set(validSpots))
			if(playable.size === 0) {
				return undefined
			}

			const spot0 = board[condition[0]]
			const spot1 = board[condition[1]]
			const spot2 = board[condition[2]]



		})


		return 0
	}
}

class GameAgent {
	// #channel = new MessageChannel()
	#serviceUrl = 'https://tic.next.local:8443'
	#api
	#agentUserId
	#accessToken
	#sseToken
	#sse
	#ai

	async #handleAction(game, action) {
		const { type } = action
		switch(type) {
			case 'Accept':
				console.log('handleAction - Accept', game.id)
				const acceptedGame = await this.#api.accept(game.id)
				// console.log({ acceptedGame })
				break
			case 'Decline':
				break
			case 'Forfeit':
				break
			case 'Close':
				break
			case 'Move':
				const { position } = action
				console.log('handleAction - Move', game.id, position)
				const updatedGame = await this.#api.move(game.id, position)
				if(updatedGame.message !== undefined) {
					console.log('Game Message:', updatedGame.message)
				}
				break
			case 'Offer':
				break
			default:
				// console.log('Default Action ', type)
				break
		}
	}

	async #handleGame(game) {
		// console.log(game)
		const action = await this.#ai.proposeAction(this.#agentUserId, game)
		await this.#handleAction(game, action)
	}

	async #fetchAndProcessExistingGames() {
		console.log('processed existing games')
		try {
			const knownGames = await this.#api.listing([ 'new', 'pending', 'active' ])
			// console.log({ knownGames })

			for (const knownGame of knownGames.games) {
				const game = await this.#api.fetch(knownGame.id)
				await this.#handleGame(game)
					.catch(e => console.warn('error in list handler', e))
			}
		}
		catch(e) {
			console.warn('error processing existing games', e.message)
		}
	}

	async #fetchAndProcessGames() {
		this.#sse = new EventSource(`${this.#serviceUrl}/tic/v1/events?token=${this.#sseToken}`)
		this.#sse?.addEventListener('open', () => {
			console.log('SSE open')
			// reprocess known games?
			this.#fetchAndProcessExistingGames()
				.catch(e => console.warn('Error on process via open SSE ', e.message))
		})
		this.#sse?.addEventListener('error', error => {
			// this could be a failure to open, or a scheduled reconnect
			// console.log('sse error', error)
		})
		this.#sse?.addEventListener('update', update => {
			const { lastEventId, data } = update
			const json = JSON.parse(data)
			// console.log('sse update', json)

			this.#api.fetch(json.id)
				.then(async game => {
					// console.log(game)
					await this.#handleGame(game)
				})
				.catch(error => console.warn('error in sse update handler', error))
		})

		return this.#fetchAndProcessExistingGames()
	}

	constructor(userId, accessToken, sseToken, ai) {
		this.#agentUserId = userId
		this.#accessToken = accessToken
		this.#sseToken = sseToken
		this.#ai = ai
		this.#api = new GameAPI({ id: userId, accessToken }, this.#serviceUrl)

		this.#fetchAndProcessGames()
			.catch(e => console.warn('error initializing', e))
	}
}

const gameAgent = new GameAgent('user:Agent', 'token:access:agent', 'token:sse:agent', new BasicAI())