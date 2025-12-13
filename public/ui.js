class UIListing {
	static selectGameListingItem(gameId) {
		const gameListElement = document.getElementById('GamesListing')
		const gameListingItem = gameListElement?.querySelector(`li[data-game-id="${gameId}"]`)
		const lis = gameListElement?.querySelectorAll('li[data-game-id]')

		lis?.forEach(li => li.toggleAttribute('data-active', false))
		gameListingItem?.toggleAttribute('data-active', true)
	}

	static addGameListingItem(game, user, notificationGameIdSet, port) {
		const gameListElement = document.getElementById('GamesListing')
		const gameListingItemTemplate = gameListElement?.querySelector('template')
		if(gameListingItemTemplate === null || gameListingItemTemplate === undefined) { throw new Error('missing Game List Item Template') }
		const templateDocument = gameListingItemTemplate?.content.cloneNode(true)
		if(!(templateDocument instanceof DocumentFragment)) { throw new Error('GameListing template not a Document')}
		const li = templateDocument.querySelector('li')
		if(li === null) { throw new Error('GameListing template missing li element') }

		UI.Listing.updateGameListingItemLI(li, game, user, notificationGameIdSet)

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

	static updateGameListingItemLI(li, game, user, notificationGameIdSet) {
		li.toggleAttribute('data-stale', false)

		const nameOutput = li.querySelector('output[data-game-name]')
		const subNameOutput = li.querySelector('output[data-game-subname]')
		const isOwnerOutput = li.querySelector('output[data-game-owner]')
		const elapsedTime = li.querySelector('elapsed-time[data-created-at]')
		const hasUpdateElem = li.querySelector('[data-game-has-update]')

		const isOwner = game.owner === user.id
		const hasUpdateValue = notificationGameIdSet.has(game.id) ? 'yes' : 'no'

		const title = game.state === 'resolved' ? 'Closed' : (game.players.length > 0 ? game.players.join(' vs ') : 'Pending')

		nameOutput.value = title
		subNameOutput.value = game.id
		isOwnerOutput.value = isOwner ? '🔑' : '' // 🔑 🔒 🔓 🗝️
		isOwnerOutput.setAttribute('title', 'Owner')
		elapsedTime?.setAttribute('time', game.createdAt)
		hasUpdateElem.setAttribute('data-game-has-update', hasUpdateValue)

	}

	static clearGameListingItemNotification(gameId) {
		const gameListElement = document.getElementById('GamesListing')
		const gameListingItem = gameListElement?.querySelector(`li[data-game-id="${gameId}"]`)
		const hasUpdateElem = gameListingItem?.querySelector('[data-game-has-update]')

		const hasUpdateValue = false ? 'yes' : 'no'

		hasUpdateElem?.setAttribute('data-game-has-update', hasUpdateValue)
	}

	static addOrUpdateGameListingItem(game, user, notificationGameIdSet, port) {
		const gameListElement = document.getElementById('GamesListing')
		const gameListingItem = gameListElement?.querySelector(`li[data-game-id="${game.id}"]`)
		if(gameListingItem === null) {
			UI.Listing.addGameListingItem(game, user, notificationGameIdSet, port)
		}
		else {
			UI.Listing.updateGameListingItemLI(gameListingItem, game, user, notificationGameIdSet)
		}
	}

	static markGameListingItemsStale() {
		const gameListElement = document.getElementById('GamesListing')
		const items = gameListElement?.querySelectorAll('li[data-game-id]')
		if(items === undefined) { return }
		for(const item of items) {
			item.toggleAttribute('data-stale', true)
		}
	}

	static updateGameListing(listing, user, notificationGameIdSet, port) {
		UI.Listing.markGameListingItemsStale()

		listing.games.forEach(game => {
			UI.Listing.addOrUpdateGameListingItem(game, user, notificationGameIdSet, port)
		})

		UI.Listing.clearStaleGameListingItems()
	}

	static clearStaleGameListingItems() {
		UI.Listing.clearGameListingItemsBySelector('li[data-stale]')
	}

	static clearGameListing() {
		UI.Listing.clearGameListingItemsBySelector()
	}

	static clearGameListingItemsBySelector(selector = 'li') {
		const gameListElement = document.getElementById('GamesListing')
		const lis = gameListElement?.querySelectorAll(selector)
		lis?.forEach(li => li.remove())
	}

	static listFilters() {
		const filterForm = document.getElementById('ListFilterForm')
		if(filterForm === null) { return [] }
		if(!(filterForm instanceof HTMLFormElement)) { return [] }

		const fd = new FormData(filterForm)
		return fd.getAll('ListFilter')
	}
}

class UIField {
	static setGameMessage(gameId, key) {
		const gameFieldElem = document.querySelector(`game-field[game-id="${gameId}"]`)
		if(gameFieldElem === null) { return }

		const messages = gameFieldElem.querySelector('game-message')
		const children = messages?.querySelectorAll('[data-key]')
		children?.forEach(child => child.removeAttribute('data-active'))
		const message = gameFieldElem.querySelector(`[data-key="${key}"]`)
		message?.toggleAttribute('data-active', true)
	}

	static createNewGameField(gameId, port) {
		const templateElem = document.getElementById('GameTemplate')
		if(!(templateElem instanceof HTMLTemplateElement)) { throw new Error('GameTemplate is not a template') }
		if(templateElem === null) { throw new Error('missing Game Template') }
		const templateDocument = templateElem.content.cloneNode(true)
		if(!(templateDocument instanceof DocumentFragment)) { throw new Error('templateDocument is not a Document') }

		const gameFieldElem = templateDocument.querySelector('game-field')
		if(gameFieldElem === null) { throw new Error('GameTemplate missing game-field element') }
		gameFieldElem.toggleAttribute('data-active', true)
		gameFieldElem.setAttribute('game-id', gameId)

		const gameBoardElem = gameFieldElem.querySelector('game-board')

		const buttonAccept = gameFieldElem.querySelector('button[data-action="accept"]')
		const buttonClose = gameFieldElem.querySelector('button[data-action="close"]')
		const buttonDecline = gameFieldElem.querySelector('button[data-action="decline"]')
		const buttonForfeit = gameFieldElem.querySelector('button[data-action="forfeit"]')
		const buttonOffer = gameFieldElem.querySelector('button[data-action="offer"]')

		buttonAccept?.addEventListener('click', event => port.postMessage({ type: 'accept', gameId }), { once: false })
		buttonClose?.addEventListener('click', event => port.postMessage({ type: 'close', gameId }), { once: false })
		buttonDecline?.addEventListener('click', event => port.postMessage({ type: 'decline', gameId }), { once: false })
		buttonForfeit?.addEventListener('click', event => port.postMessage({ type: 'forfeit', gameId }), { once: false })
		buttonOffer?.addEventListener('click', event => port.postMessage({ type: 'offer', gameId }))

		gameBoardElem?.addEventListener('click', event => {
			event.preventDefault()
			const { target } = event

			if(target === null || !(target instanceof Element)) { return }

			const button = target.closest('button')
			if(button === null) { throw new Error('board missing button element') }

			const output = button?.querySelector('output')
			const position = button?.getAttribute('data-position')

			if(output === null || position === null) {
				throw new Error('board missing output / position')
			}

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

	static updateGameField(gameId, game, user) {
		const gameFieldElem = document.querySelector(`game-field[game-id="${gameId}"]`)
		if(gameFieldElem === null) { throw new Error('game not in dom') }

		const buttonAccept = gameFieldElem.querySelector('button[data-action="accept"]')
		const buttonClose = gameFieldElem.querySelector('button[data-action="close"]')
		const buttonDecline = gameFieldElem.querySelector('button[data-action="decline"]')
		const buttonForfeit = gameFieldElem.querySelector('button[data-action="forfeit"]')
		const buttonOffer = gameFieldElem.querySelector('button[data-action="offer"]')

		if(buttonAccept === null || !(buttonAccept instanceof HTMLButtonElement) ||
			buttonClose === null || !(buttonClose instanceof HTMLButtonElement) ||
			buttonDecline === null || !(buttonDecline instanceof HTMLButtonElement) ||
			buttonForfeit === null || !(buttonForfeit instanceof HTMLButtonElement) ||
			buttonOffer === null || !(buttonOffer instanceof HTMLButtonElement)) {
				throw new Error('missing proper action buttons')
			}

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

		if(state === 'new' && game.owner === user.id) { UI.Field.setGameMessage(gameId, 'offer') }
		else if(state === 'pending') {
			UI.Field.setGameMessage(gameId, 'pending')
		}
		else if(state === 'resolved') { UI.Field.setGameMessage(gameId, 'closed') }
		else if(draw) { UI.Field.setGameMessage(gameId, 'draw') }
		else if(win && winningUser === user.id) { UI.Field.setGameMessage(gameId, 'win') }
		else if(win) { UI.Field.setGameMessage(gameId, 'loose') }
		else if(canMove) { UI.Field.setGameMessage(gameId, 'move') }
		else { UI.Field.setGameMessage(gameId, 'wait') }

		const gameBoardElem = gameFieldElem.querySelector('game-board')

		if(win) { gameBoardElem?.setAttribute('win-line', winningPosition) }
		else { gameBoardElem?.removeAttribute('win-line') }

		game.board.forEach((playerId, index) => {
			const moveButtonElem = gameBoardElem?.querySelector(`button[data-position="${index}"]`)
			const output = moveButtonElem?.querySelector('output')

			if(output === null || output === undefined) { return }
			if(moveButtonElem === null || moveButtonElem === undefined || !(moveButtonElem instanceof HTMLButtonElement)) { return }

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
			const newGameField = UI.Field.createNewGameField(gameId, port)
			gameFieldsElem.append(newGameField)

		} else {
			existingGameField.toggleAttribute('data-active', true)
		}
	}

	static clearFields() {
		const gameFieldsElem = document.getElementById('GameFields')
		const games = gameFieldsElem?.querySelectorAll('game-field')
		games?.forEach(game => game.remove())
	}
}


class UIDialog {
	static confirmClose(gameId, port) {
		const closeDialog = document.getElementById('CloseConfirm')
		const closeForm = closeDialog?.querySelector('form')

		if(!(closeDialog instanceof HTMLDialogElement)) { throw new Error('Close Confirmation is not a Dialog element') }

		closeForm?.addEventListener('submit', event => {
			const { target } = event

			if(!(target instanceof HTMLFormElement)) { throw new Error('close form invalid') }

			const fd = new FormData(target)

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
		if(!(forfeitDialog instanceof HTMLDialogElement)) { throw new Error('Forfeit Confirmation is not a Dialog element') }

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

		if(!(offerToDialog instanceof HTMLDialogElement)) { throw new Error('OfferTo is not a Dialog element') }

		offerForm?.addEventListener('submit', event => {
			const fd = new FormData(offerForm)
			const targets = fd.getAll('offerTo')
			const offerToSelf = fd.get('offerToSelf')
			const includeSelf = (offerToSelf === 'on')

			if(targets === undefined || targets.length <= 0) {
				console.log('empty target')
				return
			}

			port.postMessage({
				type: 'offer',
				gameId,
				targets,
				includeSelf
			})

			offerForm.reset()
			offerToDialog?.close()
		}, { once: true })

		offerToDialog?.showModal()
	}
}

class UIGlobal {
	static setProgress(percent) {
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
		if(!(messageElem instanceof HTMLOutputElement)) { throw new Error('toast output invalid element') }
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
			if(!(usernameOutput instanceof HTMLOutputElement)) { continue }
			usernameOutput.value = user.displayName
		}
	}

	static logout(user) {
		UI.Global.setLoggedIn(user, false)

		// game listing
		UI.Listing.clearGameListing()

		// games
		UI.Field.clearFields()
	}

}

export class UI {
	static Listing = UIListing
	static Field = UIField
	static Dialog = UIDialog
	static Global = UIGlobal
}

