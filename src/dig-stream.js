import http2 from 'node:http2'

import { SSE_LAST_EVENT_ID } from '@johntalton/sse-util'

import {
	ENCODER_MAP,
	sendError,
	sendJSON_Encoded,
	sendNotFound,
	sendPreflight,
	sendSSE,
	sendTooManyRequests,
	sendUnauthorized
} from './util/handle-stream-util.js'

import { requestBody } from './util/body.js'
import { parseContentType, CONTENT_TYPE_JSON, MIME_TYPE_JSON, MIME_TYPE_TEXT, MIME_TYPE_EVENT_STREAM, MIME_TYPE_XML } from './util/content-type.js'
import { Accept } from './util/accept.js'
import { AcceptEncoding } from './util/accept-encoding.js'
import { AcceptLanguage } from './util/accept-language.js'
import { ROUTES } from './route.js'
import { dig, digOptions } from './util/dig.js'
import { RateLimiter } from './util/rate-limiter.js'
import { accessToken } from './util/access-token.js'
import { Forwarded, FORWARDED_KEY_FOR, KNOWN_FORWARDED_KEYS, SKIP_ANY } from './util/forwarded.js'

/**
 * @import { ServerHttp2Stream, IncomingHttpHeaders } from 'node:http2'
 */

const { HTTP2_METHOD_OPTIONS } = http2.constants

const {
	HTTP2_HEADER_METHOD,
	HTTP2_HEADER_AUTHORITY,
	HTTP2_HEADER_SCHEME,
	HTTP2_HEADER_PATH,
	HTTP2_HEADER_AUTHORIZATION,
	HTTP2_HEADER_CONTENT_TYPE,
	HTTP2_HEADER_CONTENT_LENGTH,
	HTTP2_HEADER_ACCEPT,
	HTTP2_HEADER_ACCEPT_ENCODING,
	HTTP2_HEADER_ACCEPT_LANGUAGE,
	HTTP2_HEADER_REFERER,
	HTTP2_HEADER_HOST,
	HTTP2_HEADER_VIA,
	HTTP2_HEADER_CACHE_CONTROL,
} = http2.constants

const HTTP_HEADER_ORIGIN = 'origin'
const HTTP_HEADER_USER_AGENT = 'user-agent'
const HTTP_HEADER_FORWARDED = 'forwarded'
const HTTP_HEADER_SEC_CH_UA = 'sec-ch-ua'
const HTTP_HEADER_SEC_CH_PLATFORM = 'sec-ch-ua-platform'
const HTTP_HEADER_SEC_CH_MOBILE = 'sec-ch-ua-mobile'
const HTTP_HEADER_SEC_FETCH_SITE = 'sec-fetch-site'
const HTTP_HEADER_SEC_FETCH_MODE = 'sec-fetch-mode'
const HTTP_HEADER_SEC_FETCH_DEST = 'sec-fetch-dest'

const FORWARDED_KEY_SECRET = 'secret'
const FORWARDED_ACCEPTABLE_KEYS = [ ...KNOWN_FORWARDED_KEYS, FORWARDED_KEY_SECRET ]
const FORWARDED_REQUIRED = process.env.FORWARDED_REQUIRED === 'true'
const FORWARDED_DROP_RIGHTMOST = (process.env.FORWARDED_SKIP_LIST ?? '').split(',').map(s => s.trim()).filter(s => s.length > 0)
const FORWARDED_SECRET = process.env.FORWARDED_SECRET

const CONTENT_TYPE_ASSUMED = CONTENT_TYPE_JSON
const DEFAULT_SUPPORTED_LANGUAGES = [ 'en-US', 'en' ]
const DEFAULT_SUPPORTED_MIME_TYPES = [ MIME_TYPE_JSON, MIME_TYPE_XML, MIME_TYPE_TEXT ]
const DEFAULT_SUPPORTED_ENCODINGS = [ ...ENCODER_MAP.keys() ]

