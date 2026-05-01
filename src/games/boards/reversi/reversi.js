import { EMPTY } from '../../game.js'

/** @import { GameBoard, Game, Move, Winner, Resolution } from '../../game.js' */

const BOARD_DIMENSION = 8

/**
 * @param {number} start
 * @param {boolean} forward
 */
function *positionHorizontal(start, forward) {
	const row = Math.trunc(start / BOARD_DIMENSION)
	const begin = row * BOARD_DIMENSION
	const end = (row + 1) * BOARD_DIMENSION

	const step = forward ? 1 : -1

	for(let p = start + step; p >= begin && p < end; p += step) {
		yield p
	}
}

/**
 * @param {number} start
 * @param {boolean} forward
 */
function *positionVertical(start, forward) {
	const col = start % BOARD_DIMENSION
	const begin = col
	const end = (BOARD_DIMENSION * (BOARD_DIMENSION - 1)) + col + 1

	const step = forward ? BOARD_DIMENSION : -BOARD_DIMENSION

	for(let p = start + step; p >= begin && p < end; p += step) {
		yield p
	}
}

/**
 * @param {number} start
 * @param {number} col
 * @param {number} row
 * @param {boolean} down
 */
function diagonalBeginEnd(start, col, row, down) {
	if(down) {
		const step = BOARD_DIMENSION + 1
		return {
			begin: start - (step * Math.min(col, row)),
			end: start + (step * (Math.min(BOARD_DIMENSION - col, BOARD_DIMENSION - row) - 1)) + 1
		}
	}

	const step = BOARD_DIMENSION - 1
	return {
		begin: start - (step * Math.min(BOARD_DIMENSION - col - 1, row)),
		end: start + (step * Math.min(col, BOARD_DIMENSION - row - 1)) + 1
	}
}

/**
 * @param {number} start
 * @param {boolean} down
 * @param {boolean} forward
 */
function *positionDiagonal(start, down, forward) {
	const row = Math.trunc(start / BOARD_DIMENSION)
	const col = start % BOARD_DIMENSION

	const { begin, end } = diagonalBeginEnd(start, col, row, down)

	const step = ((forward === down) ? 1 : -1) * (down ? (BOARD_DIMENSION + 1) : (BOARD_DIMENSION - 1))

	for(let p = start + step; p >= begin && p < end; p += step) {
		yield p
	}
}

export class Reversi {
	/**
	 * @template U
	 * @returns {GameBoard<U>}
	 */
	static emptyBoard() {
		return [
			EMPTY, EMPTY, EMPTY, EMPTY, EMPTY, EMPTY, EMPTY, EMPTY,
			EMPTY, EMPTY, EMPTY, EMPTY, EMPTY, EMPTY, EMPTY, EMPTY,
			EMPTY, EMPTY, EMPTY, EMPTY, EMPTY, EMPTY, EMPTY, EMPTY,
			EMPTY, EMPTY, EMPTY, EMPTY, EMPTY, EMPTY, EMPTY, EMPTY,
			EMPTY, EMPTY, EMPTY, EMPTY, EMPTY, EMPTY, EMPTY, EMPTY,
			EMPTY, EMPTY, EMPTY, EMPTY, EMPTY, EMPTY, EMPTY, EMPTY,
			EMPTY, EMPTY, EMPTY, EMPTY, EMPTY, EMPTY, EMPTY, EMPTY,
			EMPTY, EMPTY, EMPTY, EMPTY, EMPTY, EMPTY, EMPTY, EMPTY
		]
	}

	/**
	 * @template U
	 * @param {GameBoard<U>} board
	 * @param {Array<U>} users
	 */
	static openingLayout(board, users) {
		const [ black, white ] = users

		if(white === undefined) { throw new Error('undefined player') }
		if(black === undefined) { throw new Error('undefined player') }

		const updatedBoard = Array.from(board)

		updatedBoard[27] = black
		updatedBoard[28] = white
		updatedBoard[35] = white
		updatedBoard[36] = black

		return updatedBoard
	}

