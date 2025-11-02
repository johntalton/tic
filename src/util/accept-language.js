import { parseAcceptStyleHeader } from './accept-util.js'

/**
 * @import { AcceptStyleItem } from './accept-util.js'
 */

export const WELL_KNOWN = new Map([
	[ 'en-US,en;q=0.5', [ { name: 'en-US', quality: 1 }, { name: 'en', quality: 0.5 } ] ],
	[ 'en-US,en;q=0.9', [ { name: 'en-US', quality: 1 }, { name: 'en', quality: 0.9 } ] ]
])

export class AcceptLanguage {
	/**
	 * @param {string|undefined} acceptLanguageHeader
	 */
	static parse(acceptLanguageHeader) {
		return parseAcceptStyleHeader(acceptLanguageHeader, WELL_KNOWN)
	}

	/**
	 * @param {string|undefined} acceptLanguageHeader
	 * @param {Array<string>} supportedTypes
	 */
	static select(acceptLanguageHeader, supportedTypes) {
		const accepts = AcceptLanguage.parse(acceptLanguageHeader)
		return this.selectFrom(accepts, supportedTypes)
	}

	/**
	 * @param {Array<AcceptStyleItem>} acceptLanguages
	 * @param {Array<string>} supportedTypes
	 */
	static selectFrom(acceptLanguages, supportedTypes) {
		for(const acceptLanguage of acceptLanguages) {
			const { name } = acceptLanguage
			if(supportedTypes.includes(name)) {
				return name
				}
		}

		return undefined
	}
}

// console.log(AcceptLanguage.parse('en-US,en;q=0.9'))
// console.log(AcceptLanguage.select('foo;q=0.2, bar-BZ', [ 'bang', 'foo' ]))