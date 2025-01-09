
export const CONNECTING = 0
export const OPEN = 1
export const CLOSED = 2

export const DEFAULT_RECONNECT_INTERVAL_MS = 1000 * 3

export const CONTENT_TYPE_EVENT_STREAM = 'text/event-stream'

function eventSourceLineTransform() {
	return new TransformStream({
		start(controller) {

		},

		transform(chunk, controller) {
			// console.log(chunk)


		}
	})
}

export class EventSource extends EventTarget {
	#readyState = CONNECTING
	#url
	#withCredentials

	#controller

	#reconnectTimer
	#reconnectInterval = DEFAULT_RECONNECT_INTERVAL_MS

	#lastEventId

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

		fetch(this.#url, {
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
			.then(response => {
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

				if(response.body === null) {
					this.#failure(status, 'Invalid Body')
					this.close()
					return
				}

				const stream = response.body
					.pipeThrough(new TextDecoderStream())
					.pipeTo(eventSourceWritable())
			})
			.catch(error => {
				this.#controller = undefined

				// if closed no reconnect
				if(this.#readyState === CLOSED) { return }

				console.warn('fetch failure - schedule reconnect')
				this.#scheduleReconnect()
			})
	}

	#scheduleReconnect() {
		if(this.#readyState === CLOSED) { return }
		this.#readyState = CONNECTING

		console.warn('schedule reconnect')
		this.dispatchEvent(new Event('error'))
		this.#reconnectTimer = setTimeout(() => this.#reconnect(), this.#reconnectInterval)
	}

	#reconnect() {
		this.#reconnectTimer = undefined
		if (this.#readyState !== CONNECTING) { return }
		this.#connect()
	}

	#failure(status, message) {
		console.log('failure', status, message)
		if(this.#readyState !== CLOSED) { this.#readyState = CLOSED }
		this.dispatchEvent(new Event('error'))
	}
}
