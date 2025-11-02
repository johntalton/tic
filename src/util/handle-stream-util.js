import http2 from 'node:http2'
import { brotliCompressSync, deflateSync, gzipSync } from 'node:zlib'

import {
	SSE_MIME,
	SSE_INACTIVE_STATUS_CODE,
	SSE_BOM,
	ENDING,
} from '@johntalton/sse-util'

import { CHARSET_UTF8, CONTENT_TYPE_JSON, CONTENT_TYPE_TEXT } from './content-type.js'
import { ServerTiming, HTTP_HEADER_SERVER_TIMING } from './server-timing.js'
import { HTTP_HEADER_RATE_LIMIT, HTTP_HEADER_RATE_LIMIT_POLICY, RateLimit, RateLimitPolicy } from './rate-limit.js'

const {
	HTTP2_HEADER_STATUS,
	HTTP2_HEADER_CONTENT_TYPE,
	HTTP2_HEADER_CONTENT_ENCODING,
	HTTP2_HEADER_VARY,
	HTTP2_HEADER_ACCESS_CONTROL_ALLOW_ORIGIN,
	HTTP2_HEADER_ACCESS_CONTROL_ALLOW_METHODS,
	HTTP2_HEADER_ACCESS_CONTROL_ALLOW_HEADERS,
	HTTP2_HEADER_ACCESS_CONTROL_ALLOW_CREDENTIALS,
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

export const DEFAULT_METHODS = [ 'HEAD', 'GET', 'POST', 'PATCH', 'DELETE' ]

/**
 * @import { ServerHttp2Stream } from 'node:http2'
 */

/**
 * @import { TimingsInfo } from './server-timing.js'
 */

/**
 * @typedef {Object} Metadata
 * @property {Array<TimingsInfo>} performance
 */

/**
 * @typedef {Object} SSEOptions
 * @property {boolean} [active]
 * @property {boolean} [bom]
 */

/**
 * @param {ServerHttp2Stream} stream
 * @param {string} message
 */
export function sendError(stream, message) {
	console.log('500', stream.closed, stream.writable, message)

	if(stream.closed) { return }

	stream.respond({
		[HTTP2_HEADER_ACCESS_CONTROL_ALLOW_ORIGIN]: ALLOWED_ORIGIN,
		[HTTP2_HEADER_STATUS]: HTTP_STATUS_INTERNAL_SERVER_ERROR,
		[HTTP2_HEADER_CONTENT_TYPE]: CONTENT_TYPE_TEXT,
		[HTTP2_HEADER_SERVER]: SERVER_NAME
	})

	// protect against HEAD calls
	if(stream.writable) {
		if(message !== undefined) { stream.write(message) }
	}

	stream.end()
	// stream.destroy()
	if(!stream.closed) { stream.close() }
}

/**
 * @param {ServerHttp2Stream} stream
 * @param {string|undefined} origin
 * @param {Array<string>} [methods=DEFAULT_METHODS]
 */
export function sendPreflight(stream, origin, methods = DEFAULT_METHODS) {
	stream.respond({
		[HTTP2_HEADER_ACCESS_CONTROL_ALLOW_ORIGIN]: ALLOWED_ORIGIN,
		[HTTP2_HEADER_ACCESS_CONTROL_ALLOW_METHODS]: methods.join(','),
		[HTTP2_HEADER_ACCESS_CONTROL_ALLOW_HEADERS]: ['Authorization', HTTP2_HEADER_CONTENT_TYPE].join(','),
		[HTTP2_HEADER_SERVER]: SERVER_NAME
	})
	stream.end()
}

/**
 * @param {ServerHttp2Stream} stream
 */
export function sendUnauthorized(stream) {
	console.log('Unauthorized')

	stream.respond({
		[HTTP2_HEADER_ACCESS_CONTROL_ALLOW_ORIGIN]: ALLOWED_ORIGIN,
		[HTTP2_HEADER_STATUS]: HTTP_STATUS_UNAUTHORIZED,
		[HTTP2_HEADER_SERVER]: SERVER_NAME
	})
	stream.end()
}

/**
 * @param {ServerHttp2Stream} stream
 * @param {string} message
 */
export function sendNotFound(stream, message) {
	console.log('404', message)
	stream.respond({
		[HTTP2_HEADER_ACCESS_CONTROL_ALLOW_ORIGIN]: ALLOWED_ORIGIN,
		[HTTP2_HEADER_STATUS]: HTTP_STATUS_NOT_FOUND,
		[HTTP2_HEADER_CONTENT_TYPE]: CONTENT_TYPE_TEXT,
		[HTTP2_HEADER_SERVER]: SERVER_NAME
	})
	if(message !== undefined) { stream.write(message) }
	stream.end()
}

/**
 * @param {ServerHttp2Stream} stream
 * @param {*} limitInfo
 * @param {...*} policies
 */
export function sendTooManyRequests(stream, limitInfo, ...policies) {
	// console.log('Too many requests')
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

/**
 * @param {ServerHttp2Stream} stream
 * @param {Object} obj
 * @param {Metadata} meta
 */
export function sendJSON(stream, obj, meta) {
	return sendJSON_Encoded(stream, obj, 'identity', meta)
}


/**
 * @typedef {  (data: any, charset: BufferEncoding) => Buffer } EncoderFun
 */

/** @type {Map<string, EncoderFun>} */
export const ENCODER_MAP = new Map([
	[ 'br', (data, charset) => brotliCompressSync(Buffer.from(data, charset)) ],
	[ 'gzip', (data, charset) => gzipSync(Buffer.from(data, charset)) ],
	[ 'deflate', (data, charset) => deflateSync(Buffer.from(data, charset)) ]
])

/**
 * @param {ServerHttp2Stream} stream
 * @param {Object} obj
 * @param {string|undefined} encoding
 * @param {Metadata} meta
 */
export function sendJSON_Encoded(stream, obj, encoding, meta) {
	if(stream.closed) { return }

	const json = JSON.stringify(obj)

	const useIdentity = encoding === 'identity'
	const encoder = encoding !== undefined ? ENCODER_MAP.get(encoding) : undefined
	const hasEncoder = encoder !== undefined
	const actualEncoding = hasEncoder ? encoding : undefined

	const encodeStart = performance.now()
	const encodedData = hasEncoder && !useIdentity ? encoder(json, CHARSET_UTF8) : json
	const encodeEnd = performance.now()

	meta.performance.push(
		{ name: 'encode', duration: encodeEnd - encodeStart }
	)

	stream.respond({
		[HTTP2_HEADER_ACCESS_CONTROL_ALLOW_ORIGIN]: ALLOWED_ORIGIN,
		[HTTP2_HEADER_CONTENT_TYPE]: CONTENT_TYPE_JSON,
		[HTTP2_HEADER_CONTENT_ENCODING]: actualEncoding,
		[HTTP2_HEADER_VARY]: 'Accept, Accept-Encoding',
		[HTTP2_HEADER_STATUS]: HTTP_STATUS_OK,
		[HTTP2_HEADER_SERVER]: SERVER_NAME,
		[HTTP_HEADER_SERVER_TIMING]: ServerTiming.encode(meta?.performance)
	})

	// stream.write(encodedData)
	stream.end(encodedData)
}

/**
 * @param {ServerHttp2Stream} stream
 * @param {string|undefined} origin
 * @param {SSEOptions} options
 */
export function sendSSE(stream, origin, options) {
	stream.session?.socket.setTimeout(0)
	// stream.session.socket.setNoDelay(true)
	// stream.session.socket.setKeepAlive(true)

	// stream.on('close', () => console.log('SSE stream closed'))
	// stream.on('aborted', () => console.log('SSE stream aborted'))

	const activeStream = options?.active ?? true
	const sendBOM = options?.bom ?? true

	stream.respond({
		[HTTP2_HEADER_ACCESS_CONTROL_ALLOW_ORIGIN]: ALLOWED_ORIGIN,
		[HTTP2_HEADER_CONTENT_TYPE]: SSE_MIME,
		[HTTP2_HEADER_STATUS]: activeStream ? HTTP_STATUS_OK : HTTP_STATUS_NO_CONTENT, // SSE_INACTIVE_STATUS_CODE
		[HTTP2_HEADER_ACCESS_CONTROL_ALLOW_CREDENTIALS]: 'true'
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
