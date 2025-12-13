export const GET = Symbol.for('GET')
export const POST = Symbol.for('POST')
export const PUT = Symbol.for('PUT')
export const PATCH = Symbol.for('PATCH')
export const DELETE = Symbol.for('DELETE')
export const METHODS = [ GET, POST, PUT, PATCH, DELETE ]

export const MATCH = Symbol.for('MATCH')
export const NAME = Symbol.for('NAME')
export const METADATA = Symbol.for('METADATA')

/**
 * @import { ServerHttp2Stream } from 'node:http2'
 */

/**
 * @import { BodyFuture } from './body.js'
 */


/**
 * @typedef { (matches: Map<string, string>, user: { token: string }, body: BodyFuture, query: URLSearchParams, stream: ServerHttp2Stream) => Promise<any> } HandlerFn
 */

/**
 * @typedef {{ [key:string|symbol]: RouteDefinition|HandlerFn|string }} RouteDefinition
 */

/**
 * @typedef {Object} DigResult
 * @property {HandlerFn} handler
 * @property {Map<string, string>} matches
 * @property {Object} metadata
 */

/**
 * @param {RouteDefinition} route
 * @param {string} key
 * @param {Array<string>} keys
 * @param {Map<string, string>} matches
 */
export function _dig(route, key, keys, matches) {
	const next = route[key] ?? route[MATCH]
	if(next === undefined) { return undefined }

	const name = next[NAME]
	if(name !== undefined) { matches.set(name, key) }

	const [ nextKey, ...rest ] = keys
	if(nextKey === undefined) { return next }
	return _dig(next, nextKey, rest, matches)
}

/**
 * @param {RouteDefinition} routes
 * @param {string} method
 * @param {string} path
 * @returns {DigResult}
 */
export function dig(routes, method, path) {
	const matches = new Map()
	const [ key, ...keys ] = path.substring(1).split('/')
	const leaf = _dig(routes, key, keys, matches)
	if(leaf === undefined) { throw new Error(`dig: no route @ "${path}"`) }
 	const handler = leaf[Symbol.for(method)]
	if(handler === undefined) { throw new Error(`dig: no method "${method}" @ "${path}"`) }

	const metadata = leaf[METADATA] ?? {}

	return {
		handler,
		matches,
		metadata
	}
}

/**
 * @param {RouteDefinition} routes
 * @param {string} path
 */
export function digOptions(routes, path) {
	const matches = new Map()
	const [ key, ...keys ] = path.substring(1).split('/')
	const leaf = _dig(routes, key, keys, matches)
	return METHODS.filter(method => leaf[method] !== undefined)
		.map(sym => Symbol.keyFor(sym))
		.filter(str => str !== undefined)
}
