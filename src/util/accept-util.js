export const QUALITY = 'q'
export const SEPARATOR = {
	MEDIA_RANGE: ',',
	PARAMETER: ';',
	KVP: '='
}

export const DEFAULT_QUALITY_STRING = '1'

/**
 * @typedef {Object} AcceptStyleItem
 * @property {string} name
 * @property {number|undefined} [quality]
 * @property {Map<string, string>|undefined} [parameters]
 */

/**
 * @param {string|undefined} header
 * @param {Map<string, Array<AcceptStyleItem>>} [wellKnown]
 * @returns {Array<AcceptStyleItem>}
 */
export function parseAcceptStyleHeader(header, wellKnown) {
	if(header === undefined) { return [] }

	const wk = wellKnown?.get(header)
	if(wk !== undefined) { return wk }

	return header
		.trim()
			.split(SEPARATOR.MEDIA_RANGE)
			.map(mediaRange => {
				const [ name, ...parametersSet ] = mediaRange
					.trim()
					.split(SEPARATOR.PARAMETER)

				const parameters = new Map(parametersSet.map(parameter => {
					const [ key, value ] = parameter.split(SEPARATOR.KVP).map(p => p.trim())
					return [ key, value ]
				}))

				if(!parameters.has(QUALITY)) { parameters.set(QUALITY, DEFAULT_QUALITY_STRING) }
				const quality = parseFloat(parameters.get(QUALITY) ?? DEFAULT_QUALITY_STRING)

				return {
					name,
					quality,
					parameters
				}
			})
			.filter(entry => entry.name !== undefined && entry.name !== '')
			.sort((entryA, entryB) => {
				// B - A descending order
				return entryB.quality - entryA.quality
			})
}