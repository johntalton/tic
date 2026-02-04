/** @import { Token, SSEToken, RefreshToken } from './global.js' */
/** @import { Glyph } from '../users/grapheme.js' */
/** @import { EncodedUserId } from './public.user.js' */

/**
 * @typedef {Object} SigninInfo
 * @property {EncodedUserId} id
 * @property {string} displayName
 * @property {Glyph} [glyph]
 * @property {Token} accessToken
 * @property {SSEToken} sseToken
 * @property {RefreshToken} refreshToken
 */

