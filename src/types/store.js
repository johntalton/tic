/** @import { Game } from '../games/tic.js' */
/** @import { Token, RefreshToken, SSEToken } from './global.js' */
/** @import { Glyph } from '../users/grapheme.js' */

/**
 * @typedef {string & { readonly _brand: 'uid' }} StoreUserId
 */

/**
 * @typedef {Object} BasicUserInfo
 * @property {string} displayName
 * @property {number} elo
 * @property {Glyph|undefined} [glyph]
 */

/**
 * @typedef {Object} WithFriends
 * @property {Array<StoreUserId>} friends
 */

/**
 * @typedef {Object} WithId
 * @property {StoreUserId} id
 */

/**
 * @typedef {BasicUserInfo & WithFriends} StoreUserInfo
 */

/**
 * @typedef {Object} StoreUserSessionInfo
 * @property {Token} token
 * @property {RefreshToken} refreshToken
 * @property {SSEToken} sseToken
 */

/**
 * @typedef {Object} StoreUserMetadata
 * @property {number} createdAt
 * @property {number} updatedAt
 */

/**
 * @typedef {Object} StoreUser
 * @property {string} _id
 * @property {string} _rev
 * @property {'user.tic.v1'} type
 * @property {StoreUserInfo} user
 * @property {StoreUserSessionInfo} session
 * @property {StoreUserMetadata} meta
 */

/**
 * @typedef {BasicUserInfo} StoreUserListItemRaw
 */

/**
 * @typedef {BasicUserInfo & WithId} StoreUserListItem
 */



/**
 * @typedef {string & { readonly _brand: 'gid' }} StoreGameId
 */

/**
 * @typedef {Object} ResolvedStoreInfo
 * @property {Game} game
 * @property {StoreGame} gameObject
 */

/**
 * @typedef {Object} StoreGameMetadata
 * @property {number} createdAt
 * @property {number} updatedAt
 */

/**
 * @typedef {Object} StoreGameBase
 * @property {'game.tic.v1'} type
 * @property {Game} game
 * @property {StoreGameMetadata} meta
 */

/**
 * @typedef {Object} StoreGameExtension
 * @property {StoreGameId} _id
 * @property {string} _rev
 */

/**
 * @typedef {StoreGameBase & StoreGameExtension} StoreGame
 */


/**
 * @typedef {Object} StoreGameListItemRaw
 * @property {string} state
 * @property {string} owner
 * @property {Array<string>} active
 * @property {Array<string>} players
 * @property {number} createdAt
*/

/**
 * @typedef {Object} StoreGameListItem
 * @property {StoreGameId} _id
 * @property {string} state
 * @property {string} owner
 * @property {boolean} active
 * @property {Array<string>} players
 * @property {number} createdAt
 */

export {}