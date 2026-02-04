/** @import { ActionableGame, Game } from '../games/tic.js' */
/** @import { EncodedUserId } from './public.user.js' */

/** @typedef {string & { readonly _brand: 'egid' }} EncodedGameId */

/** @typedef {{ id: EncodedGameId }} WithEncodedId */

/** @typedef {ActionableGame<EncodedUserId> & WithEncodedId} IdentifiableActionableGame */

/**
 * @typedef {Object} GameListingItemExtension
 * @property {boolean} active
 * @property {number} createdAt
 */

/** @typedef {Pick<Game<EncodedUserId>, 'state'|'owner'|'players'> & GameListingItemExtension & WithEncodedId} GameListingItem */

/**
 * @typedef {Object} GameListing
 * @property {Array<GameListingItem>} games
 */

