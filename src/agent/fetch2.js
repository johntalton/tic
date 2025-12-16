
// process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0'

// import { GameAPI } from '../game-api.js'

// deno run --allow-net --unsafely-ignore-certificate-errors=tic.next.local public/agent/agent.js
// node --permission --allow-fs-read=. --experimental-eventsource  public/agent/agent.js

// const globalDispatcher = Symbol.for('undici.globalDispatcher.1')
// console.log(globalThis[globalDispatcher])
// console.log(global[globalDispatcher])
// globalThis[globalDispatcher] = new globalThis[globalDispatcher].constructor({
// 	allowH2: true,
// });

// setGlobalDispatcher(new Agent({
//   allowH2: true
// }));

import http2 from 'node:http2'
import { requestBody } from '../util/body.js'


const {
  HTTP2_HEADER_PATH,
  HTTP2_HEADER_STATUS,
	HTTP2_HEADER_METHOD,
	HTTP2_HEADER_AUTHORIZATION
} = http2.constants

const {
	HTTP2_METHOD_GET,
	HTTP2_METHOD_POST,
	HTTP2_METHOD_PUT,
	HTTP2_METHOD_DELETE,
	HTTP2_METHOD_HEAD,
	HTTP2_METHOD_OPTIONS,
	HTTP2_METHOD_PATCH
} = http2.constants

export class Fetch2 {
	static async fetch(urlOrString, options) {
		// console.log('f2', urlOrString)

		const method = options?.method ?? 'GET'
		const headers = options?.headers ?? []
		const signal = options?.signal
		const url = new URL(urlOrString)

		const client = http2.connect(url.origin, {
			rejectUnauthorized: false
		})

		const { resolve, reject, promise } = Promise.withResolvers()

		client.on('error', error => reject(error))
		client.on('connect', () => {
			const req = client.request({
				[HTTP2_HEADER_PATH]: `${url.pathname}${url.search}`,
				[HTTP2_HEADER_METHOD]: method,
				...headers
			})
			req.end()
			req.on('error', error => reject(error))
			promise.finally(() => client.close())

			req.on('response', (headers) => {
				const status = headers[HTTP2_HEADER_STATUS]
				if(!Number.isFinite(status)) {
					reject(new Error('unknown status'))
					return
				}

				// console.log('f2 requestBody')
				const body = requestBody(req, { signal })

				resolve({
					ok: (status >= 200 && status < 300),
					status,
					headers: new Map(Object.entries(headers)),

					get body() { return body.body },
					arrayBuffer: () => body.arrayBuffer(),
					bytes: () => body.bytes(),
					text: () => body.text(),
					formData: undefined,
					json: () => body.json()
				})
			})
		})

		return promise
	}
}



// const response = await Fetch2.fetch('https://tic.next.local:8443/tic/v1/games?f=resolved')
// const url = new URL('/tic/v1/games', 'https://tic.next.local:8443')
// url.searchParams.set('f', 'resolved')
// const response = await Fetch2.fetch(url, {
// 	mode: 'cors',
// 	headers: {
// 		'Accept': 'application/json',
// 		[HTTP2_HEADER_AUTHORIZATION]: 'Bearer token:access:agent'
// 	},
// 	signal: AbortSignal.timeout(1000)
// })

// console.log(response)
// console.log(await response.json())
// console.log(response)

