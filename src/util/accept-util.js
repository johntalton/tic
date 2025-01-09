export const QUALITY = 'q'
export const SEPARATOR = {
	MEDIA_RANGE: ',',
	// SUBTYPE: '/',
	PARAMETER: ';',
	KVP: '='
}
// export const ANY = '*'
export const DEFAULT_QUALITY_STRING = '1'

export function parseAcceptMimeStyleHeader(header) {
	return parseAcceptStyleHeader(header)
}

export function parseAcceptStyleHeader(header) {
	if(header === undefined) { return [] }

	return header
		.trim()
			.split(SEPARATOR.MEDIA_RANGE)
			.map(mediaRange => {
				const [ name, ...parametersSet ] = mediaRange
					.trim()
					.split(SEPARATOR.PARAMETER)

				// const [ type, subtype ] = mimetypeRaw
				// 	.split(SEPARATOR.SUBTYPE)
				// 	.map(t => t.trim())

				const parameters = new Map(parametersSet.map(parameter => parameter.split(SEPARATOR.KVP).map(p => p.trim())))

				if(!parameters.has(QUALITY)) { parameters.set(QUALITY, DEFAULT_QUALITY_STRING) }
				const quality = parseFloat(parameters.get(QUALITY))

				return {
					// mimetype: `${type}${SEPARATOR.SUBTYPE}${subtype}`,
					// mimetypeRaw, type, subtype,
					name,
					quality,
					parameters
				}
			})
			.filter(entry => entry.name !== undefined && entry.name !== '')
			.sort((entryA, entryB) => {
				// if(entryA.quality === entryB.quality) {
				// 	// prefer things with less ANY
				// 	const specificityA = (entryA.type === ANY ? 1 : 0) + (entryA.subtype === ANY ? 1 : 0)
				// 	const specificityB = (entryB.type === ANY ? 1 : 0) + (entryB.subtype === ANY ? 1 : 0)
				// 	return specificityA - specificityB
				// }

				// B - A descending order
				return entryB.quality - entryA.quality
			})
}