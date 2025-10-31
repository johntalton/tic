import { CHARSET_UTF8 } from './content-type.js'

export const DEFAULT_BYTE_LIMIT = 1024 * 1024 //

/**
 * @import { Readable } from 'node:stream'
 */

/**
 * @typedef {Object} BodyOptions
 * @property {AbortSignal} signal
 * @property {number} byteLimit
 * @property {number} contentLength
 * @property {string} charset
 */

/**
 * @param {Readable} stream
 * @param {BodyOptions} [options]
 */
export function requestBody(stream, options) {
	const signal = options?.signal
	const byteLimit = options?.byteLimit ?? DEFAULT_BYTE_LIMIT
	const contentLength = options?.contentLength
	const charset = options?.charset ?? CHARSET_UTF8

	// if(contentLength > byteLimit) {
	// 	console.log(contentLength)
	// 	throw new Error('contentLength exceeds limit')
	// }

	const stats = {
		byteLength: 0,
		closed: false,
		duration: 0
	}

	// console.log('create body reader, underlying source')

	/** @type {UnderlyingDefaultSource} */
	const underlyingSource = {
		start(controller) {
			// console.log('body reader start')
			const listener = () => {
				controller.error(new Error('Abort Signal Timed out'))
			}

			signal?.addEventListener('abort', listener, { once: true })

			stream.on('data', chunk => {
				if(signal?.aborted) {
					console.log('body reader aborted')
					controller.error(new Error('Chunk read Abort Signal Timed out'))
					stats.closed = true
					return
				}

				if(stats.closed) {
					console.log('late chunk already closed')
					stats.closed = true
					return
				}

				// chunk is a node Buffer (which is a TypedArray)
				if(!ArrayBuffer.isView(chunk)) {
					controller.error('invalid chunk type')
					stats.closed = true
				}

				stats.byteLength += chunk.byteLength

				if(stats.byteLength > byteLimit) {
					console.log('body exceed byte limit', stats.byteLength)
					controller.error(new Error('body exceed byte limit'))
					// stream.close()
					stats.closed = true
					return
				}

				// console.log('body reader chunk', stats.byteLength)
				controller.enqueue(chunk)
			})

			stream.on('end', () => {
				// console.log('body reader end')
				signal?.removeEventListener('abort', listener)

				if(!stats.closed) {
					// console.log('body reader close on end')
					stats.closed = true
					controller.close()
				}
			})

			// stream.on('close', () => console.log('body reader stream close'))
			// stream.on('aborted', () => console.log('body reader stream aborted'))
		},

		cancel(reason) {
			console.log('body reader canceled', reason)
		}
	}

	/**
	 * @returns {ReadableStream}
	 */
	function makeReader() {
		// console.log('makeReader')
		return new ReadableStream(underlyingSource)
	}

	/**
	 * @template T
	 * @param {(reader: ReadableStream) => T} futureFn
	 * @returns {Promise<T>}
	 */
	async function wrap(futureFn) {
		const start = performance.now()
		const reader = makeReader()
		// console.log(reader)
		const result = await futureFn(reader)
		// console.log(result)
		const end = performance.now()
		const duration = end - start
		stats.duration = duration
		return result
	}

	return {
		get duration() { return stats.duration },
		get body() { return makeReader() },

		blob: (mimetype) => wrap(reader => bodyBlob(reader, mimetype)),
		arrayBuffer: () => wrap(reader => bodyArrayBuffer(reader)),
		bytes: () => wrap(reader => bodyUint8Array(reader)),
		text: () => wrap(reader => bodyText(reader, charset)),
		formData: undefined,
		json: () => wrap(reader => bodyJSON(reader, charset))
	}
}

/**
 * @param {ReadableStream} reader
 * @param {string} [mimetype]
 */
async function bodyBlob(reader, mimetype) {
	const parts = []
	for await (const part of reader) {
		// console.log('push part', part.length)
		parts.push(part)
	}

	// console.log('Blob')
	return new Blob(parts, { type: mimetype ?? '' })
}

/**
 * @param {ReadableStream} reader
 */
async function bodyArrayBuffer(reader) {
	const blob = await bodyBlob(reader)
	return blob.arrayBuffer()

	// const u8 = await bodyUint8Array(reader)
	// return u8.buffer
}

/**
 * @param {ReadableStream} reader
 */
async function bodyUint8Array(reader) {
	const buffer = await bodyArrayBuffer(reader)
	return new Uint8Array(buffer)

	// let total = 0
	// const parts = []
	// for await (const part of reader) {
	// 	total += part.byteLength
	// 	parts.push(part)
	// }

	// const buffer = new Uint8Array(total)
	// let offset = 0
	// for (const part of parts) {
	// 	buffer.set(part, offset)
	// 	offset += part.byteLength
	// }

	// return buffer
}

/**
 * @param {ReadableStream} reader
 * @param {string} [charset]
 */
async function bodyText(reader, charset) {
	// const blob = await bodyBlob(reader)
	// return blob.text()

	const u8 = await bodyUint8Array(reader)
	const decoder = new TextDecoder(charset ?? CHARSET_UTF8, { fatal: true })
	return decoder.decode(u8)
}

/**
 * @param {ReadableStream} reader
 * @param {string} [charset]
 */
async function bodyJSON(reader, charset) {
	// console.log('bodyJSON')
	const text = await bodyText(reader, charset)
	return (text === '') ? {} : JSON.parse(text)
}