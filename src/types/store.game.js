/** @import { Game } from '../games/tic.js' */
/** @import { StoreUserId } from '../types/store.user.js' */

/** @typedef {string & { readonly _brand: 'gid' }} StoreGameId */

/** @typedef {{ storeGameId: StoreGameId }} WithId */
/** @typedef {{ storeGameRevision: string }} WithRevision */

/**
 * @typedef {Object} ResolvedStoreInfo
 * @property {Game<StoreUserId>} game
 * @property {StoreGameEnvelope} gameObject
 */

/**
 * @typedef {Object} StoreGameMetadata
 * @property {number} createdAt
 * @property {number} updatedAt
 */

/**
 * @typedef {Object} StoreGameEnvelopeBase
 * @property {'game.tic.v1'} type
 * @property {Game<StoreUserId>} game
 * @property {StoreGameMetadata} meta
 */

/**
 * @typedef {StoreGameEnvelopeBase & WithId & WithRevision} StoreGameEnvelope
 */

/** @typedef {Pick<Game<StoreUserId>, 'state'|'owner'|'players'>} GameBase */
/** @typedef {{ createdAt: number }} WithCreatedAt */
/** @typedef {{ active: Array<string> }} WithActiveList */
/** @typedef {{ active: boolean }} WithActive*/

/** @typedef {GameBase & WithActiveList & WithCreatedAt} StoreGameListItemRow */

/** @typedef {GameBase & WithActive & WithCreatedAt & WithId} StoreGameListItem */

export {}
