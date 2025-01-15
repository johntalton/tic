import http2 from 'node:http2'

import { SSE_LAST_EVENT_ID } from '@johntalton/sse-util'

import {
	ENCODER_MAP,
	sendError,
	sendJSON, sendJSON_Encoded,
	sendNotFound,
	sendPreflight,
	sendSSE,
	sendTooManyRequests,
	sendUnauthorized
} from './util/handle-stream-util.js'

import { requestBody } from './util/body.js'
import { parseContentType, CONTENT_TYPE_JSON, MIME_TYPE_JSON, MIME_TYPE_TEXT } from './util/content-type.js'
import { Accept } from './util/accept.js'
import { AcceptEncoding } from './util/accept-encoding.js'
import { AcceptLanguage } from './util/accept-language.js'

//
import { startAuthentication, authenticate } from './relying-party/authentication.js'
import { startRegistration, register } from './relying-party/registration.js'

//
import {
	handleGame,
	handleList,
	handleNew
} from './games/index.js'

import {
	handleAccept,
	handleClose,
	handleDecline,
	handleForfeit,
	handleMove,
	handleOffer,
} from './games/actions/index.js'

import {
	getUser,
	listUsers,
	patchUser
} from './users/index.js'
import { handleGameFeed } from './games/feed.js'
import { simpleLogin } from './users/simple-login.js'
import { RateLimiter } from './util/rate-limiter.js'


const {
	HTTP2_METHOD_OPTIONS,
	HTTP2_METHOD_HEAD,
	HTTP2_METHOD_GET,
	HTTP2_METHOD_POST,
	HTTP2_METHOD_PATCH,
	HTTP2_METHOD_DELETE
} = http2.constants

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
	HTTP2_HEADER_AUTHORITY
} = http2.constants

const {
	HTTP_STATUS_OK,
	HTTP_STATUS_NOT_FOUND,
	HTTP_STATUS_UNAUTHORIZED,
	HTTP_STATUS_NO_CONTENT,
	HTTP_STATUS_INTERNAL_SERVER_ERROR
} = http2.constants


const BEARER = 'Bearer'

const CONTENT_TYPE_ASSUMED = CONTENT_TYPE_JSON

const PREFIX = '/tic/v1/'
const SLASH_CHAR = '/'
const EMPTY_CHAR = ''
const SPACE_CHAR = ' '
const QUERY_CHAR = '?'

const ROUTES = [
	{
		item: {
			alias: [ 'game', 'g' ],
			create: handleNew,
			get: handleGame,
			// delete: handleClose
		},
		group: {
			alias: [ 'games', 'g' ],
			list: handleList
		},
		actions: new Map([
			['accept', handleAccept ],
			['close', handleClose ],
			['decline', handleDecline ],
			['forfeit', handleForfeit ],
			['move', handleMove ],
			['offer', handleOffer ]
		]),
		// sse: {
		// 	alias: [ 'events', 'e' ],
		// 	channel: new MessageChannel()
		// }
	},
	{
		item: {
			alias: [ 'user', 'u' ],
			get: getUser,
		},
		group: {
			alias: [ 'users'],
			list: listUsers
		},
		actions: new Map()
	},
	{
		item: {
			alias: [ 'register' ],
			create: register,
			get: undefined
		},
		group: {
			alias: [ 'registration' ],
			list: startRegistration
		},
		actions: new Map()
	},
	{
		item: {
			alias: [ 'authenticate' ],
			create: authenticate,
			get: undefined
		},
		group: {
			alias: [ 'authentication' ],
			list: startAuthentication
		},
		actions: new Map()
	},
	{
		item: {
			alias: [ 'simple-login' ],
			create: simpleLogin,
			get: undefined
		}
	}
]

const feedConfig = {
	alias: [ 'feed', 'sse', 'events' ],
	bom: true,
	active: true,
	handler: handleGameFeed
}

const ipRateStore = new Map()
const ipRequestPerSecondPolicy = {
	name: 'ip',
	quota: 10,
	windowSeconds: 15,
	size: 50
}

