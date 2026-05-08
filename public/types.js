/** @typedef {string} UserId */

/**
 * @typedef {Object} User
 * @property {UserId} id
 * @property {string} glyph
 */

/** @typedef {string} GameId */

/** @typedef { 'Reversi' | 'TTT' | 'C4' } BoardType */

/**
 * @typedef {Object} Game
 * @property {GameId} id
 * @property {BoardType} type
 * @property {Array<UserId>} players
 */


/**
 * @typedef {Object} ActiveSessionUser
 * @property {true} isLoggedIn
 * @property {UserId} id
 * @property {string} displayName
 * @property {string} accessToken
 * @property {string} sseToken
 */

/**
 * @typedef {Object} InactiveSessionUser
 * @property {false} isLoggedIn
 */

/** @typedef {ActiveSessionUser|InactiveSessionUser} SessionUser */

export {}
