/** biome-ignore-all lint/nursery/noExcessiveClassesPerFile: <explanation> */
/** biome-ignore-all lint/nursery/noExcessiveLinesPerFile: <explanation> */

import { range } from './range.js'

/** @import { SessionUser, Game, GameId, BoardType, User } from './types.js' */

/**
 * @param {BoardType} type
 */
function buttonCountForGameType(type) {
	if(type === 'TTT') { return 9 }
	if(type === 'Reversi') { return 64 }
	if(type === 'C4') { return 42 }

	throw new Error('unknown board type')
}

class UIListing {
	/**
	 * @param {GameId} gameId
	 */
	static selectGameListingItem(gameId) {
		const gameListElement = document.getElementById('GamesListing')
		const gameListingItem = gameListElement?.querySelector(`li[data-game-id="${gameId}"]`)
		const lis = gameListElement?.querySelectorAll('li[data-game-id]')

		lis?.forEach(li => li.toggleAttribute('data-active', false))
		gameListingItem?.toggleAttribute('data-active', true)
	}

	/**
	 * @param {Game} game
	 * @param {SessionUser} user
	 * @param {Set<GameId>} notificationGameIdSet
	 * @param {MessagePort} port
	 */
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

	/**
	 * @param {Element} li
	 * @param {Game} game
	 * @param {SessionUser} user
	 * @param {Set<GameId>} notificationGameIdSet
	 */
	static updateGameListingItemLI(li, game, user, notificationGameIdSet) {
		if(!user.isLoggedIn) { throw new Error('user not logged in') }

		li.toggleAttribute('data-stale', false)

		const nameOutput = li.querySelector('output[data-game-name]')
		const subNameOutput = li.querySelector('output[data-game-subname]')
		const isOwnerOutput = li.querySelector('output[data-game-owner]')
		const elapsedTime = li.querySelector('elapsed-time[data-created-at]')
		const hasUpdateElem = li.querySelector('[data-game-has-update]')

		if((nameOutput === null) || !(nameOutput instanceof HTMLOutputElement)) { throw new Error('missing name output') }
		if((subNameOutput === null) || !(subNameOutput instanceof HTMLOutputElement)) { throw new Error('missing sub-name output') }
		if((isOwnerOutput === null) || !(isOwnerOutput instanceof HTMLOutputElement)) { throw new Error('missing isOwner output') }
		if(hasUpdateElem === null) { throw new Error('missing has-update element') }

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

	/**
	 * @param {GameId} gameId
	 */
	static clearGameListingItemNotification(gameId) {
		const gameListElement = document.getElementById('GamesListing')
		const gameListingItem = gameListElement?.querySelector(`li[data-game-id="${gameId}"]`)
		const hasUpdateElem = gameListingItem?.querySelector('[data-game-has-update]')

		const hasUpdateValue = false ? 'yes' : 'no'

		hasUpdateElem?.setAttribute('data-game-has-update', hasUpdateValue)
	}

	/**
	 * @param {Game} game
	 * @param {SessionUser} user
	 * @param {Set<GameId>} notificationGameIdSet
	 * @param {MessagePort} port
	 */
	static addOrUpdateGameListingItem(game, user, notificationGameIdSet, port) {
		const gameListElement = document.getElementById('GamesListing')
		const gameListingItem = gameListElement?.querySelector(`li[data-game-id="${game.id}"]`)
		if(gameListingItem === null || gameListingItem === undefined) {
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

	/**
	 * @param {{ games: Array<Game> }} listing
	 * @param {SessionUser} user
	 * @param {Set<GameId>} notificationGameIdSet
	 * @param {MessagePort} port
	 */
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

	// static clearGameListingItem(gameId) {
	// 	const gameListElement = document.getElementById('GamesListing')
	// 	const li = gameListElement?.querySelector(`li[data-game-id="${gameId}"]`)
	// 	li?.remove()
	// }

	static listFilters() {
		const filterForm = document.getElementById('ListFilterForm')
		if(filterForm === null) { return [] }
		if(!(filterForm instanceof HTMLFormElement)) { return [] }

		const fd = new FormData(filterForm)
		return fd.getAll('ListFilter').filter(value => (typeof value === 'string'))
	}
}

class UIField {
	/**
	 * @param {GameId} gameId
	 * @param {string} key
	 */
	static setGameMessage(gameId, key) {
		const gameFieldElem = document.querySelector(`game-field[game-id="${gameId}"]`)
		if(gameFieldElem === null) { return }

		const messages = gameFieldElem.querySelector('game-message')
		const children = messages?.querySelectorAll('[data-key]')
		children?.forEach(child => child.removeAttribute('data-active'))
		const message = gameFieldElem.querySelector(`[data-key="${key}"]`)
		message?.toggleAttribute('data-active', true)
	}

	/**
	 * @param {GameId} gameId
	 * @param {BoardType} type
	 * @param {MessagePort} port
	 */
	static createNewGameField(gameId, type, port) {
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

		const buttonTemplateElem = document.getElementById('BoardPositionButton')
		if(!(buttonTemplateElem instanceof HTMLTemplateElement)) { throw new Error('Button Template is not a template') }
		if(buttonTemplateElem === null) { throw new Error('missing Button Template') }

		const buttonCount = buttonCountForGameType(type)

		for(const position of range(0, buttonCount - 1)) {
			const buttonTemplateDocument = buttonTemplateElem.content.cloneNode(true)
			if(!(buttonTemplateDocument instanceof DocumentFragment)) { throw new Error('templateDocument is not a Document') }
			const buttonElem = buttonTemplateDocument.querySelector('button')
			if(buttonElem === null) { throw new Error('buttonTemplate does not have button') }
			buttonElem?.setAttribute('data-position', `${position}`)
			gameBoardElem?.append(buttonElem)
		}


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





		gameBoardElem?.setAttribute('type', type)
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

			// todo glyph from glyph cache for self
			// output.innerText = '❌' // '⭕'

			port.postMessage({
				type: 'move',
				gameId,
				position
			})
		})

		return gameFieldElem
	}

	/**
	 * @param {GameId} gameId
	 */
	static hasGameField(gameId) {
		const gameFieldElem = document.querySelector(`game-field[game-id="${gameId}"]`)
		return gameFieldElem !== null
	}

	/**
	 * @param {GameId} gameId
	 * @param {Game} game
	 * @param {SessionUser} user
	 */
	static updateGameField(gameId, game, user, glyphCache = new Map()) {
		if(!user.isLoggedIn) { throw new Error('user not logged in') }

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

		const { resolution, state, type } = game
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

		const [ playerA, playerB ] = game.players
		const playerAGlyph = glyphCache.get(playerA) ?? '❌'
		const playerBGlyph = glyphCache.get(playerB) ?? '⭕'

		game.board.forEach((playerId, index) => {
			const moveButtonElem = gameBoardElem?.querySelector(`button[data-position="${index}"]`)
			const output = moveButtonElem?.querySelector('output')

			if(output === null || output === undefined) { return }
			if(moveButtonElem === null || moveButtonElem === undefined || !(moveButtonElem instanceof HTMLButtonElement)) { return }

			if(playerId === 0) {
				output.value = ''
				moveButtonElem.disabled = false
			} else if(playerId === playerA) {
				output.value = playerAGlyph
				moveButtonElem.disabled = true
			} else if(playerId === playerB){
				output.value = playerBGlyph
				moveButtonElem.disabled = true
			} else {
				console.warn('player not listed in players', playerId)
			}

		})
	}

	/**
	 * @param {GameId} gameId
	 * @param {BoardType} type
	 * @param {MessagePort} port
	 */
	static activateGameField(gameId, type, port) {
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
			const newGameField = UI.Field.createNewGameField(gameId, type, port)
			newGameField.toggleAttribute('data-active', true)
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
	/**
	 * @param {GameId} gameId
	 * @param {MessagePort} port
	 */
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

	/**
	 * @param {GameId} gameId
	 * @param {MessagePort} port
	 */
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

	/**
	 * @param {GameId} gameId
	 * @param {MessagePort} port
	 */
	static startOffer(gameId, port) {
		const offerToDialog = document.getElementById('OfferTo')
		const offerForm = offerToDialog?.querySelector('form')

		if(!(offerToDialog instanceof HTMLDialogElement)) { throw new Error('OfferTo is not a Dialog element') }

		// offerToDialog.addEventListener('close', event => {})

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

	/**
	 * @param {Array<User>} friends
	 */
	static updateFriends(friends) {
		// offer listing
		const offerToSelection = document.getElementById('offerToUser')
		if(!(offerToSelection instanceof HTMLSelectElement)) { throw new Error('OfferToUser is not a select element') }
		// remove existing
		offerToSelection.querySelectorAll('option').forEach(o => o.remove())
		offerToSelection.append(...friends.map(friend => {
			const option = document.createElement('option')
			option.value = friend.id
			option.textContent = `${friend.glyph ? friend.glyph + ' ' : ''}${friend.displayName}`
			return option
		}))
	}
}

class UIGlobal {
	/**
	 * @param {number} _percent
	 */
	static setProgress(_percent) {
		// const progressElement = document.getElementById('GlobalProgress')
		// setInterval(() => {
		// 	progressElement.value += 1
		// 	if(progressElement.value >= 100) { progressElement.value = 0 }
		// }, 50)
	}

	/**
	 * @param {string} message
	 * @param {string|undefined} [kind]
	 */
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

	/**
	 * @param {SessionUser} user
	 */
	static setLoggedIn(user) {
		if(!user.isLoggedIn) { throw new Error('user not logged in') }

		document.querySelector('body')?.toggleAttribute('data-logged-in', true)

		const usernameOutputs = document.querySelectorAll('output[data-username]')
		for(const usernameOutput of usernameOutputs) {
			if(!(usernameOutput instanceof HTMLOutputElement)) { continue }
			usernameOutput.value = user.displayName
		}
	}

	/**
	 * @param {SessionUser} user
	 */
	static logout(user) {
		document.querySelector('body')?.toggleAttribute('data-logged-in', true)

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