const ipRateStore = new Map()
const ipRequestPerSecondPolicy = {
	name: 'ip',
	quota: 25,
	windowSeconds: 15,
	size: 50
}

/**
 * @param {ServerHttp2Stream} stream
 * @param {IncomingHttpHeaders} header
 * @param {number} flags
 */
async function handleStreamAsync(stream, header, flags) {
	const preambleStart = performance.now()

	const authorization = header[HTTP2_HEADER_AUTHORIZATION]
	const method = header[HTTP2_HEADER_METHOD]
	const fullPathAndQuery = header[HTTP2_HEADER_PATH]
	const fullContentType = header[HTTP2_HEADER_CONTENT_TYPE]
	const fullContentLength = header[HTTP2_HEADER_CONTENT_LENGTH]
	const fullAccept = header[HTTP2_HEADER_ACCEPT]
	const fullAcceptEncoding = header[HTTP2_HEADER_ACCEPT_ENCODING]
	const fullAcceptLanguage = header[HTTP2_HEADER_ACCEPT_LANGUAGE]
	const origin = header[HTTP_HEADER_ORIGIN]
	// const host = header[HTTP2_HEADER_HOST]
	const authority = header[HTTP2_HEADER_AUTHORITY]
	const scheme = header[HTTP2_HEADER_SCHEME]
	// const lastEventID = header[SSE_LAST_EVENT_ID.toLowerCase()]
	const UA = header[HTTP_HEADER_USER_AGENT]
	const referer = header[HTTP2_HEADER_REFERER]
	const fullForwarded = header[HTTP_HEADER_FORWARDED]

	// SEC Client Hints
	const secUA = header[HTTP_HEADER_SEC_CH_UA]
	const secPlatform = header[HTTP_HEADER_SEC_CH_PLATFORM]
	const secMobile = header[HTTP_HEADER_SEC_CH_MOBILE]
	const secFetchSite = header[HTTP_HEADER_SEC_FETCH_SITE]
	const secFetchMode = header[HTTP_HEADER_SEC_FETCH_MODE]
	const secFetchDest = header[HTTP_HEADER_SEC_FETCH_DEST]

	// const priority = header['priority']

	// const pragma = header['pragma']
	// const cacheControl = header[HTTP2_HEADER_CACHE_CONTROL]

	const ip = stream.session?.socket.remoteAddress
	const port = stream.session?.socket.remotePort
	const host = stream.session?.socket.servername // TLS SNI

	const requestUrl = new URL(fullPathAndQuery, `${scheme}://${authority}`)

	// console.log(Object.keys(header))
	// console.log({
	// 	method, url:
	// 	requestUrl.pathname,
	// 	query: requestUrl.search,
	// 	session: { host, ip, port },
	// 	origin,
	// 	authority,
	// 	referer,
	// 	UA,
	// 	fullContentType, fullContentLength,
	// 	// pragma,
	// 	// cacheControl
	// })
	// console.log({
	// 	secUA,
	// 	secPlatform,
	// 	secMobile,
	// 	secFetchSite,
	// 	secFetchMode,
	// 	secFetchDest
	// })

	// stream.on('close', () => console.log('stream close'))
	stream.on('error', error => {
		console.warn('stream error', error)
	})
	// stream.on('aborted', () => console.log('stream aborted'))
	// stream.on('end', () => console.log('stream end '))

	//
	// Forwarded
	//
	const forwardedList = Forwarded.parse(fullForwarded, FORWARDED_ACCEPTABLE_KEYS)
	const forwarded = Forwarded.selectRightMost(forwardedList, FORWARDED_DROP_RIGHTMOST)
	const forwardedFor = forwarded?.get(FORWARDED_KEY_FOR)
	const forwardedSecret = forwarded?.get(FORWARDED_KEY_SECRET)

	if(FORWARDED_REQUIRED && forwarded === undefined) {
		sendError(stream, 'missing forwarded')
		return
	}

	if(FORWARDED_REQUIRED && forwardedFor === undefined) {
		sendError(stream, 'missing forwarded for')
		return
	}

	if(FORWARDED_SECRET !== undefined && forwardedSecret !== FORWARDED_SECRET) {
		sendError(stream, 'invalid forwarded secret')
		return
	}

	// if(forwardedFor !== undefined) { console.log('Forwarded for', forwardedFor) }

	//
	// Options pre-flight
	//
	if(method === HTTP2_METHOD_OPTIONS) {
		const allowedMethods = digOptions(ROUTES, requestUrl.pathname)
		sendPreflight(stream, origin, allowedMethods)
		return
	}

	//
	// Rate Limit (IP)
	//
	const limitInfo = RateLimiter.test(ipRateStore, ip, ipRequestPerSecondPolicy)
	if(limitInfo.exhausted) {
		sendTooManyRequests(stream, limitInfo, ipRequestPerSecondPolicy)
		return
	}

	//
	// Dig
	//
	const digStart = performance.now()
	const { handler, matches, metadata } = dig(ROUTES, method, requestUrl.pathname)
	const digEnd = performance.now()

	//
	// Access Token (exists, not validated)
	//
	const token = accessToken(authorization, requestUrl.searchParams)
	if(token === undefined) {
		sendUnauthorized(stream)
		return
	}

	const user = { token }

	//
	// content negotiation
	//
	const hasContentType =  (fullContentType !== undefined) && (fullContentType !== '')
	const contentType = parseContentType(hasContentType ? fullContentType : CONTENT_TYPE_ASSUMED)

	const forceIdentity = false
	const supportedEncodings = forceIdentity ? [] : DEFAULT_SUPPORTED_ENCODINGS
	const acceptedEncoding = AcceptEncoding.select(fullAcceptEncoding, metadata.encodings ?? supportedEncodings)
	const accept = Accept.select(fullAccept, metadata.mimeTypes ?? DEFAULT_SUPPORTED_MIME_TYPES)
	const acceptedLanguage = AcceptLanguage.select(fullAcceptLanguage, metadata.languages ?? DEFAULT_SUPPORTED_LANGUAGES)

	//
	const preambleEnd = performance.now()

	//
	// setup future body
	//
	const contentLength = parseInt(fullContentLength, 10)
	const body = requestBody(stream, {
		signal: AbortSignal.timeout(2 * 1000),
		charset: contentType.charset,
		contentLength,
		byteLimit: 1000 * 1000
	})

	//
	// SSE
	//
	const isSSE = metadata?.sse ?? false
	if(isSSE) {
		if(accept !== MIME_TYPE_EVENT_STREAM) {
			sendError(stream, 'mime type event stream expect for SSE route')
			return
		}

		sendSSE(stream, origin, metadata)
	}

	//
	// core handler
	//
	const handlerStart = performance.now()
	return Promise.try(handler, matches, user, body, requestUrl.searchParams, stream)
		.then(data => {
			const handlerEnd = performance.now()
			const meta = { performance: [
				{ name: 'dig', duration: digEnd - digStart },
				{ name: 'preamble', duration: preambleEnd - preambleStart },
				{ name: 'body', duration: body.duration },
				{ name: 'handler', duration: handlerEnd - handlerStart  }
			] }

			// SSE header/response send above via sendSSE
			if(isSSE) { return }

			sendJSON_Encoded(stream, data, acceptedEncoding, meta)
		})
		.catch(e => {
			// console.warn(e)
			sendError(stream, 'Error: ' + e.message)
		})
}

/**
 * @param {ServerHttp2Stream} stream
 * @param {IncomingHttpHeaders} header
 * @param {number} flags
 */
export function handleStream(stream, header, flags) {
	handleStreamAsync(stream, header, flags)
		.catch(e => {
			// console.warn('Error in stream handler', stream.writable, stream.closed, stream.aborted, stream.destroyed, stream.endAfterHeaders)
			sendError(stream, `top level error: ${e.message}`)

			// stream.session.destroy()
		})
}
