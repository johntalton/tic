// import { login, register } from './webauthn.js'
/** biome-ignore-all lint/nursery/noExcessiveLinesPerFile: <explanation> */
import { GameAPI, IsBoardType } from './game-api.js'
import { UI } from './ui.js'
import { UserAPI } from './user-api.js'

import './localized-output.js'
// import './elapsed-time.js'

/** @import { GameId, UserId, SessionUser } from './types.js' */

const COMMON_API_URL = 'https://tic.next.internal:8443'
const SIMPLE_LOGIN_URL = COMMON_API_URL
const WEB_AUTH_N_URL = COMMON_API_URL
const TIC_URL = COMMON_API_URL

/** @type {SessionUser} */
const USER = {
	isLoggedIn: false
	// id: undefined,
	// displayName: undefined,
	// accessToken: undefined,
	// sseToken: undefined
}

const gameApi = new GameAPI(USER, TIC_URL)
const userApi = new UserAPI(USER, TIC_URL)

const glyphCache = new Map()

const notificationGameIdSet = new Set()

/** @type {EventSource|undefined} */
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

/**
 * @param {GameId} gameId
 */
function handleAccept(gameId) {
	gameApi.accept(gameId)
		.then(updatedGame => {
			refreshGlyphCache(updatedGame.players)
			UI.Field.updateGameField(gameId, updatedGame, USER, glyphCache)
		})
		.catch(e => {
			UI.Global.showToast(e.message)
			console.warn(e)
		})
}

/**
 * @param {GameId} gameId
 */
function handleDecline(gameId) {
	gameApi.decline(gameId)
		.then(updatedGame => {
			// refreshGlyphCache(updatedGame.players)
			UI.Field.updateGameField(gameId, updatedGame, USER, glyphCache)
		})
		.catch(e => {
			UI.Global.showToast(e.message)
			console.warn(e)
		})
}

/**
 * @param {GameId} gameId
 */
function handleClose(gameId, confirmed = false, reason = undefined) {
	if(!confirmed) {
		UI.Dialog.confirmClose(gameId, clientPort)
		return
	}

	gameApi.close(gameId, reason)
		.then(updatedGame => {
			// refreshGlyphCache(updatedGame.players)
			UI.Field.updateGameField(gameId, updatedGame, USER, glyphCache)
		})
		.catch(e => {
			UI.Global.showToast(e.message)
			console.warn(e)
		})
}

/**
 * @param {GameId} gameId
 */
function handleForfeit(gameId, confirmed = false) {
	if(!confirmed) {
		UI.Dialog.confirmForfeit(gameId, clientPort)
		return
	}

	gameApi.forfeit(gameId)
		.then(updatedGame => {
			// refreshGlyphCache(updatedGame.players)
			UI.Field.updateGameField(gameId, updatedGame, USER, glyphCache)
		})
		.catch(e => {
			UI.Global.showToast(e.message)
			console.warn(e)
		})
}

/**
 * @param {GameId} gameId
 * @param {Array<UserId>} targets
 * @param {boolean} includeSelf
 */
function handleOffer(gameId, targets, includeSelf) {
	if(!USER.isLoggedIn) { throw new Error('User not logged In') }

	if(targets === undefined) {
		// const futureFriends = userApi.friends()
		UI.Dialog.startOffer(gameId, clientPort)
		return
	}

	const fullTargets = includeSelf ? [ USER.id, ...targets ] : targets

	console.log('offing game to', fullTargets)

	gameApi.offer(gameId, fullTargets)
		.then(updatedGame => {
			refreshGlyphCache(updatedGame.players)
			UI.Field.updateGameField(gameId, updatedGame, USER, glyphCache)
		})
		.catch(e => console.warn(e))
}

/**
 * @param {GameId} gameId
 * @param {string} position
 */
function handleGameMove(gameId, position) {
	gameApi.move(gameId, position)
		.then(updatedGame => {
			refreshGlyphCache(updatedGame.players)
			UI.Field.updateGameField(gameId, updatedGame, USER, glyphCache)
		})
		.catch(e => {
			UI.Global.showToast(e.message)
			console.warn(e)
		})
}

/**
 * @param {GameId} gameId
 */