	/**
	 * @template U
	 * @param {GameBoard<U>} board
	 */
	static #isFull(board) {
		return !board.includes(EMPTY)
	}

	/**
	 * @template U
	 * @param {boolean} full
	 * @param {boolean} draw
	 * @param {boolean} terminal
	 * @param {Map<U, number>} counts
	 * @returns {Winner<U>}
	 */
	static #winner(full, draw, terminal, counts) {
		if(!(full || terminal)) { return { user: EMPTY } }
		if(draw) { return { user: EMPTY } }

		const largest = counts.entries().reduce((acc, value) => acc[1] > value[1] ? acc : value)
		return { user: largest[0] }
	}

	/**
	 * @template U
	 * @param {GameBoard<U>} board
	 */
	static #isTerminal(board) {
		const users = new Set(board)
		for(const user of users) {
			const userMoves = Reversi.validMoves(board, user)
			if(userMoves.length > 0) { return false }
		}

		return true
	}

	/**
	 * @template U
	 * @param {Winner<U>} winner
	 */
	static #isWin(winner) {
		return winner.user !== EMPTY
	}

		/**
	 * @param {boolean} full
	 * @param {boolean} win
	 * @param {boolean} draw
	 * @param {boolean} terminal
	 */
	static #isResolved(full, win, draw, terminal) { return full || win || draw || terminal }

	/**
	 * @template U
	 * @param {boolean} full
	 * @param {boolean} terminal
	 * @param {Map<U, number>} counts
	 */
	static #isDraw(full, terminal, counts) {
		const uniqueCounts = new Set(counts.values())
		const countsEqual = uniqueCounts.size <= 1

		return (full || terminal) && countsEqual
	}

	/**
	 * @template U
	 * @param {GameBoard<U>} board
	 */
	static isResolved(board) {
		const { resolved } = Reversi.resolution(board)
		return resolved
	}

	/**
	 * @template U
	 * @param {GameBoard<U>} board
	 * @returns {Resolution<U>}
	 */
	static resolution(board) {
		const full = Reversi.#isFull(board)
		const terminal = Reversi.#isTerminal(board)

		const counts = Reversi.counts(board)

		const draw = Reversi.#isDraw(full, terminal, counts)

		const winner = Reversi.#winner(full, draw, terminal, counts)
		const win = Reversi.#isWin(winner)

		const resolved = Reversi.#isResolved(full, win, draw, terminal)

		return {
			full,
			resolved,
			draw,
			win,
			winner
		}
	}

	/**
	 * @template U
	 * @param {Iterable<{ position: number, value: U }>} run
	 * @param {U} user
	 */
	static #checkRun(run, user) {
		const result = []

		for(const { position, value } of run) {
			if(value === EMPTY) { return [] }
			if(value === user) { return result }
			result.push(position)
		}

		return []
	}

	/**
	 * @template U
	 * @param {GameBoard<U>} board
	 * @param {U} user
	 * @param {Move} move
	 */
	static #checkRuns(board, user, move) {
		const { position } = move

		const posAndValue = (/** @type {number} */ pos) => ({ position: pos, value: board[pos] })

		const north = Reversi.#checkRun(positionVertical(position, false).map(posAndValue), user)
		const east = Reversi.#checkRun(positionHorizontal(position, true).map(posAndValue), user)
		const south = Reversi.#checkRun(positionVertical(position, true).map(posAndValue), user)
		const west = Reversi.#checkRun(positionHorizontal(position, false).map(posAndValue), user)

		const northEast = Reversi.#checkRun(positionDiagonal(position, false, true).map(posAndValue), user)
		const southEast = Reversi.#checkRun(positionDiagonal(position, true, true).map(posAndValue), user)
		const southWest = Reversi.#checkRun(positionDiagonal(position, false, false).map(posAndValue), user)
		const northWest = Reversi.#checkRun(positionDiagonal(position, true, false).map(posAndValue), user)

		return {
			north, east, south, west,
			northEast, southEast, northWest, southWest
		}
	}

	/**
	 * @template U
	 * @param {GameBoard<U>} board
	 * @param {U} user
	 * @param {Move} move
	 */
	static isValidMove(board, user, move) {
		const { position } = move

		if(board[position] !== EMPTY) { return false }

		const {
			north, east, south, west,
			northEast, southEast, northWest, southWest
		} = Reversi.#checkRuns(board, user, move)

		if(north.length > 0) { return true }
		if(east.length > 0) { return true }
		if(south.length > 0) { return true }
		if(west.length > 0) { return true }

		if(northEast.length > 0) { return true }
		if(southEast.length > 0) { return true }
		if(southWest.length > 0) { return true }
		if(northWest.length > 0) { return true }

		return false
	}

	/**
	 * @template U
	 * @param {GameBoard<U>} board
	 * @returns {Map<U, number>}
	 */
	static counts(board) {
		const result = new Map()

		for(const user of board) {
			if(user === EMPTY) { continue }
			const cnt = result.get(user) ?? 0
			result.set(user, cnt + 1)
		}

		return result
	}

	/**
	 * @template U
	 * @param {GameBoard<U>} board
	 * @param {U} user
	 */
	static validMoves(board, user) {
		return board.map((_, position) => position).filter(position => Reversi.isValidMove(board, user, { position }))
	}

	/**
	 * @template U
	 * @param {GameBoard<U>} board
	 * @param {U} user
	 * @param {Move} move
	 * @returns {GameBoard<U>}
	 */
	static move(board, user, move) {
		const { position } = move

		const updatedBoard = board.with(position, user)

		const {
			north, east, south, west,
			northEast, southEast, northWest, southWest
		} = Reversi.#checkRuns(board, user, move)

		for(const p of north) { updatedBoard[p] = user }
		for(const p of east) { updatedBoard[p] = user }
		for(const p of south) { updatedBoard[p] = user }
		for(const p of west) { updatedBoard[p] = user }

		for(const p of northEast) { updatedBoard[p] = user }
		for(const p of southEast) { updatedBoard[p] = user }
		for(const p of southWest) { updatedBoard[p] = user }
		for(const p of northWest) { updatedBoard[p] = user }

		return updatedBoard
	}

}

