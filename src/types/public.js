/** @import { ActionableGame } from '../games/tic.js' */
/** @import { StoreUserId, StoreUserInfo, StoreUserListItem } from './store.js' */
/** @import { Glyph } from '../users/grapheme.js' */
/** @import { Token, SSEToken, RefreshToken } from './global.js' */

/**
 * @typedef {Object} SigninInfo
 * @property {StoreUserId} id
 * @property {string} displayName
 * @property {Glyph} [glyph]
 * @property {Token} accessToken
 * @property {SSEToken} sseToken
 * @property {RefreshToken} refreshToken
 */

/**
 * @typedef {string & { readonly _brand: 'egid' }} EncodedGameId
 */

/**
 * @typedef {ActionableGame & { id: EncodedGameId }} IdentifiableActionableGame
 */

/**
 * @typedef {Object} GameListingItem
 */

/**
 * @typedef {Object} GameListing
 * @property {Array<GameListingItem>} games
 */

/**
 * @typedef {Object} UserPatchOptions
 * @property {string} [displayName]
 * @property {Glyph} [glyph]
 */

/**
 * @typedef {StoreUserInfo} User
 */

/**
 * @typedef {User & { id: StoreUserId }} IdentifiableUser
 */

/**
 * @typedef {Object} UserInfoList
 * @property {Array<StoreUserListItem>} users
 */

/**
 * @typedef {{ friends: Array<StoreUserId> }} FriendsListing
 */

/**
 * @typedef {Object} FriendsInfoList
 * @property {Array<StoreUserListItem>} friends
 */

export {}
