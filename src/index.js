import http2 from 'node:http2'
import fs from 'node:fs'
import crypto from 'node:crypto'

// import { handleStream } from './handle-stream.js'
import { handleStream } from './dig-stream.js'

const {
	SSL_OP_NO_TLSv1,
	SSL_OP_NO_TLSv1_1,
	SSL_OP_NO_TLSv1_2,
	SSL_OP_NO_TLSv1_3,
	SSL_OP_NO_SSLv2,
	SSL_OP_NO_SSLv3
} = crypto.constants

const HOST = process.env.HOST
const PORT = process.env.PORT ?? 8443
const IPV6_ONLY = process.env.IPV6_ONLY ?? false
const CREDENTIALS = (process.env.CREDENTIALS ?? '').split(',').map(c => c.trim()).filter(c => c.length > 0)

// openssl req -x509 -newkey rsa:2048 -nodes -sha256 -subj '/CN=localhost' -keyout localhost-privkey.pem -out localhost-cert.pem
class CredentialsCache {
	static cache = new Map()

	static #load(host) {
		const key = fs.readFileSync(`${host}-privkey.pem`, 'utf-8')
		const cert = fs.readFileSync(`${host}-cert.pem`, 'utf-8')
		return { key, cert }
	}

	static get(host) {
		if(!CredentialsCache.cache.has(host)) {
			const credentials = CredentialsCache.#load(host)
			CredentialsCache.cache.set(host, credentials)
		}
		return CredentialsCache.cache.get(host)
	}
}

const options = {
	// origins: [],

	allowHTTP1: false,
	secureOptions: SSL_OP_NO_TLSv1 | SSL_OP_NO_TLSv1_1 | SSL_OP_NO_TLSv1_2,
	settings: {
		enablePush: false
	},

	// ALPNCallback
	// SNICallback: (serverName, callback)

	// enableTrace: false,
	// noDelay: false,
}

const server = http2.createSecureServer(options)
server.setTimeout(2 * 1000)

CREDENTIALS.forEach(credential => {
	server.addContext(credential, CredentialsCache.get(credential))
})

server.on('timeout', () => console.warn('Server Timeout'))
server.on('tlsClientError', (error, socket) => console.log('Server TLS Error', socket.servername, socket.remoteAddress, error.code))
server.on('sessionError', error => { if(error.code !== 'ECONNRESET') { console.warn('Server Session Error', error) } })
server.on('error', error => console.log('Server Error', (error.code === 'EADDRINUSE') ? 'Address in use' : error))
// server.on('session', session => console.log('New Session', session.alpnProtocol, session.originSet))
server.on('stream', handleStream)
server.on('listening', () => console.log('Server Up', server.address()))
server.on('close', () => {
	console.log()
	console.log('End of Line.')
})

const controller = new AbortController()
const signal = controller.signal

server.listen({
	ipv6Only: IPV6_ONLY,
	port: PORT,
	host: HOST,
	signal
})

process.on('SIGINT', () => {
	if(signal.aborted) { process.exit() }
	controller.abort('sigint')
})