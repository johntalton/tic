import http2 from 'node:http2'
import fs from 'node:fs/promises'
import tls from 'node:tls'

const {
	SSL_OP_NO_TLSv1,
	SSL_OP_NO_TLSv1_1
} = http2.constants

import { handleStream } from './handle-stream.js'

const HOST = process.env.HOST
const PORT = process.env.PORT ?? 8443
const IPV6_ONLY = process.env.IPV6_ONLY ?? false

async function fsCreds(host) {
	// openssl req -x509 -newkey rsa:2048 -nodes -sha256 -subj '/CN=localhost' -keyout localhost-privkey.pem -out localhost-cert.pem
	const key = await fs.readFile(`${host}-privkey.pem`, 'utf-8')
	const cert = await fs.readFile(`${host}-cert.pem`, 'utf-8')

	// fs.watch(keyName, { encoding: 'utf-8', signal })
	// fs.watch(cert, { encoding: 'utf-8', signal })

	return { key, cert }
}

const credentialsMap = new Map()
credentialsMap.set('localhost', await fsCreds('localhost'))
credentialsMap.set('next.local', await fsCreds('next.local'))
// credentialsMap.set('www.next.local', await fsCreds('next.local'))

const options = {
	allowHTTP1: false,
	// origins: [],
	secureOptions: SSL_OP_NO_TLSv1 | SSL_OP_NO_TLSv1_1,
	// ...await fsCreds(),

	// SNICallback: (serverName, callback) => {
	// 	console.log('SNI callback', serverName)
	// 	const url = new URL(serverName)

	// 	callback(null, tls.createSecureContext(localhostCredentials))
	// }
}

const server = http2.createSecureServer(options)

server.addContext('localhost', credentialsMap.get('localhost'))
server.addContext('next.local', credentialsMap.get('next.local'))
// server.addContext('www.next.local', credentialsMap.get('www.next.local'))

server.setTimeout(2 * 1000)
// server.timeout = 2 * 1000
// server.headersTimeout = 2 * 1000
// server.requestTimeout = 2 * 1000
// server.keepAliveTimeout = 2 * 1000
server.on('timeout', () => console.warn('server level timeout'))
server.on('tlsClientError', (error, socket) => console.log('TLS Error', socket.servername, socket.remoteAddress, error.code))
server.on('sessionError', error => console.warn('server session error', error))

server.on('stream', handleStream)

server.on('session', session => {
	console.log('New Session', session.alpnProtocol, session.originSet)
})

server.on('error', error => {
	console.warn('Server Error:', error)
	if (error.code === 'EADDRINUSE') {
		console.log('Address in use')
	}
	else {
		console.log(error.message)
	}
})

server.on('listening', () => {
	process.title = 'Tic Server'
	console.log('Server Up', server.address())
})

server.on('close', () => {
	console.log()
	console.log('end of line')
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