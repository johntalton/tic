import { parseAcceptStyleHeader } from './accept-util.js'

export const WELL_KNOWN = new Map([
	[ 'en-US,en;q=0.5', [ { name: 'en-US', quality: 1 }, { name: 'en', quality: 0.5 } ] ],
	[ 'en-US,en;q=0.9', [ { name: 'en-US', quality: 1 }, { name: 'en', quality: 0.9 } ] ]
])

export class AcceptLanguage {
	static parse(acceptLanguageHeader) {
			return parseAcceptStyleHeader(acceptLanguageHeader, WELL_KNOWN)
		}

		static select(acceptLanguageHeader, supportedTypes) {
			const accepts = AcceptLanguage.parse(acceptLanguageHeader)
			return this.selectFrom(accepts, supportedTypes)
		}

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