export class UI {
	static updateGameListing(listing, port) {

		const gameListElement = document.getElementById('GamesListing')
		listing.games.forEach(game => {
			const li = document.createElement('LI')
			li.textContent = 'Game:' + game.id
			gameListElement?.appendChild(li)

			li.addEventListener('click', event => {
				// console.log('click for game', game.id, port)
				port.postMessage({
					type: 'activate',
					gameId: game.id
				})
			})
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


		const gameBoardElem = gameFieldElem.querySelector('game-board')

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
		const forfeitDialog = document.getElementById('CloseConfirm')
		const reasonElem = forfeitDialog?.querySelector('input[name="reason"]')

		const forfeitButton = forfeitDialog?.querySelector('button[data-confirm]')
		forfeitButton?.addEventListener('click', event => {
			port.postMessage({
				type: 'close',
				gameId,
				confirmed: true,
				reason: reasonElem?.value
			})
			forfeitDialog?.close()
		}, { once: true })

		forfeitDialog.showModal()
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

	static startOffer(gameId, port) {}

	static setGameMessage() {}

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

	static setLoggedIn(loggedIn = true) {
		document.querySelector('body')?.toggleAttribute('data-logged-in', loggedIn)
	}

	static logout() {
		UI.setLoggedIn(false)

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