async function handleStreamAsync(stream, header, flags) {
	const tokenFull = header[HTTP2_HEADER_AUTHORIZATION]
	const method = header[HTTP2_HEADER_METHOD]
	const fullPathAndQuery = header[HTTP2_HEADER_PATH]
	const fullContentType = header[HTTP2_HEADER_CONTENT_TYPE]
	const fullAccept = header[HTTP2_HEADER_ACCEPT]
	const fullAcceptEncoding = header[HTTP2_HEADER_ACCEPT_ENCODING]
	const fullAcceptLanguage = header[HTTP2_HEADER_ACCEPT_LANGUAGE]
	const origin = header['origin']
	const authority = header[HTTP2_HEADER_AUTHORITY]
	const lastEventID = header[SSE_LAST_EVENT_ID.toLowerCase()]
	const UA = header['user-agent']
	const referer = header[HTTP2_HEADER_REFERER]

	const ip = stream.session.socket.remoteAddress
	const port = stream.session.socket.remotePort
	const host = stream.session.socket.servername

	const [ fullPath, queryString ] = fullPathAndQuery.split(QUERY_CHAR)
	const query = new URLSearchParams(queryString)
	const suffixFullPath = fullPath.replace(PREFIX, EMPTY_CHAR)
	const suffixPath = suffixFullPath.charAt(0) === SLASH_CHAR ? suffixFullPath.substring(1) : suffixFullPath
	const [ routeFull, id, action ] = suffixPath.split(SLASH_CHAR)
	const route  = routeFull.toLowerCase()

	const hasContentType =  (fullContentType !== undefined) && (fullContentType !== '')
	const contentType = parseContentType(hasContentType ? fullContentType : CONTENT_TYPE_ASSUMED)

	const accept = Accept.select(fullAccept, [ MIME_TYPE_JSON, MIME_TYPE_TEXT ])
	const acceptedLanguage= AcceptLanguage.select(fullAcceptLanguage, [ 'en-US', 'en' ])

	const requestId = `${ip}-${stream.id}`
	console.log({ requestId, host, ip, port, origin, authority, referer, method, route, id, action, UA, accept, acceptedLanguage, fullContentType })

	stream.on('close', () => console.log('stream closed', requestId))
	stream.on('error', error => console.log('stream error', requestId, error))

	// preflight come before rate limiting?
	if(method === HTTP2_METHOD_OPTIONS) {
		sendPreflight(stream, origin)
		return
	}

	// console.log(ipRateStore)
	const limitInfo = RateLimiter.test(ipRateStore, ip, ipRequestPerSecondPolicy)
	if(limitInfo.exhausted) {
		sendTooManyRequests(stream, limitInfo, ipRequestPerSecondPolicy)
		return
	}

	if(feedConfig.alias.includes(route)) {
		sendSSE(stream, origin, feedConfig)

		const user = { token: query.get('token') }
		await Promise.try(feedConfig.handler, stream, user, query)
			.catch(e => {
				console.log('Feed Handler Error', e)
				stream.end()
			})
		return
	}

	const [ bearer, token ] = tokenFull?.split(SPACE_CHAR) ?? []
	if(bearer?.toLowerCase() !== BEARER.toLowerCase()) {
		sendUnauthorized(stream)
		return
	}

	const user = { token }

	// const userRateLimit = RateLimiter.get(user.token)
	// if(userRateLimit.exhausted) {
	// 	sendTooManyRequests(stream, userRateLimit)
	// 	return
	// }


	if(id === undefined) {
		// listing
		if (method === HTTP2_METHOD_GET) {
			for(const { group } of ROUTES) {
				if(group?.alias.includes(route)) {

					const forceIdentity = false
					const supportedEncodings = forceIdentity ? [] : [ ...ENCODER_MAP.keys() ]
					const acceptedEncoding = AcceptEncoding.select(fullAcceptEncoding, supportedEncodings)

					performance.mark(`stream-${stream.id}.listing.start`)

					await Promise.try(group.list, user, query)
						.then(data => {
							performance.mark(`stream-${stream.id}.listing.end`)

							const meta = { performance: [
								{ name: 'list', duration: performance.measure('list', `stream-${stream.id}.listing.start`, `stream-${stream.id}.listing.end`).duration}
							]}

							sendJSON_Encoded(stream, data, acceptedEncoding, meta)
						})
						.catch(e => {
							//console.log(e)
							sendError(stream, `listing failure: ${e.message}`)
						})

					return
				}
			}

			sendNotFound(stream, 'unknown listing route')
			return
		}

		// create
		if(method === HTTP2_METHOD_POST) {
			for(const { item } of ROUTES) {
				if(item?.alias.includes(route)) {
					if(item.create === undefined) {
						sendNotFound(stream, 'unavailable create route')
						return
					}

					performance.mark(`stream-${stream.id}.body.start`)
					const opaqueData = await requestBody(stream).json(contentType.charset)
					performance.mark(`stream-${stream.id}.body.end`)

					performance.mark(`stream-${stream.id}.create.start`)

					await Promise.try(item.create, user, opaqueData, query)
						.then(result => {
							performance.mark(`stream-${stream.id}.create.end`)

							const meta = { performance: [
								{ name: 'body', duration: performance.measure('body', `stream-${stream.id}.body.start`, `stream-${stream.id}.body.end`).duration},
								{ name: 'create', duration: performance.measure('create', `stream-${stream.id}.create.start`, `stream-${stream.id}.create.end`).duration}
							]}

							sendJSON(stream, result, meta)
						})
						.catch(e => {
							// console.log(e)
							sendError(stream, `create failure ${e.message}`)
						})

					return
				}
			}

			sendNotFound(stream, 'unknown create route')
			return
		}

		// without id (unknown verb)
		sendNotFound(stream, 'unknown group route')
		return
	}

	// get by id
	if(method === HTTP2_METHOD_GET) {
		for(const { item } of ROUTES) {
			if(item?.alias.includes(route)) {
				if(item.get === undefined) {
					sendNotFound(stream, 'unknown get route')
					return
				}

				// const forceIdentity = false
				// const supportedEncodings = forceIdentity ? [] : [ ...ENCODER_MAP.keys() ]
				// const acceptedEncoding = AcceptEncoding.select(fullAcceptEncoding, supportedEncodings)

				performance.mark(`stream-${stream.id}.get.start`)

				await Promise.try(item.get, id, user, query)
					.then(data => {
						if(data === undefined) {
							sendNotFound(stream, 'not found route')
							return
						}

						performance.mark(`stream-${stream.id}.get.end`)

						const meta = { performance: [
							{ name: 'get', duration: performance.measure('get', `stream-${stream.id}.get.start`, `stream-${stream.id}.get.end`).duration}
						]}

						sendJSON(stream, data, meta)
						// sendJSON_Encoded(stream, data, acceptedEncoding, meta)
					})
					.catch(e => sendError(stream, `getter failure ${e.message}`))

				return
			}
		}

		sendNotFound(stream, 'unknown get route')
		return
	}

	// delete by id
	if(method === HTTP2_METHOD_DELETE) {
		for(const { item } of ROUTES) {
			if(item?.alias.includes(route)) {
				if(item.delete === undefined) {
					sendNotFound(stream, 'unknown delete route')
					return
				}


				performance.mark(`stream-${stream.id}.delete.start`)

				await Promise.try(item.delete, id, user, query)
					.then(data => {
						performance.mark(`stream-${stream.id}.delete.end`)
						const meta = { performance: [
							{ name: 'delete', duration: performance.measure('delete', `stream-${stream.id}.delete.start`, `stream-${stream.id}.delete.end`).duration}
						]}

						sendJSON(stream, data, meta)
					})
					.catch(e => sendError(stream, `delete failure ${e.message}`))


				return
			}
		}

		sendNotFound(stream, 'unknown delete route')
		return
	}

	// not action verb (patch)
	if(method !== HTTP2_METHOD_PATCH) {
		sendNotFound(stream, 'unknown verb ')
		return
	}


	// not actions (patch)
	if(action  === undefined) {
		sendNotFound(stream, 'unspecified action route')
		return
	}

	// action (patch) by id
	let handler = undefined
	for(const { item, actions }  of ROUTES) {
		if(actions === undefined) { break }

		if(item?.alias.includes(route)) {
			if(!actions.has(action)) {
				sendNotFound(stream, 'unknown action route')
				return
			}

			// found
			handler = actions.get(action)
		}
	}

	// no action (patch)
	if(handler === undefined) {
		sendNotFound(stream, 'unknown action handler')
		return
	}

	// decode and handle (patch data)
	if(contentType.mimetype !== MIME_TYPE_JSON) {
		sendError(stream, 'unknown patch content type')
		return
	}

	performance.mark(`stream-${stream.id}.body.start`)
	const opaqueData = await requestBody(stream).json(contentType.charset)
	performance.mark(`stream-${stream.id}.body.end`)

	performance.mark(`stream-${stream.id}.action.start`)
	await Promise.try(handler, id, user, opaqueData, query)
		.then(data => {
			performance.mark(`stream-${stream.id}.action.end`)
			const meta = { performance: [
				{ name: 'body', duration: performance.measure('body', `stream-${stream.id}.body.start`, `stream-${stream.id}.body.end`).duration},
				{ name: 'action', duration: performance.measure('action', `stream-${stream.id}.action.start`, `stream-${stream.id}.action.end`).duration}
			]}
			sendJSON(stream, data, meta)}
		)
		.catch(e => sendError(stream, 'action resulted in error - ' + e.message))
}

export function handleStream(stream, header, flags) {
	handleStreamAsync(stream, header, flags)
		.catch(e => {
			console.warn('Error in stream handler', e)
			stream.respond({
				[HTTP2_HEADER_STATUS]: HTTP_STATUS_INTERNAL_SERVER_ERROR
			})
			stream.end()
			// stream.session.destroy()
		})
}
