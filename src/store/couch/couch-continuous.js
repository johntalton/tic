
/**
 * @typedef {Object} CouchContinuousOptions
 * @property {number} [reconnectIntervalMS]
 * @property {Record<string, string> | [string,string][]} headers
 */

export const CONNECTING = 0
export const OPEN = 1
export const CLOSED = 2

export const DEFAULT_RECONNECT_INTERVAL_MS = 1000 * 10

export class DataEvent extends Event {
	data

	/**
	 * @param {any} data
	 */
	constructor(data) {
		super('data')
		this.data = data
	}
}

export class CouchContinuous extends EventTarget {
	#url

	/** @type {number} */
	#readyState = CONNECTING

	#options

	/** @type {AbortController|undefined} */
	#controller = undefined

	/** @type {NodeJS.Timeout|undefined} */
	#reconnectTimer
	#reconnectInterval

	/**
	 * @param {URL|string} url
	 * @param {CouchContinuousOptions} options
	 */
	constructor(url, options) {
		super()

		this.#url = new URL(url)
		this.#options = options ?? {}

		this.#reconnectInterval = options?.reconnectIntervalMS ?? DEFAULT_RECONNECT_INTERVAL_MS

		this.#connect()
	}

	get readyState() { return this.#readyState }
	get url() { return this.#url }

	get reconnectIntervalMS() { return this.#reconnectInterval }
	set reconnectIntervalMS(ms) { this.#reconnectInterval = ms }

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

				const contentType = headers.get('content-type')
				if(contentType !== 'application/json') {
					this.#failure(status, 'Unknown Content Type: ' + contentType)
					this.close()
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

				const options = this.#controller === undefined ? {} : { signal: this.#controller.signal }

				const stream = response.body
					.pipeThrough(new TextDecoderStream(), options)

				for await (const chunk of stream) {
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
			})
			.catch(_error => {
				console.log('couch continuous fetch error - reconnect', _error)
				if(_error.cause?.code === 'ECONNRESET') {
					console.log('couch continuous connection reset')
				}

				this.#controller = undefined
				if(this.#readyState === CLOSED) { return }

				this.#scheduleReconnect()
			})
	}

	#scheduleReconnect() {
		if(this.#readyState === CLOSED) { return }
		this.#readyState = CONNECTING

		this.dispatchEvent(new Event('error'))
		this.#reconnectTimer = setTimeout(() => this.#reconnect(), this.reconnectIntervalMS)
	}

	#reconnect() {
		this.#reconnectTimer = undefined
		if (this.#readyState !== CONNECTING) { return }
		this.#connect()
	}

	/**
	 * @param {number} _status
	 * @param {string} _message
	 */
	#failure(_status, _message) {
		// console.log('couch continuous', status, message)
		if(this.#readyState !== CLOSED) { this.#readyState = CLOSED }
		this.dispatchEvent(new Event('error'))
	}
}
