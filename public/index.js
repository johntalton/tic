// import { login, register } from './webauthn.js'
import { GameAPI } from './game-api.js'
import { UserAPI } from './user-api.js'
import { UI } from './ui.js'

import './localized-output.js'
// import './elapsed-time.js'

const COMMON_API_URL = 'https://tic.next.local:8443'
const SIMPLE_LOGIN_URL = COMMON_API_URL
const WEB_AUTH_N_URL = COMMON_API_URL
const TIC_URL = COMMON_API_URL

const USER = {
	// id: 'bob123',
	// displayName: 'Bob',
	// token: 'abcd1234'
}

const gameApi = new GameAPI(USER, TIC_URL)
const userApi = new UserAPI(USER, TIC_URL)
const notificationGameIdSet = new Set()
var sseStream = undefined
const { port1: gamePort, port2: clientPort } = new MessageChannel()

gamePort.start()
gamePort.addEventListener('message', message => {
	const {
		type,
		gameId,
		position,
		confirmed,
		targets,
		includeSelf,
		reason
	} = message.data

	switch(type) {
		case 'listing': handleLoadListing(); break
		case 'activate': handleActivateGameField(gameId); break
		case 'accept': handleAccept(gameId); break
		case 'close': handleClose(gameId, confirmed, reason); break
		case 'decline': handleDecline(gameId); break
		case 'forfeit': handleForfeit(gameId, confirmed); break
		case 'offer': handleOffer(gameId, targets, includeSelf); break
		case 'move': handleGameMove(gameId, position); break
		default:
			console.warn('unhandled message', type)
	}
})

function handleAccept(gameId) {
	gameApi.accept(gameId)
		.then(updatedGame => UI.Field.updateGameField(gameId, updatedGame, USER))
		.catch(e => {
			UI.Global.showToast(e.message)
			console.warn(e)
		})
}

function handleDecline(gameId) {
	gameApi.decline(gameId)
		.then(updatedGame => UI.Field.updateGameField(gameId, updatedGame, USER))
		.catch(e => {
			UI.Global.showToast(e.message)
			console.warn(e)
		})
}

function handleClose(gameId, confirmed = false, reason = undefined) {
	if(!confirmed) {
		UI.Dialog.confirmClose(gameId, clientPort)
		return
	}

	gameApi.close(gameId, reason)
		.then(updatedGame => UI.Field.updateGameField(gameId, updatedGame, USER))
		.catch(e => {
			UI.Global.showToast(e.message)
			console.warn(e)
		})
}

function handleForfeit(gameId, confirmed = false) {
	if(!confirmed) {
		UI.Dialog.confirmForfeit(gameId, clientPort)
		return
	}

	gameApi.forfeit(gameId)
		.then(updatedGame => UI.Field.updateGameField(gameId, updatedGame, USER))
		.catch(e => {
			UI.Global.showToast(e.message)
			console.warn(e)
		})
}

function handleOffer(gameId, targets, includeSelf) {
	if(targets === undefined) {
		// const futureFriends = userApi.friends()
		UI.Dialog.startOffer(gameId, clientPort)
		return
	}

	const fullTargets = includeSelf ? [ USER.id, ...targets ] : targets

	console.log('offing game to', fullTargets)

	gameApi.offer(gameId, fullTargets)
		.then(updatedGame => UI.Field.updateGameField(gameId, updatedGame, USER))
		.catch(e => console.warn(e))
}

function handleGameMove(gameId, position) {
	gameApi.move(gameId, position)
		.then(updatedGame => UI.Field.updateGameField(gameId, updatedGame, USER))
		.catch(e => {
			UI.Global.showToast(e.message)
			console.warn(e)
		})
}

function handleActivateGameField(gameId) {
	UI.Listing.selectGameListingItem(gameId)
	UI.Field.activateGameField(gameId, clientPort)
	gameApi.fetch(gameId)
		.then(game => {
			notificationGameIdSet.delete(gameId)
			UI.Listing.clearGameListingItemNotification(gameId)
			UI.Field.updateGameField(gameId, game, USER)
		})
		.catch(e => {
			UI.Global.showToast(e.message)
			console.warn(e)
		})
}

function handleFilterChange() {
	// debounce
	handleLoadListing()
}

function handleLoadListing() {
	const filter = UI.Listing.listFilters()

	// UI.clearGameListing()
	gameApi.listing(filter)
		.then(result => UI.Listing.updateGameListing(result, USER, notificationGameIdSet, clientPort))
		.catch(e => {
			UI.Global.showToast(e.message)
			console.warn(e)
		})
}





function handleCreateGame(event) {
	const button = event.target
	button.disabled = true
	setTimeout(() => button.disabled = false, 1000)

	gameApi.create()
		.then(game => {
			notificationGameIdSet.add(game.id)

			UI.Listing.addGameListingItem(game, USER, notificationGameIdSet, clientPort)
			UI.Field.activateGameField(game.id, clientPort)
			UI.Field.updateGameField(game.id, game, USER)
		})
		.catch(e => {
			UI.Global.showToast(e.message)
			console.warn(e)
		})
}

