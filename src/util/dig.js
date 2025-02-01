export const GET = Symbol.for('GET')
export const POST = Symbol.for('POST')
export const PUT = Symbol.for('PUT')
export const PATCH = Symbol.for('PATCH')
export const DELETE = Symbol.for('DELETE')
export const METHODS = [ GET, POST, PUT, PATCH, DELETE ]

export const MATCH = Symbol.for('MATCH')
export const NAME = Symbol.for('NAME')
export const METADATA = Symbol.for('METADATA')


export function _dig(route, key, keys, matches) {
	const next = route[key] ?? route[MATCH]
	if(next === undefined) { throw new Error(`dig: no route "${key}"`) }

	const name = next[NAME]
	if(name !== undefined) { matches.set(name, key) }

	const [ nextKey, ...rest ] = keys
	if(nextKey === undefined) { return next }
	return _dig(next, nextKey, rest, matches)
}

export function dig(routes, method, path) {
	const matches = new Map()
	const [ key, ...keys ] = path.substring(1).split('/')
	const leaf = _dig(routes, key, keys, matches)
	const handler = leaf[Symbol.for(method)]
	if(handler === undefined) { throw new Error(`dig: no method "${method}"`) }

	const metadata = leaf[METADATA] ?? {}

	return {
		handler,
		matches,
		metadata
	}
}

export function digOptions(routes, path) {
	const matches = new Map()
	const [ key, ...keys ] = path.substring(1).split('/')
	const leaf = _dig(routes, key, keys, matches)
	return METHODS.filter(method => leaf[method] !== undefined)
		.map(sym => Symbol.keyFor(sym))
		.filter(str => str !== undefined)
}
