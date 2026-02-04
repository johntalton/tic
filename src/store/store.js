import { CanapeGameStore } from './canape/game.js'
import { CanapeUserStore } from './canape/user.js'

import { CouchGameStore } from './couch/game.js'
import { CouchUserStore } from './couch/user.js'

/** @import { StoreGameId } from '../types/store.game.js' */
/** @import { StoreUserId } from '../types/store.user.js' */

export const USE_CANAPE = true

export const gameStore = USE_CANAPE ?
	new CanapeGameStore('https://canape.next.local:6095/tic') :
	new CouchGameStore()


export const userStore = USE_CANAPE ?
	new CanapeUserStore('https://canape.next.local:6095/tic') :
	new CouchUserStore()

/**
 * @param {string} id
 * @returns {StoreGameId}
 */
export function storeGameIdFromString(id) {
	if(isStoreGameId(id)) { return id }
	throw new Error('not a store game id')
}

/**
 * @param {string} id
 * @returns {id is StoreGameId}
 */
export function isStoreGameId(id) {
	if(id === undefined || id.length === 0) { return false }
	return true
}


/**
 * @param {string} id
 * @returns {StoreUserId}
 */
export function storeUserIdFromString(id) {
	if(isStoreUserId(id)) { return id }
	throw new Error('not a store user id')
}

/**
 * @param {string} id
 * @returns {id is StoreUserId}
 */
export function isStoreUserId(id) {
	if(id === undefined) { return false }
	if(id === '') { return false }
	return true
}

