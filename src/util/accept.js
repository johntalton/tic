import { parseAcceptStyleHeader } from './accept-util.js'

/**
 * @import { AcceptStyleItem } from './accept-util.js'
 */

/**
 * @typedef {Object} AcceptExtensionItem
 * @property {string} mimetype
 * @property {string} type
 * @property {string} subtype
 */

/**
 * @typedef {AcceptStyleItem & AcceptExtensionItem} AcceptItem
 */

export const SEPARATOR = { SUBTYPE: '/' }
export const ANY = '*'

export const WELL_KNOWN = new Map([
	[ '*/*', [ { name: '*/*', quality: 1 } ] ],
	[ 'application/json', [ { name: 'application/json', quality: 1 } ] ]
])

export class Accept {
	/**
	 * @param {string|undefined} acceptHeader
	 * @returns {Array<AcceptItem>}
	 */
	static parse(acceptHeader) {
		return parseAcceptStyleHeader(acceptHeader, WELL_KNOWN)
			.map(({ name, quality, parameters }) => {
				const [ type, subtype ] = name
					.split(SEPARATOR.SUBTYPE)
					.map(t => t.trim())

				return {
					mimetype: `${type}${SEPARATOR.SUBTYPE}${subtype ?? ANY}`,
					name, type, subtype,
					quality,
					parameters
				}
			})
			.sort((entryA, entryB) => {
				if(entryA.quality === entryB.quality) {
					// prefer things with less ANY
					const specificityA = (entryA.type === ANY ? 1 : 0) + (entryA.subtype === ANY ? 1 : 0)
					const specificityB = (entryB.type === ANY ? 1 : 0) + (entryB.subtype === ANY ? 1 : 0)
					return specificityA - specificityB
				}

				// B - A descending order
				const qualityB = entryB.quality ?? 0
				const qualityA = entryA.quality ?? 0
				return qualityB - qualityA
				// return entryB.quality - entryA.quality
			})
	}

	/**
	 * @param {string|undefined} acceptHeader
	 * @param {Array<string>} supportedTypes
	 */
	static select(acceptHeader, supportedTypes) {
		const accepts = Accept.parse(acceptHeader)
		return this.selectFrom(accepts, supportedTypes)
	}

	/**
	 * @param {Array<AcceptItem>} accepts
	 * @param {Array<string>} supportedTypes
	 */
	static selectFrom(accepts, supportedTypes) {
		const bests = accepts.map(accept => {
			const { type, subtype, quality } = accept
			const st = supportedTypes.filter(supportedType => {
				const [ stType, stSubtype ] = supportedType.split(SEPARATOR.SUBTYPE)
				return ((stType === type || type === ANY) && (stSubtype === subtype || subtype === ANY))
			})

			return {
				supportedTypes: st,
				quality
			}
		})
		.filter(best => {
			return best.supportedTypes.length > 0
		})

		if(bests.length === 0) { return undefined }
		const [ first ] = bests
		if(first === undefined) { return undefined }
		const [ firstSt ] = first.supportedTypes
		return firstSt
	}
}

// console.log(Accept.parse('text/html, application/xhtml+xml, application/xml;q=0.9, image/webp, text/*;q=.8, */*;q=0.7'))
// console.log(Accept.select('text/html, application/xhtml+xml, application/xml;q=0.9, image/webp, text/*;q=.8, */*;q=0.7', [ 'application/json', 'text/plain' ]))

// const tests = [
// 	undefined,
// 	'',
// 	'	',
// 	' fake',
// 	'    application/json',
// 	' application/xml,',
// 	' ,application/xml   ,,',
// 	' audio/*; q=0.2, audio/basic',
// 	' text/html, application/xhtml+xml, application/xml;q=0.9, image/webp, */*;q=0.8',
// 	' text/*;q=0.3, text/plain;q=0.7, text/plain;format=flowed,\ntext/plain;format=fixed;q=0.4, */*;q=0.5',

// 	' */*, foo/bar, foo/*, biz/bang, */*;q=.2, quix/quak;q=.1',
// 	'foo / bar ; q = .5'
// ]

// tests.forEach(test => {
// 	const result = Accept.parse(test)
// 	console.log('=============================')
// 	console.log({ test })
// 	console.log('---')
// 	console.log(result)
// })

