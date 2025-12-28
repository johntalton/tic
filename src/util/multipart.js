import { parseContentDisposition } from './content-disposition.js'
import { parseContentType } from './content-type.js'

export const DISPOSITION_FORM_DATA = 'form-data'

export const BOUNDARY_MARK = '--'
export const SEPARATOR = '\r\n'

export const HEADER_SEPARATOR = ':'

export const EMPTY = ''

export const HEADER = {
	CONTENT_DISPOSITION: 'content-disposition',
	CONTENT_TYPE: 'content-type'
}

export const STATE = {
	BEGIN: 'begin',
	HEADERS: 'headers',
	VALUE: 'value',
	BEGIN_OR_END: 'beginOrEnd'
}

export class Multipart {
	/**
	 * @param {string} text
	 * @param {string} boundary
	 * @param {string} [charset='utf8']
	 */
	static parse(text, boundary, charset = 'utf8') {
		// console.log({ boundary, text })
		const formData = new FormData()

		if(text === '') {
			// empty body
			return formData
		}

		const lines = text.split(SEPARATOR)

		if(lines.length === 0) {
			// missing body?
			return formData
		}

		const boundaryBegin = `${BOUNDARY_MARK}${boundary}`
		const boundaryEnd = `${BOUNDARY_MARK}${boundary}${BOUNDARY_MARK}`

		let partName = undefined
		let state = STATE.BEGIN

		for(const line of lines) {
			// console.log('line', line)

			if(state === STATE.BEGIN) {
				// expect boundary
				if(line === boundaryEnd) {
					// empty set
					break
				}

				if(line !== boundaryBegin) {
					throw new Error('missing beginning boundary')
				}
				state = STATE.HEADERS
			}
			else if(state === STATE.HEADERS) {
				if(line === EMPTY) { state = STATE.VALUE }
				else {
					const [ rawName, value ] = line.split(HEADER_SEPARATOR)
					const name = rawName.toLowerCase()
					// console.log('header', name, value)
					if(name === HEADER.CONTENT_TYPE) {
						const contentType = parseContentType(value)
						// console.log({ contentType })
					}
					else if(name === HEADER.CONTENT_DISPOSITION) {
						const disposition = parseContentDisposition(value)
						if(disposition?.disposition !== DISPOSITION_FORM_DATA) {
							throw new Error('disposition not form-data')
						}

						// todo: are names always quoted?
						partName = disposition.name?.slice(1, -1)
					}
					else {
						// unsupported part header - ignore
						console.log('unsupported part header', name)
					}
				}
			}
			else if(state === STATE.VALUE) {
				// console.log('value', line)
				if(partName === undefined) { throw new Error('unnamed part') }

				formData.append(partName, line)
				partName = undefined

				state = STATE.BEGIN_OR_END
			}
			else if(state === STATE.BEGIN_OR_END) {
				if(line === boundaryEnd) { break }
				if(line !== boundaryBegin) {
					throw new Error('missing boundary or end')
				}
				state = STATE.HEADERS
			}
			else {
				throw new Error('unknown state')
			}

		}

		return formData
	}
}



// const test = '--X-INSOMNIA-BOUNDARY\r\n' +
//     'Content-Disposition: form-data; name="u"\r\n' +
//     '\r\n' +
//     'alice\r\n' +
//     '--X-INSOMNIA-BOUNDARY\r\n' +
//     'Content-Disposition: form-data; name="user"\r\n' +
//     '\r\n' +
//     'jeff\r\n' +
//     '--X-INSOMNIA-BOUNDARY--\r\n'
// const result = Multipart.parse(test, 'X-INSOMNIA-BOUNDARY')
// console.log(result)


// const test = [
// 	'-----------------------------paZqsnEHRufoShdX6fh0lUhXBP4k',
//  'Content-Disposition: form-data; '
//    + 'name="upload_file_0"; filename="テスト.dat"',
//  'Content-Type: application/octet-stream',
//  '',
//  'A'.repeat(1023),
//  '-----------------------------paZqsnEHRufoShdX6fh0lUhXBP4k--'
// ].join('\r\n')
// const result = Multipart.parse(test, '---------------------------paZqsnEHRufoShdX6fh0lUhXBP4k')
// console.log(result)


// const test = '--X-INSOMNIA-BOUNDARY--\r\n'
// const result = Multipart.parse(test, 'X-INSOMNIA-BOUNDARY')
// console.log(result)