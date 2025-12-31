import { SSE_BOM, ENDING, SSE_MIME } from '@johntalton/sse-util'
import { Fetch2 } from '../agent/fetch2.js'

export const CONNECTING = 0
export const OPEN = 1
export const CLOSED = 2

export const DEFAULT_RECONNECT_INTERVAL_MS = 1000 * 3

export const CONTENT_TYPE_EVENT_STREAM = 'text/event-stream'

function eventSourceTransform() {
	const SPACE = ' '
	const COLON = ':'
	const EMPTY = ''
	const DATA_JOIN = '\n'
	const NULL_BYTE = '\x00'

	const FIELD = {
		EVENT: 'event',
		DATA: 'data',
		ID: 'id',
		RETRY: 'retry'
	}

	const BASE_10 = 10

	let accumulator = ''
	let ignoreNextLF = false
	let firstLine = false
	let nextEvent = undefined

	const parseField = (field, value) => {
		// If the field name is "event"
		if(field === FIELD.EVENT) {
			nextEvent.type = value
		}
		// If the field name is "data"
		else if(field === FIELD.DATA) {
			if(nextEvent.data === undefined) {
				nextEvent.data = value
			}
			else { nextEvent.data += DATA_JOIN + value }
		}
		// If the field name is "id"
		else if(field === FIELD.ID && value !== NULL_BYTE && value !== EMPTY) {
			nextEvent.id = value
		}
		// If the field name is "retry"
		else if(field === FIELD.RETRY) {
			const valid = [ ...value ].map(v => !isNaN(v)).reduce((acc, v) => acc && v, true)
			const num = parseInt(value, BASE_10)
			if(valid && Number.isInteger(num)) {
				// console.log('retry', num)
				return { retry: num }
			}
		}

		return { }
	}

	const parseLine = line => {
		if(nextEvent === undefined && line === EMPTY) { return {} }

		// If the line is empty (a blank line)
		// Dispatch the event
		if(line === EMPTY) {
			const event = nextEvent
			nextEvent = undefined
			if(Object.keys(event).length <= 0) { return { } }
			return { event }
		}

		if(nextEvent === undefined) { nextEvent = {} }

		// If the line starts with a U+003A COLON character (:)
		const colon = line.indexOf(COLON)
		if(colon === 0) {
			const comment = line.substring(1)
			nextEvent = undefined
			return { comment }
		}
		// If the line contains a U+003A COLON character (:)
		// Process the field
		else if(colon > 0) {
			const space = line[colon + 1] === SPACE
			const field = line.substring(0, colon)
			const value = line.substring(colon + 1 + (space ? 1 : 0))

			return parseField(field, value)
		}

		// Otherwise, the string is not empty but does not contain a U+003A COLON character (:)
		// Process the field
		return parseField(line, EMPTY)
	}

	return new TransformStream({
		start(controller) {

		},

		transform(chunk, controller) {
			accumulator += chunk

			var cr, lf
			do {
				if(!firstLine) { accumulator = accumulator.substring(SSE_BOM.length - 1) }

				cr = accumulator.indexOf(ENDING.CR)
				lf = accumulator.indexOf(ENDING.LF)

				if(cr >= 0 && !(lf >= 0 && cr > lf)) {
					const line = accumulator.substring(0, cr)
					accumulator = accumulator.substring(cr + 1)
					ignoreNextLF = true
					firstLine = true

					// console.log({ accumulator, line })
					const result = parseLine(line)
					if(Object.keys(result).length > 0) { controller.enqueue(result) }
				}
				else if(lf >= 0 && !ignoreNextLF) {
					const line = accumulator.substring(0, lf)
					accumulator = accumulator.substring(lf + 1)
					firstLine = true

					// console.log({ accumulator, line })
					const result = parseLine(line)
					if(Object.keys(result).length > 0) { controller.enqueue(result) }
				}
				else if(lf === 0 && ignoreNextLF) {
					accumulator = accumulator.substring(1)
					ignoreNextLF = false
					firstLine = true
				}
				else { ignoreNextLF = false }

			} while((cr >= 0 || lf >= 0) && accumulator.length > 0)
		},

		flush(controller) {
			// console.log('EventSourceTransform: flush')
		}
	})
}

// const CHUNKS = [
// 	'\xEF', '\xBB\xBF:👩🏻‍❤️‍💋‍👩🏼\r\n\r',
// 	'\ndata: A\r\n',
// 	'retry: 1000\n',
// 	'data: B\r',
// 	'id: 1\r',
// 	 '\n',
// 	'data: 🥳\r',
// 	'\r',
// 	'data:D\ndata:    E\n\r\n',
// 	'id:3\r\n',
// 	'da', 'ta:F\n\n\n\n\nevent: 事件\n',
// 	'data: यह टेस्ट है\n\n',
// 	':تعليق',
// 	'\r',
// 	'id:5\rretry:1.3\rdata: ' + JSON.stringify({ foo: 'bar' }) + '\r\n\r',
// 	'this_is_just_a_long_field_name\n\r',
// 	'data\n\nid\n\n'
// ]
// const readable = ReadableStream.from(CHUNKS)
// const transform = eventSourceTransform()
// const s = readable.pipeThrough(transform)
// for await(const { event, comment, retry } of s) {
// 	if(event) { console.log({ type: 'message', ...event }) }
// }

