import { parseContentDisposition } from './content-disposition.js'
import { parseContentType } from './content-type.js'

const DISPOSITION_FORM_DATA = 'form-data'

const BOUNDARY_MARK = '--'
const SEPARATOR = '\r\n'

const HEADER_SEPARATOR = ':'

const STATE = {
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

		const boundaryBegin = `${BOUNDARY_MARK}${boundary}`
		const boundaryEnd = `${BOUNDARY_MARK}${boundary}${BOUNDARY_MARK}`

		const lines = text.split(SEPARATOR)

		let partName = undefined
		let state = STATE.BEGIN

		for(const line of lines) {
			// console.log('line', line)

			if(state === STATE.BEGIN) {
				// expect boundary
				if(line !== boundaryBegin) {
					throw new Error('missing beginning boundary')
				}
				state = STATE.HEADERS
			}
			else if(state === STATE.HEADERS) {
				if(line === '') { state = STATE.VALUE }
				else {
					const [ name, value ] = line.split(HEADER_SEPARATOR)
					// console.log('header', name, value)
					if(name.toLowerCase() === 'content-type') {
						const contentType = parseContentType(value)
						console.log({ contentType })
					}
					else if(name.toLowerCase() === 'content-disposition') {
						const disposition = parseContentDisposition(value)
						if(disposition.disposition !== DISPOSITION_FORM_DATA) {
							throw new Error('disposition not form-data')
						}

						partName = disposition.name?.slice(1, -1)
					}
					else { throw new Error('unsupported part header') }
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
