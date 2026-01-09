import http2 from 'node:http2'
import fs from 'node:fs'
import crypto from 'node:crypto'

import { handleStream } from './dig-stream.js'

/** @import { SecureServerOptions, Http2Session } from 'node:http2' */

const {
	SSL_OP_NO_TLSv1,
	SSL_OP_NO_TLSv1_1,
	SSL_OP_NO_TLSv1_2,
} = crypto.constants

const HOST = process.env['HOST']
const PORT = process.env['PORT'] ?? 8443
const IPV6_ONLY = process.env['IPV6_ONLY'] ?? false
const CREDENTIALS = (process.env['CREDENTIALS'] ?? '').split(',').map(c => c.trim()).filter(c => c.length > 0)

// openssl req -x509 -newkey rsa:2048 -nodes -sha256 -subj '/CN=localhost' -keyout localhost-privkey.pem -out localhost-cert.pem
class CredentialsCache {
	static cache = new Map()

	/**
	 * @param {string} host
	 */
	static #load(host) {
		const key = fs.readFileSync(`./certificates/${host}-privkey.pem`, 'utf-8')
		const cert = fs.readFileSync(`./certificates/${host}-cert.pem`, 'utf-8')
		return { key, cert }
	}

	/**
	 * @param {string} host
	 */
	static get(host) {
		if(!CredentialsCache.cache.has(host)) {
			const credentials = CredentialsCache.#load(host)
			CredentialsCache.cache.set(host, credentials)
		}
		return CredentialsCache.cache.get(host)
	}
}

/** @type {SecureServerOptions} */
const options = {
	// origins: [],

	allowHTTP1: false,
	secureOptions: SSL_OP_NO_TLSv1 | SSL_OP_NO_TLSv1_1 | SSL_OP_NO_TLSv1_2,
	minVersion: 'TLSv1.3',
	settings: {
		enablePush: false
	},

	ALPNProtocols: [ 'h2' ],
	// ALPNCallback: ({ servername, protocols }) => {
	// 	if(!protocols.includes('h2')) {
	// 		console.log('non h2 request', servername, protocols)
	// 		return undefined
	// 	}
	// 	return 'h2'
	// },
	// SNICallback: (serverName, callback) => {}

	// maxSessionMemory: 1,
	// maxSessionInvalidFrames: 1,

	// enableTrace: false,
	// noDelay: false,
}

const controller = new AbortController()
const shutdownSignal = controller.signal
// const sessions = new Set()


const server = http2.createSecureServer(options)
// server.setTimeout(200)

CREDENTIALS.forEach(credential => {
	server.addContext(credential, CredentialsCache.get(credential))
})

// server.on('timeout', () => console.warn('Server Timeout'))
server.on('tlsClientError', (error, socket) => {
	if(error.code === 'ERR_SSL_SSL/TLS_ALERT_CERTIFICATE_UNKNOWN') {
		// mute
		return
	}

	// if(error.code === 'ECONNRESET') {}
	console.warn('Server TLS Error', socket.servername, socket.remoteAddress, error.code)
})

server.on('sessionError', error => {
	if(error.code === 'ECONNRESET') {
		console.log('Server Session: Connection Reset')
		return
	}
	console.warn('Server Session Error', error)
})

server.on('error', error => console.warn('Server Error', (error.code === 'EADDRINUSE') ? 'Address in use' : error))

// server.on('session', session => {
// 	console.log('New Session', session.alpnProtocol, session.originSet)
// 	sessions.add(session)
// 	session.on('close', () => {
// 		console.log('Delete Session')
// 		sessions.delete(session)
// 	})
// })

server.on('stream', (stream, header, flags) => handleStream(stream, header, flags, shutdownSignal))

server.on('listening', () => console.log('Server Up', server.address()))

server.on('close', () => {
	console.log()
	console.log('End of Line.')
})

server.listen({
	ipv6Only: IPV6_ONLY,
	port: PORT,
	host: HOST,
	signal: shutdownSignal
})

// 'SIGTERM', 'SIGKILL'
process.on('SIGINT', () => {
	// server.getConnections((err, count) => console.log(err,count))
	// for(const session of sessions) {
	// 	console.log('open session')
	// 	session.close()
	// }

	if(shutdownSignal.aborted) { process.exit() }
	controller.abort('sigint')
})