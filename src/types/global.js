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
 * @property {Token} [access]
 * @property {SSEToken} [sse]
 * @property {RefreshToken} [refresh]
 */

/**
 * @typedef {Object} SessionUser
 * @property {TokenSet} tokens
 */

export {}