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


const { HTTP2_METHOD_OPTIONS } = http2.constants

const {
	HTTP2_HEADER_METHOD,
	HTTP2_HEADER_PATH,
	HTTP2_HEADER_STATUS,
	HTTP2_HEADER_CONTENT_TYPE,
	HTTP2_HEADER_ACCEPT,
	HTTP2_HEADER_ACCEPT_ENCODING,
	HTTP2_HEADER_ACCEPT_LANGUAGE,
	HTTP2_HEADER_AUTHORIZATION,
	HTTP2_HEADER_ACCESS_CONTROL_ALLOW_ORIGIN,
	HTTP2_HEADER_ACCESS_CONTROL_ALLOW_METHODS,
	HTTP2_HEADER_ACCESS_CONTROL_ALLOW_HEADERS,
	HTTP2_HEADER_REFERER,
	HTTP2_HEADER_AUTHORITY,
	HTTP2_HEADER_SCHEME,
	HTTP2_HEADER_HOST
} = http2.constants

const HTTP_HEADER_ORIGIN = 'origin'
const HTTP_HEADER_USER_AGENT = 'user-agent'

const CONTENT_TYPE_ASSUMED = CONTENT_TYPE_JSON

const ipRateStore = new Map()
const ipRequestPerSecondPolicy = {
	name: 'ip',
	quota: 25,
	windowSeconds: 15,
	size: 50
}

async function handleStreamAsync(stream, header, flags) {
	const preambleStart = performance.now()

	const authorization = header[HTTP2_HEADER_AUTHORIZATION]
	const method = header[HTTP2_HEADER_METHOD]
	const fullPathAndQuery = header[HTTP2_HEADER_PATH]
	const fullContentType = header[HTTP2_HEADER_CONTENT_TYPE]
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

	const ip = stream.session.socket.remoteAddress
	const port = stream.session.socket.remotePort
	const host = stream.session.socket.servername

	const requestUrl = new URL(fullPathAndQuery, `${scheme}://${authority}`)

	// console.log({
	// 	method, url:
	// 	requestUrl.pathname,
	// 	query: requestUrl.search,
	// 	session: { host, ip, port },
	// 	origin,
	// 	authority,
	// 	referer,
	// 	UA,
	// 	fullContentType
	// })

	// stream.on('close', () => console.log('stream close'))
	stream.on('error', error => console.log('stream error', error))
	stream.on('aborted', () => console.log('stream aborted'))

	// Options pre-flight
	if(method === HTTP2_METHOD_OPTIONS) {
		const allowedMethods = digOptions(ROUTES, requestUrl.pathname)
		sendPreflight(stream, origin, allowedMethods)
		return
	}

	// Rate Limit (IP)
	const limitInfo = RateLimiter.test(ipRateStore, ip, ipRequestPerSecondPolicy)
	if(limitInfo.exhausted) {
		sendTooManyRequests(stream, limitInfo, ipRequestPerSecondPolicy)
		return
	}

	// Dig
	const digStart = performance.now()
	const { handler, matches, metadata } = dig(ROUTES, method, requestUrl.pathname)
	const digEnd = performance.now()

	// Access Token
	const token = accessToken(authorization, requestUrl.searchParams)
	if(token === undefined) {
		sendUnauthorized(stream)
		return
	}

	const user = { token }

	// content negotiation
	const hasContentType =  (fullContentType !== undefined) && (fullContentType !== '')
	const contentType = parseContentType(hasContentType ? fullContentType : CONTENT_TYPE_ASSUMED)

	const forceIdentity = false
	const supportedEncodings = forceIdentity ? [] : [ ...ENCODER_MAP.keys() ]
	const acceptedEncoding = AcceptEncoding.select(fullAcceptEncoding, supportedEncodings)
	const accept = Accept.select(fullAccept, [ MIME_TYPE_JSON, MIME_TYPE_XML, MIME_TYPE_TEXT, MIME_TYPE_EVENT_STREAM ])
	const acceptedLanguage= AcceptLanguage.select(fullAcceptLanguage, [ 'en-US', 'en' ])

	//
	const preambleEnd = performance.now()

	// body
	const bodyStart = performance.now()
	const body = await requestBody(stream).json(contentType.charset)
	const bodyEnd = performance.now()

	// SSE
	const isSSE = metadata?.sse ?? false
	if(isSSE) {
		if(accept !== MIME_TYPE_EVENT_STREAM) {
			sendError(stream, 'mime type event stream expect for SSE route')
			return
		}

		sendSSE(stream, origin, metadata)
	}

	// core handler
	const handlerStart = performance.now()
	return Promise.try(handler, matches, user, body, requestUrl.searchParams, stream)
		.then(data => {
			const handlerEnd = performance.now()
			const meta = { performance: [
				{ name: 'dig', duration: digEnd - digStart },
				{ name: 'preamble', duration: preambleEnd - preambleStart },
				{ name: 'body', duration: bodyEnd - bodyStart },
				{ name: 'handler', duration: handlerEnd - handlerStart  }
			] }

			if(!isSSE) {
				sendJSON_Encoded(stream, data, acceptedEncoding, meta)
			}
		})
		.catch(e => {
			console.warn(e)
			sendError(stream, 'Error: ' + e.message)
		})
}

export function handleStream(stream, header, flags) {
	handleStreamAsync(stream, header, flags)
		.catch(e => {
			// console.warn('Error in stream handler', stream.writable, stream.closed, stream.aborted, stream.destroyed, stream.endAfterHeaders)
			sendError(stream, `top level error: ${e.message}`)

			// stream.session.destroy()
		})
}
