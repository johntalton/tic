/** biome-ignore-all lint/nursery/noExcessiveClassesPerFile: action helper */
/** biome-ignore-all lint/nursery/noExcessiveLinesPerFile: complex */
import { BoardFactory } from './boards/boards.js'

/** @import { BoardType } from './boards/boards.js' */

export const EMPTY = 0

/**
 * @template U
 * @typedef {Array<U|EMPTY>} GameBoard
 */

/**
 * @template U
 * @typedef {Object} Game
 * @property {STATES} state
 * @property {BoardType|undefined} [type]
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

export const USER_STATE_ACTIONS = {
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

export class GameManager {
	/**
	 * @template U
	 * @param {Game<U>} game
	 * @param {U} user
	 * @returns {ActionableGame<U>}
	 */
	static actionable(game, user) {
		return {
			...game,
			resolution: BoardFactory.resolution(game.type, game.board),
			actions: Action.for(game, user)
		}
	}

	/**
	 * @template U
	 * @param {U} user
	 * @param {BoardType} type
	 * @returns {Game<U>}
	 */
	static create(user, type) {
		// console.log('Tic::create', user)

		return {
			state: STATES.NEW,
			type,

			owner: user,
			players: [],
			offers: [],
			active: [],

			board: BoardFactory.emptyBoard(type)
		}
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
			.filter(o => o !== undefined)

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

		if(game.state !== STATES.ACTIVE) { return { ...game, message: 'inactive game' } }
		if(!isPlayer(game, user)) { return { ...game, message: 'not a player' } }
		if(!isCurrentActivePlayer(game, user)) { return { ...game, message: 'not current player' } }

		if(!BoardFactory.isValidMove(game.type, game.board, user, move)) { return { ...game, message: 'invalid move' } }

		const updatedBoard = BoardFactory.move(game.type, game.board, user, move)
		const resolved = BoardFactory.isResolved(game.type, updatedBoard)

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

		const updatedBoard = (state === STATES.ACTIVE) ? BoardFactory.openingLayout(game.type, game.board, players) : game.board

		return {
			...game,
			state,
			offers,
			players,
			active,
			board: updatedBoard
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