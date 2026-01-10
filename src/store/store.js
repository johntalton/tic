// import { canapeGameStore  } from './canape/game.js'
import { couchGameStore } from './couch/game.js'

/** @import { StoreGameId } from '../types/store.js' */

// export const gameStore = canapeGameStore
export const gameStore = couchGameStore


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
