/**
 * @template U
 * @typedef { readonly [
 * U|EMPTY, U|EMPTY, U|EMPTY,
 * U|EMPTY, U|EMPTY, U|EMPTY,
 * U|EMPTY, U|EMPTY, U|EMPTY
 * ]} GameBoard
 */

/**
 * @template U
 * @typedef {Object} Game
 * @property {STATES} state
 * @property {U} owner
 * @property {Array<U>} players
 * @property {Array<U>} offers
 * @property {Array<U>} active
 *
 * @property {GameBoard<U>} board
 *
 * @property {string} [message]
 * @property {string} [reason]
 */


/**
 * @template U
 * @typedef {Object} Offer
 * @property {Array<U>} targets
 */

/**
 * @typedef {Object} Move
 * @property {number} position
 */

/**
 * @template U
 * @typedef {Object} Winner
 * @property {U|EMPTY} user
 * @property {string} [name]
 */

/**
 * @template U
 * @typedef {Object} Resolution
 * @property {boolean} full
 * @property {boolean} resolved
 * @property {boolean} draw
 * @property {boolean} win
 * @property {Winner<U>} winner
 */

/**
 * @template U
 * @typedef {Game<U> & { resolution: Resolution<U>, actions: Array<ACTIONS> }} ActionableGame
 */

/** @enum {string} */
export const STATES = {
	NEW: 'new',
	PENDING: 'pending',
	ACTIVE: 'active',
	RESOLVED: 'resolved'
}

/** @enum {string} */
export const ACTIONS = {
	ACCEPT: 'Accept',
	DECLINE: 'Decline',
	FORFEIT: 'Forfeit',
	CLOSE: 'Close',
	MOVE: 'Move',
	OFFER: 'Offer',
}

const USER_STATE_ACTIONS = {
	owner: {
		[STATES.NEW]: [ACTIONS.CLOSE, ACTIONS.OFFER],
		[STATES.PENDING]: [ACTIONS.CLOSE, ACTIONS.OFFER],
		[STATES.ACTIVE]: [ACTIONS.CLOSE]
	},
	challenger: {
		[STATES.PENDING]: [ACTIONS.ACCEPT, ACTIONS.DECLINE],
		[STATES.ACTIVE]: [] // accept/decline - late to the game?
	},
	player: {
		[STATES.ACTIVE]: [ACTIONS.FORFEIT],
		// [STATES.PENDING]: [ACTIONS.DECLINE], // changed your mind?
	},
	active: {
		[STATES.ACTIVE]: [ACTIONS.MOVE],
	}
}

/**
 * @template U
 * @param {Game<U>} game
 * @param {U} user
 */
export function isOwner(game, user) { return game.owner === user }
/**
 * @template U
 * @param {Game<U>} game
 * @param {U} user
 */
export function isPlayer(game, user) { return game.players?.includes(user) }
/**
 * @template U
 * @param {Game<U>} game
 * @param {U} user
 */
export function isChallenger(game, user) { return game.offers?.includes(user) }
/**
 * @template U
 * @param {Game<U>} game
 * @param {U} user
 */
export function isCurrentActivePlayer(game, user) { return game.active?.includes(user)  }
/**
 * @template U
 * @param {Game<U>} game
 * @param {U} user
 */
export function isViewable(game, user) {
	return isOwner(game, user)
		|| isChallenger(game, user)
		|| isPlayer(game, user)
		|| isCurrentActivePlayer(game, user)
}

/**
 * @template U
 * @param {Game<U>} game
 * @param {U} user
 * @returns {Array<U>}
 */
export function roundRobinPlayer(game, user) {
	const currentIndex = game.players.indexOf(user)
	if(currentIndex < 0) { return [] }
	const nextIndex = (currentIndex + 1) % game.players.length
	const player = game.players[nextIndex]
	if(player === undefined) { return [] }
	return [ player ]
}

/**
 * @template U
 * @param {Array<U>} players
 * @returns {Array<U>}
 */
export function randomPlayer(players) {
	if(players.length <= 0) { return [] }
	const index = Math.round(Math.random() * (players.length - 1))
	if(players[index] === undefined) { return [] }
	return [ players[index] ]
}