function handleSSEUpdate(message) {
	const { lastEventId, data } = message
	const json = JSON.parse(data)
	const { id: gameId } = json

	console.log('sse event update', json)

	// todo if game not listed skip

	gameApi.fetch(gameId)
		.then(game => {
			notificationGameIdSet.add(gameId)

			UI.Listing.addOrUpdateGameListingItem(game , USER, notificationGameIdSet, clientPort)

			if(UI.Field.hasGameField(gameId)) {
				UI.Field.updateGameField(gameId, game, USER)
			}
		})
		.catch(e => {
			// UI.showToast(e.message)
			console.warn(e)
		})

}

function startSSE() {
	const url = new URL('/tic/v1/events', TIC_URL)
	url.searchParams.set('token', USER.accessToken)
	sseStream = new EventSource(url, {
		// withCredentials: true
	})
	sseStream.onerror = error => console.warn(error)
	sseStream.onmessage = msg => console.log(msg)
	sseStream.addEventListener('update', handleSSEUpdate)
}

function stopSSE() {
	sseStream.close()
	sseStream = undefined
}



// function usernameFromDOM() {
// 	const usernameInput = document.getElementById('UserName')
// 	if(usernameInput === null || usernameInput?.value === '') {
// 		throw new Error('Invalid User Name')
// 	}

// 	return usernameInput?.value
// }

// function handleRegister(event) {
// 	event.preventDefault()

// 	const username = usernameFromDOM()

// 	register(WEB_AUTH_N_URL, username)
// 		.then(() => {})
// 		.catch(e => {})
// }

// function handleLogin(event) {
// 	event.preventDefault()

// 	// const username = usernameFromDOM()

// 	login(WEB_AUTH_N_URL)
// 		.then(() => {})
// 		.catch(e => {})
// }

function handleOnLoggedIn() {
	userApi.friends()
		.then(({ friends }) => {
			UI.Dialog.updateFriends(friends)
		})

	clientPort.postMessage({ type: 'listing' })
	startSSE()
}

function simpleUserAutoLogin() {
	const info = localStorage.getItem('simple-login')
	if(info === null) {
		UI.Global.setLoggedIn(USER, false)
		return false
	}

	const { id, displayName, accessToken } = JSON.parse(info)

	USER.id = id
	USER.displayName = displayName
	USER.accessToken = accessToken

	UI.Global.setLoggedIn(USER)
	return true
}

function handleSimpleLoginForm(event) {

	const fd = new FormData(event.target)
	const name = fd.get('username')
	if(name === null || typeof name != 'string') {
		UI.Global.showToast('Missing User Name')
		return
	}

	const url = new URL('/authentication/simple-login', SIMPLE_LOGIN_URL)
	url.searchParams.set('name', name)

	fetch(url, {
		method: 'POST',
		mode: 'cors',
		headers: {
			'Accept': 'application/json',
			'Authorization': `Bearer Anonymous`
		}
	})
		.then(async response => {
			if(!response.ok) {
				const text = await response.text()
				throw new Error(`not ok ${response.status} (${text})`)
			}

			const json = await response.json()
			localStorage.setItem('simple-login', JSON.stringify(json))

			if(simpleUserAutoLogin()) {
				handleOnLoggedIn()
			}
		})
		.catch(e => {
			console.warn(e)
			UI.Global.showToast(`simple login error: ${e.message}`)
		})
}

function handleSimpleLogout(event) {
	// localStorage.removeItem('simple-login')
	UI.Global.logout(USER)
	stopSSE()
	notificationGameIdSet.clear()

	USER.id = undefined
	USER.displayName = undefined
	USER.accessToken = undefined
}


function loadTheme() {
	const themeName = localStorage.getItem('theme')
	if(themeName === null) { return }
	document.body.dataset.theme = themeName
}


async function onContentLoadedAsync(params) {
	// document.querySelector('[data-action="login"]')?.addEventListener('click', handleLogin)
	// document.querySelector('[data-action="register"]')?.addEventListener('click', handleRegister)

	//
	globalThis.UI = UI

	//
	loadTheme()

	//
	document.getElementById('CreateNewGame')?.addEventListener('click', handleCreateGame)

	//
	document.getElementById('ListFilterForm')?.addEventListener('change', handleFilterChange)

	//
	const logoutButton = document.getElementById('SimpleLogout')
	logoutButton?.addEventListener('click', handleSimpleLogout)

	//
	const simpleDialog = document.getElementById('SimpleUser')
	const simpleForm = simpleDialog?.querySelector('form')
	simpleForm?.addEventListener('submit', handleSimpleLoginForm)

	if(simpleUserAutoLogin()) {
		handleOnLoggedIn()
	}
}

function onContentLoaded() {
	onContentLoadedAsync()
		.catch(e => {
			console.warn(e)
			UI.Global.showToast(`Failed to load application: ${e.message}`)
		})
}

(document.readyState === 'loading') ?
	document.addEventListener('DOMContentLoaded', onContentLoaded) :
	onContentLoaded()
