/** @import { Token, RefreshToken, SSEToken } from './global.js' */
/** @import { UserBase, User } from './public.user.js' */

/** @typedef {string & { readonly _brand: 'uid' }} StoreUserId */

/** @typedef {{ storeUserId: StoreUserId }} WithId */
/** @typedef {{ storeUserRevision: string }} WithRevision */

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
 * @typedef {Object} StoreUserEnvelopeBase
 * @property {'user.tic.v1'} type
 * @property {User<StoreUserId>} user
 * @property {StoreUserSessionInfo} session
 * @property {StoreUserMetadata} meta
 */

/** @typedef {StoreUserEnvelopeBase & WithId & WithRevision} StoreUserEnvelope */

/** @typedef {UserBase} StoreUserListItemRow */

/** @typedef {UserBase & WithId} StoreUserListItem */

export {}