import http2 from 'node:http2'
import { TLSSocket } from 'node:tls'

import {
	ENCODER_MAP,
	HTTP_HEADER_FORWARDED,
	HTTP_HEADER_ORIGIN,
	HTTP_HEADER_SEC_CH_MOBILE,
	HTTP_HEADER_SEC_CH_PLATFORM,
	HTTP_HEADER_SEC_CH_UA,
	HTTP_HEADER_SEC_FETCH_DEST,
	HTTP_HEADER_SEC_FETCH_MODE,
	HTTP_HEADER_SEC_FETCH_SITE,
	HTTP_HEADER_USER_AGENT
} from '@johntalton/http-util/response'
import { Response } from '@johntalton/http-util/response/object'

import { requestBody } from '@johntalton/http-util/body'
import {
	parseContentType,
	CONTENT_TYPE_JSON,
	MIME_TYPE_JSON,
	MIME_TYPE_TEXT,
	MIME_TYPE_EVENT_STREAM,
	MIME_TYPE_XML,

	Accept,
	AcceptEncoding,
	AcceptLanguage,

	Forwarded,
	FORWARDED_KEY_FOR,
	KNOWN_FORWARDED_KEYS
} from '@johntalton/http-util/headers'

import { ROUTES } from './route.js'
import { dig, digOptions } from './util/dig.js'
import { RateLimiter } from './util/rate-limiter.js'
import { getTokens } from './util/token.js'


/** @import { ServerHttp2Stream, IncomingHttpHeaders } from 'node:http2' */
/** @import { TimingsInfo } from '@johntalton/http-util/headers' */

const { HTTP2_METHOD_OPTIONS } = http2.constants

const {
	HTTP2_HEADER_METHOD,
	HTTP2_HEADER_AUTHORITY,
	HTTP2_HEADER_SCHEME,
	HTTP2_HEADER_PATH,
	HTTP2_HEADER_AUTHORIZATION,
	HTTP2_HEADER_CONTENT_TYPE,
	HTTP2_HEADER_CONTENT_LENGTH,
	HTTP2_HEADER_CONTENT_DISPOSITION,
	HTTP2_HEADER_ACCEPT,
	HTTP2_HEADER_ACCEPT_ENCODING,
	HTTP2_HEADER_ACCEPT_LANGUAGE,
	HTTP2_HEADER_REFERER,
	HTTP2_HEADER_HOST,
	HTTP2_HEADER_VIA,
	HTTP2_HEADER_CACHE_CONTROL,
	HTTP2_HEADER_ETAG,
	HTTP2_HEADER_IF_MATCH,
	HTTP2_HEADER_IF_MODIFIED_SINCE,
	HTTP2_HEADER_IF_NONE_MATCH,
	HTTP2_HEADER_IF_RANGE,
	HTTP2_HEADER_IF_UNMODIFIED_SINCE,
	HTTP2_HEADER_LAST_MODIFIED
} = http2.constants

const ALLOWED_ORIGINS = (process.env['ALLOWED_ORIGINS'] ?? '').split(',').map(s => s.trim())

const FORWARDED_KEY_SECRET = 'secret'
const FORWARDED_ACCEPTABLE_KEYS = [ ...KNOWN_FORWARDED_KEYS, FORWARDED_KEY_SECRET ]
const FORWARDED_REQUIRED = process.env['FORWARDED_REQUIRED'] === 'true'
const FORWARDED_DROP_RIGHTMOST = (process.env['FORWARDED_SKIP_LIST'] ?? '').split(',').map(s => s.trim()).filter(s => s.length > 0)
const FORWARDED_SECRET = process.env['FORWARDED_SECRET']
const SERVER_NAME = process.env['SERVER_NAME']

const CONTENT_TYPE_ASSUMED = CONTENT_TYPE_JSON
// const ACCEPT_TYPE_ASSUMED = MIME_TYPE_JSON
const DEFAULT_SUPPORTED_LANGUAGES = [ 'en-US', 'en' ]
const DEFAULT_SUPPORTED_MIME_TYPES = [ MIME_TYPE_JSON, MIME_TYPE_XML, MIME_TYPE_TEXT ]
const DEFAULT_SUPPORTED_ENCODINGS = [ ...ENCODER_MAP.keys() ]

const BODY_TIMEOUT_SEC = 2 * 1000
const BODY_BYTE_LENGTH = 1000 * 1000

const ipRateStore = new Map()
const ipRequestPerSecondPolicy = {
	name: 'ip',
	quota: 25,
	windowSeconds: 15,
	size: 50,
	quotaUnits: 1
}

/**
 * @param {ServerHttp2Stream} stream
 * @param {IncomingHttpHeaders} header
 * @param {number} _flags
 * @param {AbortSignal} shutdownSignal
 */
