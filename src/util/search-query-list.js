/**
 * @typedef {Object} SearchQueryListOptions
 * @property {string|undefined} [plural]
 * @property {string|undefined} [singular]
 * @property {string|undefined} [short]
 * @property {string} [separator = '|']
 */

export const DEFAULT_SEPARATOR = '|'
export const EMPTY_STRING = ''

export class SearchQueryList {
	/**
	 * @param {URLSearchParams} query
	 * @param {SearchQueryListOptions} options
	 */
	static get(query, options) {
		const plural = options.plural
		const singular = options.singular
		const short = options.short
		const separator = options.separator ?? DEFAULT_SEPARATOR

		const pluralString = plural ? query.get(plural) ?? EMPTY_STRING : EMPTY_STRING
		const pluralList = pluralString.split(separator).map(x => x.trim()).filter(x => x !== EMPTY_STRING)

		const singularList = singular ? query.getAll(singular) : []
		const shortList = short ? query.getAll(short) : []

		return [ ...new Set([
			...pluralList,
			...singularList,
			...shortList
		])]
	}
}

// const q = new URLSearchParams('?foos=bar|biz&f=bar&foo=foo')
// const list = SearchQueryList.get(q, { plural: 'foos', singular: 'foo', short: 'f' })
// console.log(list)