/**
 * @typedef {Object} Disposition
 * @property {string} disposition
 * @property {Map<string, string>} parameters
 * @property {string} [name]
 * @property {string} [filename]
 */

const SEPARATOR = {
	PARAMETER: ';',
	KVP: '='
}

const NAME = 'name'
const FILENAME = 'filename'

/**
 * @param {string} contentDispositionHeader
 * @returns {Disposition}
 */
export function parseContentDisposition(contentDispositionHeader) {
	if(contentDispositionHeader === undefined) { return {} }

	const [ disposition, ...parameterSet ] = contentDispositionHeader.trim().split(SEPARATOR.PARAMETER).map(entry => entry.trim())
	const parameters = new Map(parameterSet.map(parameter => parameter.split(SEPARATOR.KVP).map(p => p.trim())))

	const name = parameters.get(NAME)
	const filename = parameters.get(FILENAME)

	return {
		disposition,
		parameters,
		name, filename
	}
}

// console.log(parseContentDisposition())
// // console.log(parseContentDisposition(null))
// console.log(parseContentDisposition(''))
// console.log(parseContentDisposition('form-data'))
// console.log(parseContentDisposition('    form-data ; name'))
// console.log(parseContentDisposition('form-data; name="key"'))

// console.log(parseContentDisposition('inline'))
// console.log(parseContentDisposition('attachment'))
// console.log(parseContentDisposition('attachment; filename="file name.jpg"'))
// console.log(parseContentDisposition('attachment; filename*=UTF-8\'\'file%20name.jpg'))
// console.log(parseContentDisposition('attachment; filename*=UTF-8\'\'file%20name.jpg'))
// console.log(parseContentDisposition('form-data;title*=us-ascii\'en-us\'This%20is%20%2A%2A%2Afun%2A%2A%2A'))