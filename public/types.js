/** @typedef {string} UserId */

/**
 * @typedef {Object} User
 * @property {UserId} id
 * @property {string} displayName
 * @property {string} glyph
 */

/** @typedef {string} GameId */

/** @typedef { 'Reversi' | 'TTT' | 'C4' } BoardType */

/** @typedef {string} State */

/**
 * @typedef {Object} Resolution
 * @property {boolean} draw
 * @property {boolean} full
 * @property {boolean} resolved
 * @property {boolean} win
 * @property {{ user: UserId, name: string }} winner
 */

/**
 * @typedef {Object} Game
 * @property {GameId} id
 * @property {BoardType} type
 * @property {State} state
 * @property {UserId} owner
 * @property {Array<UserId>} active
 * @property {Array<UserId>} players
 * @property {Array<string>} actions
 * @property {string} createdAt
 *
 * @property {Array<UserId|0>} board
 * @property {Resolution} resolution
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
