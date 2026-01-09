/**
 * @typedef {string & { readonly _brand: 'token' }} Token
 */

/**
 * @typedef {string & { readonly _brand: 'refreshToken' }} RefreshToken
 */

/**
 * @typedef {string & { readonly _brand: 'sseToken' }} SSEToken
 */

/**
 * @typedef {Object} TokenSet
 * @property {Token|undefined} [access]
 * @property {SSEToken|undefined} [sse]
 * @property {RefreshToken|undefined} [refresh]
 */

/**
 * @typedef {Object} SessionUser
 * @property {TokenSet} tokens
 */

export {}