// function printReversi(board, valid) {
// 	for(const r of [0, 1, 2, 3, 4, 5, 6, 7]) {
// 		const offset = r * BOARD_DIMENSION
// 		const row = board.slice(offset, offset + BOARD_DIMENSION)

// 		console.log(row.map((p,i) => `${p === EMPTY ? (valid.includes(offset + i) ? '_' : '.') : p }`).join(' '))
// 	}
// 	console.log()
// }



// import * as readline from 'node:readline/promises'
// import { stdin as input, stdout as output } from 'node:process'

// const rl = readline.createInterface({ input, output })

// let b = Reversi.emptyBoard()

// const userA = 'W'
// const userB = 'B'
// let currentUser = userA

// b = Reversi.openingLayout(b, [ userA, userB ])

// while(!Reversi.isResolved(b)) {
// 	// console.log('not resolved')
// 	const valid = Reversi.validMoves(b, currentUser)
// 	printReversi(b, valid)
// 	console.log(valid)
// 	console.log(Reversi.counts(b))

// 	if(valid.length <= 0) {
// 		await rl.question(`user ${currentUser} has no move - enter to pass:`)
// 		b = Reversi.move(b, currentUser, { position: -1 })
// 	}
// 	else
// 	{
// 		const answer = await rl.question(`user ${currentUser} - select: `)
// 		const position = Number.parseInt(answer)
// 		if(Number.isNaN(position) || !Reversi.isValidMove(b, currentUser, { position })) {
// 			console.log('invalid move, select again', position)
// 			continue
// 		}

// 		b = Reversi.move(b, currentUser, { position })
// 	}

// 	currentUser = currentUser === userA ? userB : userA
// }

// rl.close()
// console.log('Final Counts', Reversi.counts(b))
// console.log('Resolved', Reversi.resolution(b))
