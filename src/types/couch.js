/**
 * @template T
 * @typedef {Object} CouchGenericRow<T>
 * @property {string} id
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