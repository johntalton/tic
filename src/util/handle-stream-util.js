import http2 from 'node:http2'
import { brotliCompressSync, deflateSync, gzipSync } from 'node:zlib'

import {
	SSE_MIME,
	SSE_INACTIVE_STATUS_CODE,
	SSE_BOM,
	ENDING,
} from '@johntalton/sse-util'

import { CONTENT_TYPE_JSON, CONTENT_TYPE_TEXT } from './content-type.js'
import { ServerTiming, HTTP_HEADER_SERVER_TIMING } from './server-timing.js'
import { HTTP_HEADER_RATE_LIMIT, HTTP_HEADER_RATE_LIMIT_POLICY, RateLimit, RateLimitPolicy } from './rate-limit.js'

const {
	HTTP2_HEADER_STATUS,
	HTTP2_HEADER_CONTENT_TYPE,
	HTTP2_HEADER_ACCESS_CONTROL_ALLOW_ORIGIN,
	HTTP2_HEADER_ACCESS_CONTROL_ALLOW_METHODS,
	HTTP2_HEADER_ACCESS_CONTROL_ALLOW_HEADERS,
	HTTP2_HEADER_SERVER,
	HTTP2_HEADER_RETRY_AFTER
} = http2.constants

const {
	HTTP_STATUS_OK,
	HTTP_STATUS_NOT_FOUND,
	HTTP_STATUS_UNAUTHORIZED,
	HTTP_STATUS_NO_CONTENT,
	HTTP_STATUS_INTERNAL_SERVER_ERROR,
	HTTP_STATUS_TOO_MANY_REQUESTS
} = http2.constants

export const SERVER_NAME = process.env.SERVER_NAME
export const ALLOWED_ORIGIN = process.env.ALLOWED_ORIGIN // '*'

export function sendError(stream, message) {
	console.log('500', message)

	stream.respond({
		[HTTP2_HEADER_ACCESS_CONTROL_ALLOW_ORIGIN]: ALLOWED_ORIGIN,
		[HTTP2_HEADER_STATUS]: HTTP_STATUS_INTERNAL_SERVER_ERROR,
		[HTTP2_HEADER_CONTENT_TYPE]: CONTENT_TYPE_TEXT,
		[HTTP2_HEADER_SERVER]: SERVER_NAME
	})
	if(message !== undefined) { stream.write(message) }
	stream.end()
}

export function sendPreflight(stream, origin) {
	stream.respond({
		[HTTP2_HEADER_ACCESS_CONTROL_ALLOW_ORIGIN]: ALLOWED_ORIGIN,
		[HTTP2_HEADER_ACCESS_CONTROL_ALLOW_METHODS]: ['GET', 'POST', 'PATCH', 'DELETE'].join(','),
		[HTTP2_HEADER_ACCESS_CONTROL_ALLOW_HEADERS]: ['Authorization', HTTP2_HEADER_CONTENT_TYPE].join(','),
		[HTTP2_HEADER_SERVER]: SERVER_NAME
	})
	stream.end()
}

export function sendUnauthorized(stream) {
	stream.respond({
		[HTTP2_HEADER_ACCESS_CONTROL_ALLOW_ORIGIN]: ALLOWED_ORIGIN,
		[HTTP2_HEADER_STATUS]: HTTP_STATUS_UNAUTHORIZED,
		[HTTP2_HEADER_SERVER]: SERVER_NAME
	})
	stream.end()
}

export function sendNotFound(stream, message) {
	// console.log('404', message)
	stream.respond({
		[HTTP2_HEADER_ACCESS_CONTROL_ALLOW_ORIGIN]: ALLOWED_ORIGIN,
		[HTTP2_HEADER_STATUS]: HTTP_STATUS_NOT_FOUND,
		[HTTP2_HEADER_CONTENT_TYPE]: CONTENT_TYPE_TEXT,
		[HTTP2_HEADER_SERVER]: SERVER_NAME
	})
	if(message !== undefined) { stream.write(message) }
	stream.end()
}

