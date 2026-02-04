/** @import { StoreUserEnvelopeBase } from '../types/store.user.js' */
/** @import { StoreGameEnvelopeBase } from '../types/store.game.js' */

export const COUCH_KEY_ID = '_id'
export const COUCH_KEY_REV = '_rev'

/** @typedef {string & { readonly _brand: 'couch:id' }} CouchDocumentId */
/** @typedef {string & { readonly _brand: 'couch:rev' }} CouchDocumentRev */

/**
 * @typedef {{
 *  [COUCH_KEY_ID]: CouchDocumentId
 *  [COUCH_KEY_REV]: CouchDocumentRev
 * }} CouchStoreEnvelopeHeader
 */

/** @typedef {StoreUserEnvelopeBase & CouchStoreEnvelopeHeader} CouchStoreUser */

/** @typedef {StoreGameEnvelopeBase & CouchStoreEnvelopeHeader} CouchStoreGame */

/**
 * @template T
 * @typedef {Object} CouchGenericRow<T>
 * @property {CouchDocumentId} id
 * @property {string} key
 * @property {T} value
 */

/**
 * @template T
 * @typedef {Object} CouchGenericRows<T>
 * @property {number} total_rows
 * @property {number} offset
 * @property {Array<CouchGenericRow<T>>} rows
 */

export {}