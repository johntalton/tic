export const TIMING = {
	TOKEN: 'token',
	ELO: 'elo',
	RESOLVE: 'resolve',

	GAME_ACCEPT: 'set',
	GAME_CLOSE: 'set',
	GAME_DECLINE: 'set',
	GAME_FORFEIT: 'set',
	GAME_MOVE: 'set',
	GAME_OFFER: 'set',

	GAME_CREATE: 'set',
	GAME_LIST: 'list',

	FRIENDS_ALTER_GET: 'get',
	FRIENDS_ALTER_SET: 'set',

	FRIENDS_GET: 'get',
	FRIENDS_LIST: 'list',

	USER_GET: 'get',
	USER_LIST: 'list',
	USER_PATCH_GET: 'get',
	USER_PATCH_SET: 'set',
	USER_SELF: 'self'
}


/**
 * @template T
 * @param {string} name
 * @param {Array<any>} target
 * @param {() => T} cb
 * @returns {Promise<T>}
 */
 export async function timed(name, target, cb) {
	using _timer = new DisposableTimer(name, target)
	return await Promise.try(cb) // await here otherwise timer disposed early
}

export class DisposableTimer {
	#target
	#name
	#start

	/**
	 * @param {string} name
	 * @param {Array<any>} target
	 */
	constructor(name, target) {
		this.#target = target
		this.#name = name
		this.#start = performance.now()
	}

	[Symbol.dispose]() {
		this.#target.push({
			name: this.#name,
			duration: performance.now() - this.#start
		})
	}
}