function handleActivateGameField(gameId) {
	UI.Listing.selectGameListingItem(gameId)
	// UI.Field.skeletonGame(gameId)
	gameApi.fetch(gameId)
		.then(game => {
			refreshGlyphCache(game.players)
			notificationGameIdSet.delete(gameId)
			UI.Listing.clearGameListingItemNotification(gameId)
			UI.Field.activateGameField(gameId, game.type, clientPort)
			UI.Field.updateGameField(gameId, game, USER, glyphCache)
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




/**
 * @param {Event} _event
 */
function handleCreateGame(_event) {
	// const button = event.target
	// button.disabled = true
	// setTimeout(() => button.disabled = false, 1000)
	// const type = 'C4'

	const typeSelect = document.getElementById('createGameTypeSelect')
	if(!(typeSelect instanceof HTMLSelectElement)) { throw new Error('type selection not select element') }
	const type = typeSelect.value

	if(!IsBoardType(type)) {
		throw new Error('unknown board type')
	}

	gameApi.create(type)
		.then(game => {
			refreshGlyphCache(game.players)

			notificationGameIdSet.add(game.id)

			UI.Listing.addGameListingItem(game, USER, notificationGameIdSet, clientPort)
			UI.Field.activateGameField(game.id, game.type, clientPort)
			UI.Field.updateGameField(game.id, game, USER, glyphCache)
		})
		.catch(e => {
			UI.Global.showToast(e.message)
			console.warn(e)
		})
}

/**
 * @param {MessageEvent} message
 */
function handleSSEUpdate(message) {
	const { lastEventId, data } = message
	const json = JSON.parse(data)
	const { id: gameId } = json

	// console.log('sse event update', json)

	// todo if game not listed skip

	gameApi.fetch(gameId)
		.then(game => {
			// refreshGlyphCache(game.players)

			notificationGameIdSet.add(gameId)

			UI.Listing.addOrUpdateGameListingItem(game , USER, notificationGameIdSet, clientPort)

			if(UI.Field.hasGameField(gameId)) {
				UI.Field.updateGameField(gameId, game, USER, glyphCache)
			}
		})
		.catch(e => {
			// UI.showToast(e.message)
			console.warn(e)
		})

}

function startSSE() {
	if(!USER.isLoggedIn) { throw new Error('User not logged In') }

	const url = new URL('/tic/v1/events', TIC_URL)
	url.searchParams.set('token', USER.sseToken)
	sseStream = new EventSource(url, {
		// withCredentials: true
	})
	sseStream.onerror = error => console.warn(error)
	sseStream.onmessage = msg => console.log(msg)
	sseStream.addEventListener('update', handleSSEUpdate)
}

function stopSSE() {
	sseStream?.close()
	sseStream = undefined
}




/**
 * @param {Array<string>} userIds
 */
function refreshGlyphCache(userIds) {
	if(userIds.length <= 0) { return }

	userApi.list(userIds)
		.then(({ users }) => {
			for(const user of users) {
				glyphCache.set(user.id, user.glyph)
			}
		})
		.catch(e => {
			UI.Global.showToast(e.message)
		})
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
	if(!USER.isLoggedIn) { throw new Error('User not logged In') }

	refreshGlyphCache([ USER.id ])

	userApi.friends()
		.then(({ friends }) => {
			refreshGlyphCache(friends.map(friend => friend.id))
			UI.Dialog.updateFriends(friends)
		})

	clientPort.postMessage({ type: 'listing' })
	startSSE()
}

function simpleUserAutoLogin() {
	const info = localStorage.getItem('simple-login')
	if(info === null) {
		UI.Global.logout(USER)
		return false
	}

	const { id, displayName, accessToken, sseToken } = JSON.parse(info)

	USER.isLoggedIn = true
	USER.id = id
	USER.displayName = displayName
	USER.accessToken = accessToken
	USER.sseToken = sseToken

	UI.Global.setLoggedIn(USER)
	return true
}

/**
 * @param {Event} event
 */
function handleSimpleLoginForm(event) {
	if(event.target === null) {
		UI.Global.showToast('Missing From')
		return
	}

	if(!(event.target instanceof HTMLFormElement)) {
		UI.Global.showToast('Invalid From')
		return
	}

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

/**
 * @param {Event} event
 */
function handleSimpleLogout(event) {
	// localStorage.removeItem('simple-login')
	UI.Global.logout(USER)
	stopSSE()
	notificationGameIdSet.clear()

	USER.isLoggedIn = false
	USER.id = undefined
	USER.displayName = undefined
	USER.accessToken = undefined
	USER.sseToken = undefined

	localStorage.removeItem('simple-login')
}


function loadTheme() {
	const themeName = localStorage.getItem('theme')
	if(themeName === null) { return }
	document.body.dataset.theme = themeName
}


async function onContentLoadedAsync() {
	// document.querySelector('[data-action="login"]')?.addEventListener('click', handleLogin)
	// document.querySelector('[data-action="register"]')?.addEventListener('click', handleRegister)

	//
	globalThis.UI = UI

	//
	loadTheme()

	//
	document.getElementById('Toast')?.addEventListener('command', event => {
		const { command } = event

		if(command === '--hide-toast') {
			UI.Global.hideToast()
		}
		else {
			console.warn('unknown toast command', command)
		}
	})

	//
	document.getElementById('Aside')?.addEventListener('command', event => {
		const { command } = event

		if(command === '--toggle-aside') {
			document.body.toggleAttribute('data-aside')
		}
		else {
			console.warn('unknown aside command', command)
		}
	})

	//
	// document.getElementById('CreateNewGame')?.addEventListener('click', handleCreateGame)
	const createDialog = document.getElementById('CreateGame')
	const createForm = createDialog?.querySelector('form')
	createForm?.addEventListener('submit', handleCreateGame)

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

	//
	// const po = new PerformanceObserver((list) => {
	// 	for (const entry of list.getEntries()) {
	// 		console.log('Navigation Performance', entry.serverTiming)
	// 	}
	// })
	// po.observe({type: 'resource', buffered: true})
}

function onContentLoaded() {
	onContentLoadedAsync()
		.catch(e => {
			console.warn(e)
			UI.Global.showToast(`Failed to load application: ${e.message}`)
		})
}

(document.readyState === 'loading') ?
	document.addEventListener('DOMContentLoaded', onContentLoaded, { once: true }) :
	onContentLoaded()
