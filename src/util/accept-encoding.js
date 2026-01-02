import { parseAcceptStyleHeader } from './accept-util.js'

/** @import { AcceptStyleItem } from './accept-util.js' */

export const WELL_KNOWN = new Map([
	[ 'gzip, deflate, br, zstd', [ { name: 'gzip' }, { name: 'deflate' }, { name: 'br' }, { name: 'zstd' } ] ],
	[ 'gzip, deflate, br', [ { name: 'gzip' }, { name: 'deflate' }, { name: 'br' } ] ]
])

export class AcceptEncoding {
	/**
	 * @param {string|undefined} acceptEncodingHeader
	 */
	static parse(acceptEncodingHeader) {
		return parseAcceptStyleHeader(acceptEncodingHeader, WELL_KNOWN)
	}

	/**
	 * @param {string|undefined} acceptEncodingHeader
	 * @param {Array<string>} supportedTypes
	 */
	static select(acceptEncodingHeader, supportedTypes) {
		const accepts = AcceptEncoding.parse(acceptEncodingHeader)
		return this.selectFrom(accepts, supportedTypes)
	}

	/**
	 * @param {Array<AcceptStyleItem>} acceptEncodings
	 * @param {Array<string>} supportedTypes
	 */
	static selectFrom(acceptEncodings, supportedTypes) {
		for(const acceptEncoding of acceptEncodings) {
			const { name } = acceptEncoding
			if(supportedTypes.includes(name)) {
				return name
			 }
		}

		return undefined
	}
}


// console.log(AcceptEncoding.parse(''))
// console.log(AcceptEncoding.parse(' '))
// console.log(AcceptEncoding.parse('zstd'))
// console.log(AcceptEncoding.parse('identity'))
// console.log(AcceptEncoding.parse('*'))
// console.log(AcceptEncoding.parse('gzip, deflate, br, zstd'))
// console.log(AcceptEncoding.parse('br;q=1.0, gzip;q=0.8, *;q=0.1'))
// console.log(AcceptEncoding.parse('deflate, gzip;q=1.0, *;q=0.5'))
// console.log(AcceptEncoding.parse('identity;q=0'))
// console.log(AcceptEncoding.parse('*;q=0'))