/**
 * @typedef {Object} EventSourceOptions
 * @property {boolean} [withCredentials = false]
 */

export class EventSource extends EventTarget {
	#readyState = CONNECTING
	#url
	#withCredentials

	/** @type {AbortController|undefined} */
	#controller

	/** @type {NodeJS.Timeout|undefined} */
	#reconnectTimer
	#reconnectInterval = DEFAULT_RECONNECT_INTERVAL_MS

	/** @type {string|undefined} */
	#lastEventId

	/**
	 * @param {string|URL} url
	 * @param {EventSourceOptions} [options]
	 */
	constructor(url, options) {
		super()

		this.#url = new URL(url)
		this.#withCredentials = options?.withCredentials ?? false

		this.#connect()
	}

	get readyState() { return this.#readyState }
	get url() { return this.#url }
	get withCredentials() { return this.#withCredentials }

	close() {
		if(this.#reconnectTimer) { clearTimeout(this.#reconnectTimer) }
		if(this.#readyState === CLOSED) { return }
		if(this.#controller) {
			this.#controller.abort()
			this.#controller = undefined
		}
		this.#readyState = CLOSED
	}

	#connect() {
		this.#readyState = CONNECTING
		this.#controller = new AbortController()

		const lastEventHeader = this.#lastEventId !== undefined ? {
			'Last-Event-ID': this.#lastEventId
		} : undefined

		Fetch2.fetch(this.#url, {
			method: 'GET',
			mode: 'cors',
			cache: 'no-store',
			credentials: this.withCredentials ? 'include' : 'same-origin',
			headers: {
				 ...lastEventHeader,
				'Accept': CONTENT_TYPE_EVENT_STREAM,
				// 'Authorization': `Basic ${btoa('user:password')}`,
				// 'Cookie': ''
			},
			signal: this.#controller.signal
		})
			.then(async response => {
				const { status, headers } = response

				if(status === 204) {
					this.#failure(status, 'No Content')
					this.close()
					return
				}

				if(!response.ok) {
					this.#failure(status, 'Not Ok')
					return
				}

				const contentType = headers.get('content-type') ?? ''
				if(!contentType.startsWith(CONTENT_TYPE_EVENT_STREAM)) {
					this.#failure(status, 'Invalid Content-Type')
					return
				}

				if(this.#readyState === CLOSED) {
					return
				}

				this.#readyState = OPEN

				this.dispatchEvent(new Event('open'))

				// cache copy of body readable as it creates unique reader each time
				const bodyReader = response.body
				if(bodyReader === null) {
					this.#failure(status, 'Invalid Body')
					this.close()
					return
				}

				// console.log(response)
				const stream = bodyReader
					.pipeThrough(new TextDecoderStream())
					.pipeThrough(eventSourceTransform())
					// .pipeTo(eventSourceWritable())

				for await (const { event, retry, comment } of stream) {
					// if(comment !== undefined) { console.log('event source comment', comment) }

					if(retry !== undefined) {
						console.log('setting retry time', retry)
						this.#reconnectInterval = retry
					}

					if(event !== undefined) {
						const type = event.type ?? 'message'
						const messageEvent = new MessageEvent(type, {
							data: event.data,
							lastEventId: event.id,
							origin: this.#url.origin
						})
						this.dispatchEvent(messageEvent)
					}
				}

				// console.log('after stream events')
				this.#controller = undefined

				// if closed no reconnect
				if(this.#readyState === CLOSED) { return }

				this.#scheduleReconnect()
			})
			.catch(error => {
				// console.log('fetch processing error', error.message, this.#readyState)
				this.#controller = undefined

				// if closed no reconnect
				if(this.#readyState === CLOSED) { return }

				// console.warn('fetch failure - schedule reconnect', error.message)
				this.#scheduleReconnect()
			})
	}

	#scheduleReconnect() {
		if(this.#readyState === CLOSED) { return }
		this.#readyState = CONNECTING

		// console.warn('schedule reconnect')
		this.dispatchEvent(new Event('error'))
		this.#reconnectTimer = setTimeout(() => this.#reconnect(), this.#reconnectInterval)
	}

	#reconnect() {
		this.#reconnectTimer = undefined
		if (this.#readyState !== CONNECTING) { return }
		this.#connect()
	}

	/**
	 * @param {number} status
	 * @param {string} message
	 */
	#failure(status, message) {
		console.log('event source failure', status, message)
		if(this.#readyState !== CLOSED) { this.#readyState = CLOSED }
		this.dispatchEvent(new Event('error'))
	}
}
