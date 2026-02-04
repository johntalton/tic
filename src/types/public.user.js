/** @import { Glyph } from '../users/grapheme.js' */

/** @typedef {string & { readonly _brand: 'euid' }} EncodedUserId */

/**
 * @typedef {Object} UserBase
 * @property {string} displayName
 * @property {number} elo
 * @property {Glyph|undefined} [glyph]
 */

/**
 * @typedef {Object} UserPatchOptions
 * @property {string} [displayName]
 * @property {Glyph} [glyph]
 */

/**
 * @template U
 * @typedef {Object} WithFriends
 * @property {Array<U>} friends
 */

/**
 * @template U
 * @typedef {UserBase & WithFriends<U>} User
 */

/** @typedef {{ id: EncodedUserId }} WithEncodedId */

/** @typedef {User<EncodedUserId> & WithEncodedId} IdentifiableUser */

/** @typedef {UserBase & WithEncodedId} IdentifiableUserBase */

/** @typedef {{ users: Array<IdentifiableUserBase> }} UserInfoList */

/** @typedef {{ friends: Array<EncodedUserId> }} FriendsListing */

/**  @typedef {{ friends: Array<IdentifiableUserBase> }} FriendsInfoList */

export {}