async function handleStreamAsync(stream, header, _flags, shutdownSignal) {
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
	const host = header[HTTP2_HEADER_HOST]
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

	const allowedOrigin = (origin !== undefined) ?
		((ALLOWED_ORIGINS.includes(origin) || ALLOWED_ORIGINS.includes('*')) ?
		(URL.canParse(origin) ?
		origin : undefined) : undefined) : undefined

	const meta = {
		performance: [],
		servername: SERVER_NAME,
		origin: allowedOrigin
	}

	if(stream.session === undefined) {
		Response.error(stream, 'session undefined', meta)
		return
	}

	if(fullPathAndQuery === undefined || Array.isArray(fullPathAndQuery)) {
		Response.error(stream, 'undefined or unknown request path', meta)
		return
	}

	if(method === undefined || Array.isArray(method)) {
		Response.error(stream, 'undefined or unknown request method', meta)
		return
	}

	if(!(stream.session.socket instanceof TLSSocket)) { throw new Error('socket not TLS') }

	const ip = stream.session.socket.remoteAddress
	const port = stream.session.socket.remotePort
	// @ts-ignore
	const SNI = stream.session.socket.servername // TLS SNI

	const requestUrl = new URL(fullPathAndQuery, `${scheme}://${authority}`)

	// console.log(Object.keys(header))
	// console.log({
	// 	method, url:
	// 	requestUrl.pathname,
	// 	query: requestUrl.search,
	// 	session: {, ip, port },
	//  SNI,
	// 	host,
	// 	origin,
	// 	authority,
	// 	referer,
	// 	UA,
	// 	fullContentType, fullContentLength,
	// 	// pragma,
	// 	// cacheControl
	//     fullAccept
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
		Response.error(stream, 'missing forwarded', meta)
		return
	}

	if(FORWARDED_REQUIRED && forwardedFor === undefined) {
		Response.error(stream, 'missing forwarded for', meta)
		return
	}

	if(FORWARDED_SECRET !== undefined && forwardedSecret !== FORWARDED_SECRET) {
		Response.error(stream, 'invalid forwarded secret', meta)
		return
	}

	// if(forwardedFor !== undefined) { console.log('Forwarded for', forwardedFor) }

	//
	// Options pre-flight
	//
	if(method === HTTP2_METHOD_OPTIONS) {
		const allowedMethods = digOptions(ROUTES, requestUrl.pathname)
		Response.preflight(stream, allowedMethods, meta)
		return
	}

	//
	// Rate Limit (IP)
	//
	const rateLimitKey = `${ip}` // `${ip}:${header['x-k6-vuid']}`
	const limitInfo = RateLimiter.test(ipRateStore, rateLimitKey, ipRequestPerSecondPolicy)
	if(limitInfo.exhausted) {
		Response.tooManyRequests(stream, limitInfo, [ ipRequestPerSecondPolicy ], meta)
		return
	}

	//
	// Dig
	//
	const digStart = performance.now()
	const { handler, matches, metadata } = dig(ROUTES, method, requestUrl.pathname)
	const digEnd = performance.now()

	const isSSE = metadata?.sse ?? false

	//
	// Access Token (exists, not validated)
	//
	const tokens = getTokens(authorization, requestUrl.searchParams)
	// if(tokens.access === undefined && !isSSE) {
	// 	sendUnauthorized(stream)
	// 	return
	// }
	// else if(tokens.sse === undefined && isSSE) {
	// 	sendUnauthorized(stream)
	// 	return
	// }

	const user = { tokens }

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
		signal: AbortSignal.timeout(BODY_TIMEOUT_SEC),
		contentType,
		contentLength,
		byteLimit: BODY_BYTE_LENGTH
	})

	//
	// SSE
	//
	if(isSSE) {
		if(accept !== MIME_TYPE_EVENT_STREAM) {
			Response.error(stream, 'mime type event stream expect for SSE route', meta)
			return
		}

		// stream.session.setTimeout(0)
		// stream.setTimeout(0)
		Response.sse(stream, { ...meta, ...metadata })
	}

	//
	// core handler
	//
	const handlerStart = performance.now()
	/** @type {Array<TimingsInfo>} */
	const handlerPerformance = []

	return Promise.try(
			handler,
			matches,
			user,
			body,
			requestUrl.searchParams,
			stream,
			handlerPerformance,
			shutdownSignal
		)
		.then(data => {
			const handlerEnd = performance.now()
			const finalMeta = {
				...meta,
				performance: [
					...handlerPerformance,
					{ name: 'dig', duration: digEnd - digStart },
					{ name: 'preamble', duration: preambleEnd - preambleStart },
					{ name: 'body', duration: body.duration },
					{ name: 'handler', duration: handlerEnd - handlerStart  }
				] }

			// SSE header/response send above via sendSSE
			if(isSSE) { return }

			if(accept === MIME_TYPE_JSON) {
				Response.json(stream, data, acceptedEncoding, undefined, undefined, { priv: true, maxAge: 0 }, finalMeta)
			}
			else {
				throw new Error('unknown accept type')
			}

		})
		.catch(e => {
			console.log('Error', e)
			Response.error(stream, 'Error: ' + e.message, meta)
		})
}

/**
 * @param {ServerHttp2Stream} stream
 * @param {IncomingHttpHeaders} header
 * @param {number} flags
 * @param {AbortSignal} shutdownSignal
 */
export function handleStream(stream, header, flags, shutdownSignal) {
	handleStreamAsync(stream, header, flags, shutdownSignal)
		.catch(e => {
			console.warn(e)
			console.warn('Error in stream handler', stream.writable, stream.closed, stream.aborted, stream.destroyed, stream.endAfterHeaders)
			// sendError(stream, `top level error: ${e.message}`, )
			stream.close()
			stream.session?.destroy()
		})
}
