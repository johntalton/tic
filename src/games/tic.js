export const STATES = {
	NEW: 'new',
	PENDING: 'pending',
	ACTIVE: 'active',
	RESOLVED: 'resolved'
}

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
		[STATES.PENDING]: [ACTIONS.CLOSE],
		[STATES.ACTIVE]: [ACTIONS.CLOSE]
	},
	challenger: {
		[STATES.PENDING]: [ACTIONS.ACCEPT, ACTIONS.DECLINE],
		[STATES.ACTIVE]: [] // accept/decline - late to the game?
	},
	player: {
		[STATES.ACTIVE]: [ACTIONS.FORFEIT],
	},
	active: {
		[STATES.ACTIVE]: [ACTIONS.MOVE],
	}
}

export function isOwner(game, user) { return game.owner === user }
export function isPlayer(game, user) { return game.players?.includes(user) }
export function isChallenger(game, user) { return game.offers?.includes(user) }
export function isCurrentActivePlayer(game, user) { return game.active?.includes(user)  }
export function isViewable(game, user) {
	return isOwner(game, user)
		|| isChallenger(game, user)
		|| isPlayer(game, user)
		|| isCurrentActivePlayer(game, user)
}

export function roundRobinPlayer(game, user) {
	const currentIndex = game.players.indexOf(user)
	if(currentIndex < 0) { return [] }
	const nextIndex = (currentIndex + 1) % game.players.length
	return [ game.players[nextIndex] ]
}

export function randomPlayer(players) {
	const index = Math.round(Math.random() * (players.length - 1))
	return players[index]
}

export class Action {
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

const EMPTY = 0

export class Board {
	static emptyBoard() { return [
		EMPTY, EMPTY, EMPTY,
		EMPTY, EMPTY, EMPTY,
		EMPTY, EMPTY, EMPTY
	]}

	static isFull(board) { return !board.includes(EMPTY) }

	static isWin(board) { return Board.winner(board) !== EMPTY }

	static winner(board) {
		const winConditions = [
			[0, 1, 2],
			[3, 4, 5],
			[6, 7, 8],

			[0, 3, 6],
			[1, 4, 7],
			[2, 5, 8],

			[0, 4, 8],

			[2, 4, 6]
		]

		for(const condition of winConditions) {
			const [ a, b, c ] = condition.map(index => board[index])
			if(a !== EMPTY && a === b && b === c) { return a }
		}

		return EMPTY
	}

	static isDraw(board) {
		if(!Board.isFull(board)) { return false }
		return !Board.isWin(board)
	}

	static isResolved(board) { return Board.isFull(board) || Board.isWin(board) }
}

export class Tic {
	static actionable(game, user) {
		return {
			...game,
			actions: Action.for(game, user)
		}
	}

	//
	static create(user) {
		// console.log('Tic::create', user)

		const game = {
			id: `game:${user}-${Date.now()}`,
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
	static offer(game, user, offer) {
		// console.log('Tic::offer(owner)', game, user, offer)

		const { target, includeSelf } = offer

		if(!isOwner(game, user)) { return { ...game, message: 'not the owner' } }
		if(game.state !== STATES.NEW) { return { ...game, message: 'game not new' } }

		const players = includeSelf ? [ ...game.players, user ] : game.players
		const offers = [ ...game.offers, target ]

		return {
			...game,
			players,
			offers
		}
	}

	static close(game, user) {
		// console.log('Tic::close(owner)', game, user)

		if(!isOwner(game, user)) { return { ...game, message: 'not the owner' } }
		if(game.state === STATES.RESOLVED) { return { ...game, message: 'game already resolved' } }

		return {
			...game,
			state: STATES.RESOLVED,
			active: [],
			offers: []
		}
	}

	// player
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

	static forfeit(game, user) {
		// console.log('Tic::forfeit(player)', game, user)

		if(game.state !== STATES.ACTIVE) { return { ...game, message: 'inactive game' } }
		if(!isPlayer(game, user)) { return { ...game, message: 'not a player' } }
		// if(!isCurrentActivePlayer(game, user)) {}

		return {
			...game,
			state: STATES.RESOLVED,
			active: [],
			offers: []
		}
	}

	// challenger
	static accept(game, user) {
		// console.log('Tic::accept(challenger)', game, user)

		const NUM_PLAYERS_TO_ACTIVATE = 2

		if(!isChallenger(game, user)) { return { ...game, message: 'not a challenger' } }
		if(game.state !== STATES.PENDING) { return { ...game, message: 'not a pending game' } }

		const offers = game.offers.filter(offer => offer !== user)
		const players = [ ...game.players, user ]
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

	static decline(game, user) {
		// console.log('Tic::decline(challenger)', game, user)

		if(!isChallenger(game, user)) { return { ...game, message: 'not a challenger' } }

		const offers = game.offers.filter(offer => offer !== user)
		const state = offers.length === 0 ? STATES.RESOLVED : game.state

		return {
			...game,
			state,
			offers
		}
	}
}