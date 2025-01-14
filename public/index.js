// import { login, register } from './webauthn.js'
import { GameAPI } from './game-api.js'
import { UI } from './ui.js'

import './localized-output.js'

const USER = {
	// id: 'bob123',
	// name: 'Bob',
	// accessToken: 'abcd1234'
}

const COMMON_API_URL = 'https://next.local:8443'
const SIMPLE_LOGIN_URL = COMMON_API_URL
const WEB_AUTH_N_URL = COMMON_API_URL
const TIC_URL = COMMON_API_URL

const gameApi = new GameAPI(USER, TIC_URL)

const { port1: gamePort, port2: clientPort } = new MessageChannel()

gamePort.start()
gamePort.addEventListener('message', message => {
	const {
		type,
		gameId,
		position,
		confirmed,
		targets,
		reason
	} = message.data

	switch(type) {
		case 'listing': handleLoadListing(); break
		case 'activate': handleActivateGameField(gameId); break
		case 'accept': handleAccept(gameId); break
		case 'close': handleClose(gameId, confirmed, reason); break
		case 'decline': handleDecline(gameId); break
		case 'forfeit': handleForfeit(gameId, confirmed); break
		case 'offer': handleOffer(gameId, targets); break
		case 'move': handleGameMove(gameId, position); break
		default:
			console.warn('unhandled message', type)
	}
})

function handleAccept(gameId) {
	gameApi.accept(gameId)
		.then(updatedGame => UI.updateGameField(updatedGame, USER))
		.catch(e => {
			UI.showToast(e.message)
			console.warn(e)
		})
}

function handleDecline(gameId) {
	gameApi.decline(gameId)
		.then(updatedGame => UI.updateGameField(updatedGame, USER))
		.catch(e => {
			UI.showToast(e.message)
			console.warn(e)
		})
}

function handleClose(gameId, confirmed = false, reason = undefined) {
	if(!confirmed) {
		UI.confirmClose(gameId, clientPort)
		return
	}

	gameApi.close(gameId, reason)
		.then(updatedGame => UI.updateGameField(updatedGame, USER))
		.catch(e => {
			UI.showToast(e.message)
			console.warn(e)
		})
}

function handleForfeit(gameId, confirmed = false) {
	if(!confirmed) {
		UI.confirmForfeit(gameId, clientPort)
		return
	}

	gameApi.forfeit(gameId)
		.then(updatedGame => UI.updateGameField(updatedGame, USER))
		.catch(e => {
			UI.showToast(e.message)
			console.warn(e)
		})
}

function handleOffer(gameId, targets) {
	if(targets === undefined) {
		UI.startOffer(gameId, clientPort)
		return
	}

	console.log('offing game to', targets)
	gameApi.offer(gameId, targets)
		.then(updatedGame => UI.updateGameField(updatedGame, USER))
		.catch(e => console.warn(e))
}


function handleGameMove(gameId, position) {
	gameApi.move(gameId, position)
		.then(updatedGame => UI.updateGameField(updatedGame, USER))
		.catch(e => {
			UI.showToast(e.message)
			console.warn(e)
		})
}

function handleActivateGameField(gameId) {
	UI.activateGameField(gameId, clientPort)
	gameApi.fetch(gameId)
		.then(game => UI.updateGameField(game, USER))
		.catch(e => {
			UI.showToast(e.message)
			console.warn(e)
		})
}

function handleLoadListing() {
	gameApi.listing()
		.then(result => UI.updateGameListing(result, clientPort))
		.catch(e => {
			UI.showToast(e.message)
			console.warn(e)
		})
}

function startSSE() {
	const sseStream = new EventSource(`https://next.local:8443/tic/v1/events?token=${USER.accessToken}`, {
		// withCredentials: true
	})
	sseStream.onerror = error => console.warn(error)
	sseStream.onmessage = msg => console.log(msg)
	sseStream.addEventListener('update', msg => {
		const { lastEventId, data } = msg
		const json = JSON.parse(data)
		const { id: gameId } = json

		// if(!UI.hasGameListingItem(gameId)) {

		// }

		if(!UI.hasGameField(gameId)) {
			// game is not in the game field
			return
		}

		gameApi.fetch(gameId)
			.then(game => UI.updateGameField(game, USER))
			.catch(e => {
				// UI.showToast(e.message)
				console.warn(e)
			})

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



function simpleUserAutoLogin() {
	const info = localStorage.getItem('simple-login')
	if(info === null) {
		UI.setLoggedIn(false)
		return false
	}

	const { id, displayName, token } = JSON.parse(info)

	USER.id = id
	USER.name = displayName
	USER.accessToken = token

	UI.setLoggedIn()
	return true
}

function handleSimpleLoginForm(event) {
	// event.preventDefault()

	// const dialogElem = document.getElementById('SimpleUser')
	// dialogElem.close()

	// const usernameElem = document.getElementById('SimpleUserName')
	// const name = usernameElem?.value
	// if(name === undefined || name.length < 5) {
	// 	UI.showToast('User Name invalid')
	// 	return
	// }


	const fd = new FormData(event.target)
	if(!fd.has('username')) {
		UI.showToast('Missing User Name')
		return
	}

	const name = fd.get('username')

	const url = new URL('/simple-login', SIMPLE_LOGIN_URL)
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
			// const { id, displayName, token } = json

			// USER.id = id
			// USER.name = displayName
			// USER.accessToken = token

			localStorage.setItem('simple-login', JSON.stringify(json))


			if(simpleUserAutoLogin()) {
				clientPort.postMessage({ type: 'listing' })
				startSSE()
			}

		})
		.catch(e => {
			console.warn(e)
			UI.showToast(`simple login error: ${e.message}`)
		})

}



async function onContentLoadedAsync(params) {
	// document.querySelector('[data-action="login"]')?.addEventListener('click', handleLogin)
	// document.querySelector('[data-action="register"]')?.addEventListener('click', handleRegister)

	globalThis.UI = UI




	const simpleDialog = document.getElementById('SimpleUser')
	const simpleForm = simpleDialog?.querySelector('form')
	simpleForm?.addEventListener('submit', handleSimpleLoginForm)

	// document.querySelector('[data-action="simpleLogin"]')?.addEventListener('click', handleSimpleLogin)

	if(simpleUserAutoLogin()) {
		clientPort.postMessage({ type: 'listing' })
		startSSE()
	}
}

function onContentLoaded() {
	onContentLoadedAsync()
		.catch(e => {
			console.warn(e)
			UI.showToast(`Failed to load application: ${e.message}`)
		})
}

(document.readyState === 'loading') ?
	document.addEventListener('DOMContentLoaded', onContentLoaded) :
	onContentLoaded()
