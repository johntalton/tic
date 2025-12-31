import { Tic, isViewable } from './tic.js'
import { ELO, WIN, LOSE, DRAW } from './elo.js'
import { gameStore, storeGameIdFromString } from '../store/game.js'
import { storeUserIdFromString, userStore } from '../store/user.js'

// const KEY = await crypto.subtle.generateKey({
// 		name: 'AES-GCM',
// 		length: 256
// 	},
// 	false,
// 	[ 'encrypt', 'decrypt' ])

/** @import { SessionUser } from '../types/global.js' */
/** @import { StoreGameId, ResolvedStoreInfo, StoreUserId } from '../types/store.js' */
/** @import { ActionableGame, Game } from './tic.js' */
/** @import { EncodedGameId, IdentifiableActionableGame } from '../types/public.js' */

/**
 * @param {string} id
 * @returns {EncodedGameId}
 */
export function storeEncodedGameIdFromString(id) {
	return /** @type {EncodedGameId} */ (id)
}

/**
 * @param {string} id
 * @returns {id is EncodedGameId}
 */
export function isStoreEncodedGameId(id) {
	return true
}

/**
 * @param {EncodedGameId} id
 * @param {StoreUserId} userId
 * @returns {Promise<ResolvedStoreInfo>}
 */
export async function resolveFromStore(id, userId) {
  // if(id === '404') { throw new Error('404 test id')}

	const gameId = await fromIdentifiableGameId(id)

  const gameObject = await gameStore.get(gameId)
  if(gameObject === undefined) { throw new Error('unknown game') }

  const { game } = gameObject
  if(game === undefined) { throw new Error('object does not have a game') }

  if(!isViewable(game, userId)) { throw new Error('not viewable') }

  return { game, gameObject }
}

/**
 * @param {ActionableGame} actionableGame
 */
export async function computeAndUpdateELO(actionableGame) {
  // resolved, compute and update players ELO
	const { resolution } = actionableGame

	// game not resolved yet, just skip
	if(!resolution.resolved) { return }

	const [ playerAObject, playerBObject ] = await Promise.all(
		actionableGame.players
			.map(playerId => userStore.get(storeUserIdFromString(playerId))))

	const scoreA = resolution.draw ? DRAW : ((resolution.winner.user === playerAObject._id) ? WIN : LOSE)
	const scoreB = 1 - scoreA

	const nextELO = ELO.compute(
		{ rating: playerAObject.user.elo, score: scoreA },
		{ rating: playerBObject.user.elo, score: scoreB })

	const updatedAt = Date.now()

	const updatedPlayerAObject = {
		...playerAObject,
		user: {
			...playerAObject.user,
			elo: nextELO.ratingA
		},
		meta: {
			...playerAObject.meta,
			updatedAt
		}
	}

	const updatedPlayerBObject = {
		...playerBObject,
		user: {
			...playerBObject.user,
			elo: nextELO.ratingB
		},
		meta: {
			...playerBObject.meta,
			updatedAt
		}
	}

	return Promise.all([
		userStore.set(storeUserIdFromString(updatedPlayerAObject._id), updatedPlayerAObject),
		userStore.set(storeUserIdFromString(updatedPlayerBObject._id), updatedPlayerBObject)
	])
}

/**
 * @param {EncodedGameId} id
 * @returns {Promise<StoreGameId>}
 */
export async function fromIdentifiableGameId(id) {
	return storeGameIdFromString(id.substring(2))

	// const [ g, ciphertext64, nonce64 ] = id.split(':')

	// if(g !== 'G') { throw new Error('invalid encoded game id') }

	// const ciphertext8 = Uint8Array.fromBase64(ciphertext64, { alphabet: 'base64url' })
	// const nonce = Uint8Array.fromBase64(nonce64, { alphabet: 'base64url' })

	// const decrypted = await crypto.subtle.decrypt({
	// 	name: 'AES-GCM',
	// 	iv: nonce
	// }, KEY, ciphertext8)
	// const decoder = new TextDecoder()
	// return decoder.decode(decrypted)
}

/**
 * @param {StoreGameId} id
 * @returns {Promise<EncodedGameId>}
 */
export async function identifiableGameId(id) {
	return storeEncodedGameIdFromString(`G:${id}`)

	// const encoder = new TextEncoder()
	// const data = encoder.encode(id)

	// const nonce = crypto.getRandomValues(new Uint8Array(12))
	// const ciphertext = await crypto.subtle.encrypt({
	// 	name: 'AES-GCM',
	// 	iv: nonce
	// }, KEY, data)

	// const ciphertext8 = new Uint8Array(ciphertext)
	// const ciphertext64 = ciphertext8.toBase64({ alphabet: 'base64url' })
	// const nonce64 = nonce.toBase64({ alphabet: 'base64url' })
	// return `G:${ciphertext64}:${nonce64}`
}

/**
 * @param {EncodedGameId} encodedGameId
 * @param {ActionableGame} actionableGame
 * @returns {Promise<IdentifiableActionableGame>}
 */
export async function identifiableGameWithEncodedId(encodedGameId, actionableGame) {
	return {
		id: encodedGameId,
		...actionableGame
	}
}

/**
 * @param {StoreGameId} gameId
 * @param {ActionableGame} actionableGame
 * @returns {Promise<IdentifiableActionableGame>}
 */
export async function identifiableGame(gameId, actionableGame) {
	const encodedGameId = await identifiableGameId(gameId)
	return identifiableGameWithEncodedId(encodedGameId, actionableGame)
}