export const CONNECTING = 0
export const OPEN = 1
export const CLOSED = 2

export const DEFAULT_RECONNECT_INTERVAL_MS = 1000 * 10

class DataEvent extends Event {
	data

	constructor(data) {
		super('data')
		this.data = data
	}
}

export class CouchContinuous extends EventTarget {
	#url
	#readyState

	#options

	#controller
	#reconnectTimer
	#reconnectInterval = DEFAULT_RECONNECT_INTERVAL_MS

	constructor(url, options) {
		super()

		this.#url = new URL(url)
		this.#options = options ?? {}

		this.#connect()
	}

	get readyState() { return this.#readyState }
	get url() { return this.#url }

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

		fetch(this.#url, {
			method: 'GET',
			headers: {
				...this.#options?.headers,
				'Accept': 'application/json',
				// 'Cookie': 'AuthSession=dGljOjY3N0EzMDU0OjmVtyDDQdnO0gIgymANqGGX657NNKmcGFX0GB8UO7FZ; Version=1; Expires=Sun, 05-Jan-2025 08:50:12 GMT; Max-Age=6000; Path=/; HttpOnly'
			},
			signal: this.#controller.signal
		})
			.then(async response => {
				const { status, headers } = response

				if(!response.ok) {
					const text = await response.text()
					this.#failure(status, `Connect Fetch Not Ok (${status}) (${text})`)
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

				// Promise.resolve()
				// 	.then(async () => {
						for await(const chunk of stream) {
							const lines = chunk.split('\n')
							lines.forEach(line => {
								if(line.length === 0) {
									// heartbeat
									return
								}

								const data = JSON.parse(line)
								const event = new DataEvent(data)
								this.dispatchEvent(event)

							})
						}
					// })
					// .catch(error => {
					// 	console.log('couch continuous stream processing error', error)
					// })

			})
			.catch(error => {
				// console.log('couch continuous fetch error - reconnect', error)
				this.#controller = undefined
				if(this.#readyState === CLOSED) { return }

				this.#scheduleReconnect()
			})
	}

	#scheduleReconnect() {
		if(this.#readyState === CLOSED) { return }
		this.#readyState = CONNECTING

		this.dispatchEvent(new Event('error'))
		this.#reconnectTimer = setTimeout(() => this.#reconnect(), this.#reconnectInterval)
	}

	#reconnect() {
		this.#reconnectTimer = undefined
		if (this.#readyState !== CONNECTING) { return }
		this.#connect()
	}

	#failure(status, message) {
		// console.log('couch continuous', status, message)
		if(this.#readyState !== CLOSED) { this.#readyState = CLOSED }
		this.dispatchEvent(new Event('error'))
	}
}