export class Action {
	/**
	 * @template U
	 * @param {Game<U>} game
	 * @param {U} user
	 * @returns {Array<ACTIONS>}
	 */
	static for(game, user) {
		const { state } = game
		if (state === undefined) { return [] }

		const o = isOwner(game, user) ? USER_STATE_ACTIONS.owner[state] ?? [] : []
		const p = isPlayer(game, user) ? USER_STATE_ACTIONS.player[state] ?? [] : []
		const c = isChallenger(game, user) ? USER_STATE_ACTIONS.challenger[state] ?? [] : []
		const a = isCurrentActivePlayer(game, user) ? USER_STATE_ACTIONS.active[state] ?? [] : []

		return [...new Set([...o, ...p, ...c, ...a])]
	}
}

export const EMPTY = 0

export const WIN_CONDITIONS = [
	{ name: 'row0', condition: [0, 1, 2] },
	{ name: 'row1', condition: [3, 4, 5] },
	{ name: 'row2', condition: [6, 7, 8] },

	{ name: 'col0', condition: [0, 3, 6] },
	{ name: 'col1', condition: [1, 4, 7] },
	{ name: 'col2', condition: [2, 5, 8] },

	{ name: 'backSlash', condition: [0, 4, 8] },

	{ name: 'forwardSlash', condition: [2, 4, 6] }
]

export class Board {
	/**
	 * @template U
	 * @returns {GameBoard<U>}
	 */
	static emptyBoard() { return [
		EMPTY, EMPTY, EMPTY,
		EMPTY, EMPTY, EMPTY,
		EMPTY, EMPTY, EMPTY
	]}

	/**
	 * @template U
	 * @param {GameBoard<U>} board
	 * @returns {Winner<U>}
	 */
	static winner(board) {
		for(const { name, condition } of WIN_CONDITIONS) {
			const [ a, b, c ] = condition.map(index => board[index])
			if(a !== undefined && a !== EMPTY && a === b && b === c) {
				return { name, user: a }
			}
		}

		return { user: EMPTY }
	}

	/**
	 * @template U
	 * @param {GameBoard<U>} board
	 */
	static isFull(board) { return !board.includes(EMPTY) }

	/**
	 * @template U
	 * @param {Winner<U>} winner
	 */
	static #isWin(winner) { return winner.user !== EMPTY }

	/**
	 * @param {boolean} full
	 * @param {boolean} win
	 */
	static #isDraw(full, win) { return full && !win }

	/**
	 * @param {boolean} full
	 * @param {boolean} win
	 */
	static #isResolved(full, win) { return full || win }

