/** @import { StoreUserEnvelopeBase } from '../types/store.user.js' */
/** @import { StoreGameEnvelopeBase } from '../types/store.game.js' */

export const CANAPE_KEY_ID = 'settee:id'
export const CANAPE_KEY_REV = 'settee:revision'

/** @typedef {string & { readonly _brand: 'canape:id' }} CanapeDocumentId */
/** @typedef {string & { readonly _brand: 'canape:rev' }} CanapeDocumentRev */

/**
 * @typedef {{
 *  [CANAPE_KEY_ID]: CanapeDocumentId
 *  [CANAPE_KEY_REV]: CanapeDocumentRev
 * }} CanapeStoreEnvelopeHeader
 */

/** @typedef {StoreUserEnvelopeBase & CanapeStoreEnvelopeHeader} CanapeStoreUser */

/** @typedef {StoreGameEnvelopeBase & CanapeStoreEnvelopeHeader} CanapeStoreGame */

/**
 * @template T
 * @typedef {Object} CanapeGenericRow
 * @property {CanapeDocumentId} id
 * @property {string} key
 * @property {T} value
 */

/**
 * @template T
 * @typedef {Object} CanapeGenericRows
 * @property {number} total_rows
 * @property {number} offset
 * @property {Array<CanapeGenericRow<T>>} rows
 */

export default {}