export function sendTooManyRequests(stream, limitInfo, ...policies) {
	stream.respond({
		[HTTP2_HEADER_ACCESS_CONTROL_ALLOW_ORIGIN]: ALLOWED_ORIGIN,
		[HTTP2_HEADER_STATUS]: HTTP_STATUS_TOO_MANY_REQUESTS,
		[HTTP2_HEADER_SERVER]: SERVER_NAME,

		[HTTP2_HEADER_RETRY_AFTER]: limitInfo.retryAfterS,
		[HTTP_HEADER_RATE_LIMIT]: RateLimit.from(limitInfo),
		[HTTP_HEADER_RATE_LIMIT_POLICY]: RateLimitPolicy.from(...policies)
	})
	stream.write(`Retry After ${limitInfo.retryAfterS} Seconds`)
	stream.end()
}

export function sendJSON(stream, obj, meta) {
	return sendJSON_Encoded(stream, obj, 'identity', meta)

	// const json = JSON.stringify(obj)

	// stream.respond({
	// 	[HTTP2_HEADER_ACCESS_CONTROL_ALLOW_ORIGIN]: ALLOWED_ORIGIN,
	// 	[HTTP2_HEADER_CONTENT_TYPE]: CONTENT_TYPE_JSON,
	// 	[HTTP2_HEADER_STATUS]: HTTP_STATUS_OK,
	// 	[HTTP2_HEADER_SERVER]: SERVER_NAME,
	// 	[HTTP_HEADER_SERVER_TIMING]: ServerTiming.encode(meta?.performance)
	// })
	// stream.write(json)
	// stream.end()
}

export const ENCODER_MAP = new Map([
	[ 'br', data => brotliCompressSync(Buffer.from(data, 'utf-8')) ],
	[ 'gzip', data => gzipSync(Buffer.from(data, 'utf-8')) ],
	[ 'deflate', data => deflateSync(Buffer.from(data, 'utf-8')) ]
])

export function sendJSON_Encoded(stream, obj, encoding, meta) {
	const json = JSON.stringify(obj)

	const useIdentity = encoding === 'identity'
	const encoder = ENCODER_MAP.get(encoding)
	const hasEncoder = encoder !== undefined
	const actualEncoding = hasEncoder ? encoding : undefined

	performance.mark(`stream-${stream.id}.encode.start`)
	const encodedData = hasEncoder && !useIdentity ? encoder(json) : json
	performance.mark(`stream-${stream.id}.encode.end`)

	meta.performance.push(
		{ name: 'encode', duration: performance.measure('get', `stream-${stream.id}.encode.start`, `stream-${stream.id}.encode.end`).duration}
	)

	stream.respond({
		[HTTP2_HEADER_ACCESS_CONTROL_ALLOW_ORIGIN]: ALLOWED_ORIGIN,
		[HTTP2_HEADER_CONTENT_TYPE]: CONTENT_TYPE_JSON,
		'Content-Encoding': actualEncoding,
		'Vary': 'Accept, Accept-Encoding',
		[HTTP2_HEADER_STATUS]: HTTP_STATUS_OK,
		[HTTP2_HEADER_SERVER]: SERVER_NAME,
		[HTTP_HEADER_SERVER_TIMING]: ServerTiming.encode(meta?.performance)
	})

	stream.write(encodedData)
	stream.end()
}

export function sendSSE(stream, origin, options) {
	stream.session.socket.setTimeout(0)
	// stream.session.socket.setNoDelay(true)
	// stream.session.socket.setKeepAlive(true)

	// stream.on('close', () => console.log('SSE stream closed'))

	const activeStream = options?.active ?? true
	const sendBOM = options?.bom ?? true

	stream.respond({
		[HTTP2_HEADER_ACCESS_CONTROL_ALLOW_ORIGIN]: origin,
		[HTTP2_HEADER_CONTENT_TYPE]: SSE_MIME,
		[HTTP2_HEADER_STATUS]: activeStream ? HTTP_STATUS_OK : HTTP_STATUS_NO_CONTENT, // SSE_INACTIVE_STATUS_CODE
		'Access-Control-Allow-Credentials': true
	 })

	 if(!activeStream) {
		stream.end()
		return
	 }

	if(sendBOM) {
		stream.write(SSE_BOM + ENDING.CRLF)
	}
}




// 'Cache-Control': 'no-cache, no-transform'