	/**
	 * @template U
	 * @param {GameBoard<U>} board
	 */
	static isWin(board) { return Board.#isWin(Board.winner(board)) }

	/**
	 * @template U
	 * @param {GameBoard<U>} board
	 */
	static isDraw(board) { return Board.#isDraw(Board.isFull(board), Board.isWin(board)) }

	/**
	 * @template U
	 * @param {GameBoard<U>} board
	 */
	static isResolved(board) { return Board.#isResolved(Board.isFull(board), Board.isWin(board)) }

	/**
	 * @template U
	 * @param {GameBoard<U>} board
	 * @returns {Resolution<U>}
	 */
	static resolution(board) {
		const winner = Board.winner(board)
		const full = Board.isFull(board)
		const win = Board.#isWin(winner)
		const draw = Board.#isDraw(full, win)
		const resolved = Board.#isResolved(full, win)

		return {
			full,
			resolved,
			draw,
			win,
			winner
		}
	}
}

export class Tic {
	/**
	 * @template U
	 * @param {Game<U>} game
	 * @param {U} user
	 * @returns {ActionableGame<U>}
	 */
	static actionable(game, user) {
		return {
			...game,
			resolution: Board.resolution(game.board),
			actions: Action.for(game, user)
		}
	}

	/**
	 * @template U
	 * @param {U} user
	 * @returns {Game<U>}
	 */
	static create(user) {
		// console.log('Tic::create', user)

		const game = {
			state: STATES.NEW,

			owner: user,
			players: [],
			offers: [],
			active: [],

			board: Board.emptyBoard()
		}

		return game
	}

	// owner

	/**
	 * @template U
	 * @param {Game<U>} game
	 * @param {U} user
	 * @param {Offer<U>} offer
	 * @returns {Game<U>}
	 */
	static offer(game, user, offer) {
		// console.log('Tic::offer(owner)', game, user, offer)

		const { targets } = offer
		if(targets.length <= 0) { return { ...game, message: 'no target(s) in offer' }}

		if(!isOwner(game, user)) { return { ...game, message: 'not the owner' } }
		if(game.state !== STATES.NEW && game.state !== STATES.PENDING) { return { ...game, message: 'game not offerable' } }

		// unique offer without any existing players
		const offers = new Set([ ...game.offers, ...targets ])
			.difference(new Set(game.players))
			.values()
			.toArray()
			.filter(offer => offer !== undefined)

		const state = STATES.PENDING

		return {
			...game,
			state,
			offers
		}
	}

	/**
	 * @template U
	 * @param {Game<U>} game
	 * @param {U} user
	 * @param {string} reason
	 * @returns {Game<U>}
	 */
	static close(game, user, reason) {
		// console.log('Tic::close(owner)', game, user)

		if(!isOwner(game, user)) { return { ...game, message: 'not the owner' } }
		if(game.state === STATES.RESOLVED) { return { ...game, message: 'game already resolved' } }

		return {
			...game,
			state: STATES.RESOLVED,
			active: [],
			offers: [],
			reason
		}
	}

	// player

	/**
	 * @template U
	 * @param {Game<U>} game
	 * @param {U} user
	 * @param {Move} move
	 * @returns {Game<U>}
	 */
	static move(game, user, move) {
		// console.log('Tic::move(player)', game, user, move)

		const { position } = move

		if(game.state !== STATES.ACTIVE) { return { ...game, message: 'inactive game' } }
		if(!isPlayer(game, user)) { return { ...game, message: 'not a player' } }
		if(!isCurrentActivePlayer(game, user)) { return { ...game, message: 'not current player' } }

		if(game.board[position] !== EMPTY) { return { ...game, message: 'invalid move' } }

		/** @type {GameBoard<U>} */
		// @ts-ignore
		const updatedBoard = game.board.with(position, user)
		const resolved = Board.isResolved(updatedBoard)

		const state = resolved ? STATES.RESOLVED : game.state
		const offers = resolved ? [] : game.offers
		const active = resolved ? [] : roundRobinPlayer(game, user)

		return {
			...game,
			state,
			active,
			offers,
			board: updatedBoard
		}
	}

	/**
	 * @template U
	 * @param {Game<U>} game
	 * @param {U} user
	 * @returns {Game<U>}
	 */
	static forfeit(game, user) {
		// console.log('Tic::forfeit(player)', game, user)

		if(game.state !== STATES.ACTIVE) { return { ...game, message: 'inactive game' } }
		if(!isPlayer(game, user)) { return { ...game, message: 'not a player' } }
		// if(!isCurrentActivePlayer(game, user)) {}

		return {
			...game,
			state: STATES.RESOLVED,
			active: [],
			offers: [],
			// forfeit: user
		}
	}

	// challenger

	/**
	 * @template U
	 * @param {Game<U>} game
	 * @param {U} user
	 * @returns {Game<U>}
	 */
	static accept(game, user) {
		// console.log('Tic::accept(challenger)', game, user)

		const NUM_PLAYERS_TO_ACTIVATE = 2

		if(!isChallenger(game, user)) { return { ...game, message: 'not a challenger' } }
		if(game.state !== STATES.PENDING) { return { ...game, message: 'not a pending game' } }

		const offers = game.offers.filter(offer => offer !== user)
		const players = new Set([ ...game.players, user ]).values().toArray()
		const state = players.length === NUM_PLAYERS_TO_ACTIVATE ? STATES.ACTIVE : game.state
		const active = state === STATES.ACTIVE ? randomPlayer(players) : []

		return {
			...game,
			state,
			offers,
			players,
			active
		}
	}

	/**
	 * @template U
	 * @param {Game<U>} game
	 * @param {U} user
	 * @returns {Game<U>}
	 */
	static decline(game, user) {
		// console.log('Tic::decline(challenger)', game, user)

		if(!isChallenger(game, user)) { return { ...game, message: 'not a challenger' } }

		const offers = game.offers.filter(offer => offer !== user)
		const state = ((offers.length === 0) && (game.state !== STATES.ACTIVE)) ? STATES.RESOLVED : game.state

		return {
			...game,
			state,
			offers
		}
	}
}