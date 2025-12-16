/**
 * @typedef {[
 * string|EMPTY, string|EMPTY, string|EMPTY,
 * string|EMPTY, string|EMPTY, string|EMPTY,
 * string|EMPTY, string|EMPTY, string|EMPTY
 * ]} GameBoard
 */

/**
 * @typedef {Object} Game
 * @property {STATES} state
 * @property {string} owner
 * @property {Array<string>} players
 * @property {Array<string>} offers
 * @property {Array<string>} active
 *
 * @property {GameBoard} board
 *
 * @property {string} [message]
 * @property {string} [reason]
 */

/**
 * @typedef {Object} OfferMulti
 * @property {Array<string>} targets
 */

/**
 * @typedef {Object} OfferSingle
 * @property {string} target
 */

/**
 * @typedef {OfferSingle | OfferMulti} Offer
 */

/**
 * @typedef {Object} Move
 * @property {number} position
 */

/**
 * @typedef {Object} Winner
 * @property {string|EMPTY} user
 * @property {string} [name]
 */

/**
 * @typedef {Object} Resolution
 * @property {boolean} full
 * @property {boolean} resolved
 * @property {boolean} draw
 * @property {boolean} win
 * @property {Winner} winner
 */

/**
 * @typedef {Game & { resolution: Resolution, actions: Array<ACTIONS> }} ActionableGame
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
 * @param {Game} game
 * @param {string} user
 */
export function isOwner(game, user) { return game.owner === user }
/**
 * @param {Game} game
 * @param {string} user
 */
export function isPlayer(game, user) { return game.players?.includes(user) }
/**
 * @param {Game} game
 * @param {string} user
 */
export function isChallenger(game, user) { return game.offers?.includes(user) }
/**
 * @param {Game} game
 * @param {string} user
 */
export function isCurrentActivePlayer(game, user) { return game.active?.includes(user)  }
/**
 * @param {Game} game
 * @param {string} user
 */
export function isViewable(game, user) {
	return isOwner(game, user)
		|| isChallenger(game, user)
		|| isPlayer(game, user)
		|| isCurrentActivePlayer(game, user)
}

/**
 * @param {Game} game
 * @param {string} user
 */
export function roundRobinPlayer(game, user) {
	const currentIndex = game.players.indexOf(user)
	if(currentIndex < 0) { return [] }
	const nextIndex = (currentIndex + 1) % game.players.length
	return [ game.players[nextIndex] ]
}

/**
 * @param {Array<string>} players
 */
export function randomPlayer(players) {
	const index = Math.round(Math.random() * (players.length - 1))
	return players[index]
}

export class Action {
	/**
	 * @param {Game} game
	 * @param {string} user
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
	/** @returns {GameBoard} */
	static emptyBoard() { return [
		EMPTY, EMPTY, EMPTY,
		EMPTY, EMPTY, EMPTY,
		EMPTY, EMPTY, EMPTY
	]}

	/**
	 * @param {GameBoard} board
	 * @returns {Winner}
	 */
	static winner(board) {
		for(const { name, condition } of WIN_CONDITIONS) {
			const [ a, b, c ] = condition.map(index => board[index])
			if(a !== EMPTY && a === b && b === c) { return { name, user: a } }
		}

		return { user: EMPTY }
	}

	/** @param {GameBoard} board  */
	static isFull(board) { return !board.includes(EMPTY) }

	/**
	 * @param {Winner} winner
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

	/** @param {GameBoard} board  */
	static isWin(board) { return Board.#isWin(Board.winner(board)) }

	/** @param {GameBoard} board  */
	static isDraw(board) { return Board.#isDraw(Board.isFull(board), Board.isWin(board)) }

	/** @param {GameBoard} board  */
	static isResolved(board) { return Board.#isResolved(Board.isFull(board), Board.isWin(board)) }

	/**
	 * @param {GameBoard} board
	 * @returns {Resolution}
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
	 * @param {Game} game
	 * @param {string} user
	 * @returns {ActionableGame}
	 */
	static actionable(game, user) {
		return {
			...game,
			resolution: Board.resolution(game.board),
			actions: Action.for(game, user)
		}
	}

	/**
	 * @param {string} user
	 * @returns {Game}
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
	 * @param {Game} game
	 * @param {string} user
	 * @param {Offer} offer
	 * @returns {Game}
	 */
	static offer(game, user, offer) {
		// console.log('Tic::offer(owner)', game, user, offer)

		const { targets: targetsMaybe, target } = offer
		const targets = targetsMaybe ?? [ target ]
		if(targets.length <= 0) { return { ...game, message: 'no target(s) in offer' }}

		if(!isOwner(game, user)) { return { ...game, message: 'not the owner' } }
		if(game.state !== STATES.NEW && game.state !== STATES.PENDING) { return { ...game, message: 'game not offerable' } }

		// unique offer without any existing players
		const offers = new Set([ ...game.offers, ...targets ])
			.difference(new Set(game.players))
			.values()
			.toArray()

		const state = STATES.PENDING

		return {
			...game,
			state,
			offers
		}
	}

	/**
	 * @param {Game} game
	 * @param {string} user
	 * @param {string} reason
	 * @returns {Game}
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
	 * @param {Game} game
	 * @param {string} user
	 * @param {Move} move
	 * @returns {Game}
	 */
	static move(game, user, move) {
		// console.log('Tic::move(player)', game, user, move)

		const { position } = move

		if(game.state !== STATES.ACTIVE) { return { ...game, message: 'inactive game' } }
		if(!isPlayer(game, user)) { return { ...game, message: 'not a player' } }
		if(!isCurrentActivePlayer(game, user)) { return { ...game, message: 'not current player' } }

		if(game.board[position] !== EMPTY) { return { ...game, message: 'invalid move' } }

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
	 * @param {Game} game
	 * @param {string} user
	 * @returns {Game}
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
	 * @param {Game} game
	 * @param {string} user
	 * @returns {Game}
	 */
	static accept(game, user) {
		// console.log('Tic::accept(challenger)', game, user)

		const NUM_PLAYERS_TO_ACTIVATE = 2

		if(!isChallenger(game, user)) { return { ...game, message: 'not a challenger' } }
		if(game.state !== STATES.PENDING) { return { ...game, message: 'not a pending game' } }

		const offers = game.offers.filter(offer => offer !== user)
		const players = new Set([ ...game.players, user ]).values().toArray()
		const state = players.length === NUM_PLAYERS_TO_ACTIVATE ? STATES.ACTIVE : game.state
		const active = state === STATES.ACTIVE ? [ randomPlayer(players) ]  : []

		return {
			...game,
			state,
			offers,
			players,
			active
		}
	}

	/**
	 * @param {Game} game
	 * @param {string} user
	 * @returns {Game}
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