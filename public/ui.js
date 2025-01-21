export class UI {
	static addGameListingItem(game, port) {
		const gameListElement = document.getElementById('GamesListing')

		const li = document.createElement('LI')
			li.textContent = 'Game:' + game.id
			li.setAttribute('data-game-id', game.id)
			gameListElement?.appendChild(li)

			li.addEventListener('click', event => {
				// console.log('click for game', game.id, port)
				port.postMessage({
					type: 'activate',
					gameId: game.id
				})
			})
	}

	static updateGameListingItem(gameId) {

	}

	static updateGameListing(listing, port) {
		listing.games.forEach(game => {
			UI.addGameListingItem(game, port)
		})
	}

	static createNewGameField(gameId, port) {
		const templateElem = document.getElementById('GameTemplate')
		if(templateElem === null) { throw new Error('missing Game Template') }
		const templateDocument = templateElem.content.cloneNode(true)

		const gameFieldElem = templateDocument.querySelector('game-field')
		gameFieldElem.toggleAttribute('data-active', true)
		gameFieldElem.setAttribute('game-id', gameId)

		const gameBoardElem = gameFieldElem.querySelector('game-board')

		const buttonAccept = gameFieldElem.querySelector('button[data-action="accept"]')
		const buttonClose = gameFieldElem.querySelector('button[data-action="close"]')
		const buttonDecline = gameFieldElem.querySelector('button[data-action="decline"]')
		const buttonForfeit = gameFieldElem.querySelector('button[data-action="forfeit"]')
		const buttonOffer = gameFieldElem.querySelector('button[data-action="offer"]')

		buttonAccept.addEventListener('click', event => port.postMessage({ type: 'accept', gameId }), { once: false })
		buttonClose.addEventListener('click', event => port.postMessage({ type: 'close', gameId }), { once: false })
		buttonDecline.addEventListener('click', event => port.postMessage({ type: 'decline', gameId }), { once: false })
		buttonForfeit.addEventListener('click', event => port.postMessage({ type: 'forfeit', gameId }), { once: false })
		buttonOffer.addEventListener('click', event => port.postMessage({ type: 'offer', gameId }))

		gameBoardElem.addEventListener('click', event => {
			event.preventDefault()

			const button = event.target.closest('button')
			const output = button.querySelector('output')
			const position = button.getAttribute('data-position')

			gameFieldElem.toggleAttribute('can-move', false)

			button.disabled = true
			output.innerText = '❌' // '⭕'

			port.postMessage({
				type: 'move',
				gameId,
				position
			})
		})

		return gameFieldElem
	}

	static hasGameField(gameId) {
		const gameFieldElem = document.querySelector(`game-field[game-id="${gameId}"]`)
		return gameFieldElem !== null
	}

	static updateGameField(game, user) {
		const gameFieldElem = document.querySelector(`game-field[game-id="${game.id}"]`)
		if(gameFieldElem === null) { throw new Error('game not in dom') }

		const buttonAccept = gameFieldElem.querySelector('button[data-action="accept"]')
		const buttonClose = gameFieldElem.querySelector('button[data-action="close"]')
		const buttonDecline = gameFieldElem.querySelector('button[data-action="decline"]')
		const buttonForfeit = gameFieldElem.querySelector('button[data-action="forfeit"]')
		const buttonOffer = gameFieldElem.querySelector('button[data-action="offer"]')

		buttonAccept.disabled = !game.actions.includes('Accept')
		buttonClose.disabled = !game.actions.includes('Close')
		buttonDecline.disabled = !game.actions.includes('Decline')
		buttonForfeit.disabled = !game.actions.includes('Forfeit')
		buttonOffer.disabled = !game.actions.includes('Offer')


		const canMove = (game.active.includes(user.id))
		gameFieldElem.toggleAttribute('can-move', canMove)

		const { resolution, state } = game
		const { draw, full, resolved, win, winner } = resolution
		const { name: winningPosition, user: winningUser } = winner

		if(state === 'new' && game.owner === user.id) { UI.setGameMessage(game.id, 'offer') }
		else if(state === 'pending') {
			UI.setGameMessage(game.id, 'pending')
		}
		else if(state === 'resolved') { UI.setGameMessage(game.id, 'closed') }
		else if(draw) { UI.setGameMessage(game.id, 'draw') }
		else if(win && winningUser === user.id) { UI.setGameMessage(game.id, 'win') }
		else if(win) { UI.setGameMessage(game.id, 'loose') }
		else if(canMove) { UI.setGameMessage(game.id, 'move') }
		else { UI.setGameMessage(game.id, 'wait') }

		const gameBoardElem = gameFieldElem.querySelector('game-board')

		if(win) { gameBoardElem?.setAttribute('win-line', winningPosition) }
		else { gameBoardElem?.removeAttribute('win-line') }

		game.board.forEach((playerId, index) => {
			const moveButtonElem = gameBoardElem?.querySelector(`button[data-position="${index}"]`)
			const output = moveButtonElem?.querySelector('output')

			if(playerId === 0) {
				output.value = ''
				moveButtonElem.disabled = false
			} else if(playerId === user.id) {
				output.value = '❌'
				moveButtonElem.disabled = true
			} else {
				output.value = '⭕'
				moveButtonElem.disabled = true
			}

		})
	}

	static activateGameField(gameId, port) {
		// console.log('load game', gameId)
		const gameFieldsElem = document.getElementById('GameFields')
		if(gameFieldsElem === null) { throw new Error('missing game fields container') }

		document.body.toggleAttribute('data-aside', false)

		const existingGameFields = gameFieldsElem?.querySelectorAll('game-field')
		for(const gameBoard of existingGameFields) {
			gameBoard.toggleAttribute('data-active', false)
		}

		const existingGameField = document.querySelector(`game-field[game-id="${gameId}"]`)
		if(existingGameField === null) {
			const newGameField = UI.createNewGameField(gameId, port)
			gameFieldsElem.append(newGameField)

		} else {
			existingGameField.toggleAttribute('data-active', true)
		}
	}

	static confirmClose(gameId, port) {
		const closeDialog = document.getElementById('CloseConfirm')
		const closeForm = closeDialog?.querySelector('form')
		// const reasonElem = closeDialog?.querySelector('input[name="reason"]')

		// const forfeitButton = closeDialog?.querySelector('button[data-confirm]')
		// forfeitButton?.addEventListener('click', event => {
		closeForm?.addEventListener('submit', event => {
			const fd = new FormData(event.target)

			// const reason = reasonElem?.value
			const reason = fd.get('reason')

			port.postMessage({
				type: 'close',
				gameId,
				confirmed: true,
				reason
			})

			closeForm.reset()
			closeDialog?.close()
		}, { once: true })

		closeDialog?.showModal()
	}

	static confirmForfeit(gameId, port) {
		const forfeitDialog = document.getElementById('ForfeitConfirm')

		const forfeitButton = forfeitDialog?.querySelector('button[data-confirm]')
		forfeitButton?.addEventListener('click', event => {
			port.postMessage({
				type: 'forfeit',
				gameId,
				confirmed: true
			})
			forfeitDialog?.close()
		}, { once: true })

		forfeitDialog.showModal()
	}

	static startOffer(gameId, port) {
		const offerToDialog = document.getElementById('OfferTo')
		const offerForm = offerToDialog?.querySelector('form')

		offerForm?.addEventListener('submit', event => {
			const fd = new FormData(offerForm)
			const targets = fd.getAll('offerTo')

			if(targets === undefined || targets.length <= 0) {
				console.log('empty target')
				return
			}

			port.postMessage({
				type: 'offer',
				gameId,
				targets
			})

			offerForm.reset()
			offerToDialog?.close()
		}, { once: true })

		offerToDialog?.showModal()
	}

	static setGameMessage(gameId, key) {
		const gameFieldElem = document.querySelector(`game-field[game-id="${gameId}"]`)
		if(gameFieldElem === null) { return }

		const messages = gameFieldElem.querySelector('game-message')
		const children = messages?.querySelectorAll('[data-key]')
		children?.forEach(child => child.removeAttribute('data-active'))
		const message = gameFieldElem.querySelector(`[data-key="${key}"]`)
		message?.toggleAttribute('data-active', true)
	}

	static setProgress() {
			// const progressElement = document.getElementById('GlobalProgress')
	// setInterval(() => {
	// 	progressElement.value += 1
	// 	if(progressElement.value >= 100) { progressElement.value = 0 }
	// }, 50)
	}

	static showToast(message, kind) {
		const toastElem = document.getElementById('Toast')
		toastElem?.toggleAttribute('data-show', true)
		const messageElem = toastElem?.querySelector('output')
		messageElem.value = message
	}

	static hideToast() {
		const toastElem = document.getElementById('Toast')
		toastElem?.toggleAttribute('data-show', false)
	}

	static setLoggedIn(user, loggedIn = true) {
		document.querySelector('body')?.toggleAttribute('data-logged-in', loggedIn)

		const usernameOutputs = document.querySelectorAll('output[data-username]')
		for(const usernameOutput of usernameOutputs) {
			usernameOutput.value = user.name
		}

	}

	static logout(user) {
		UI.setLoggedIn(user, false)

		// game listing
		const gameListElement = document.getElementById('GamesListing')
		const lis = gameListElement?.querySelectorAll('li')
		lis?.forEach(li => li.remove())

		// games
		const gameFieldsElem = document.getElementById('GameFields')
		const games = gameFieldsElem?.querySelectorAll('game-field')
		games?.forEach(game => game.remove())

	}

}

