export const COUCH_STATUS_SERVER_ERROR = 500
export const COUCH_STATUS_NOT_FOUND = 404
export const COUCH_STATUS_NOT_MODIFIED = 304

export const COUCH_HEADER_REQUEST_ID = 'X-Couch-Request-ID'
export const COUCH_HEADER_BODY_TIME = 'X-CouchDB-Body-Time'

export const COUCH_HEADER_ETAG = 'ETag'

export class CouchUtil {
	/**
	 * @param {string} username
	 * @param {string} password
	 */
	static basicAuthHeader(username, password) {
		const encoder = new TextEncoder()
		const u8 = encoder.encode(`${username}:${password}`)
		const encodedCredentials = u8.toBase64()
		// const encodedCredentials = btoa(`${username}:${password}`)

		return {
			'Authorization': `Basic ${encodedCredentials}`
		}
	}

	/**
	 * @param {string|URL} url
	 * @param {RequestInit} options
	 */
	static async fetch(url, options) {
		const actualOptions = {
			...options,
			signal: options?.signal ?? AbortSignal.timeout(200)
		}

		return fetch(url, actualOptions)
			.catch(error => {
				if(error.cause?.code === 'ETIMEDOUT') { throw new Error(`Couch Timeout: ${error.message}`, { cause: error }) }
				if(error.cause?.code === 'UND_ERR_CONNECT_TIMEOUT') { throw new Error(`Couch Timeout (und): ${error.message}`, { cause: error }) }
				if(error.cause?.code === 'ECONNREFUSED') { throw new Error(`Couch Connection Refused: ${error.message}`, { cause: error }) }
				if(error.name === 'TimeoutError') { throw new Error(`Couch Timeout (signal): ${error.message}`, { cause: error }) }
				if(error.name === 'AbortError') { throw new Error(`Couch Abort (signal): ${error.message}`, { cause: error }) }

				throw new Error(`Couch Error: ${error.message}`, { cause: error })
			})
	}

	/**
	 * @template T
	 * @param {string|URL} url
	 * @param {RequestInit} options
	 * @return {Promise<T>}
	 */
	static async fetchJSON(url, options) {
		const response = await CouchUtil.fetch(url, options)

		if(!response.ok) {
			if(response.status === COUCH_STATUS_NOT_FOUND) {
				const json = await response.json()
				const reason = json.reason

				throw new Error(`Couch Not Found ${reason}`)
			}
			else if (response.status === COUCH_STATUS_SERVER_ERROR) {
				const json = await response.json()
				const reason = json.reason

				throw new Error(`Couch Internal Server Error ${reason}`)
			}

			const text = await response.text()
			throw new Error(`Couch Not Ok ${response.status} ${text}`)
		}

		return response.json()
	}
}

