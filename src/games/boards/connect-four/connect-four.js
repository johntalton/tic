/** biome-ignore-all lint/style/noMagicNumbers: there is a bunch */
import { EMPTY } from '../../game.js'

/** @import { GameBoard, Game, Move, Winner, Resolution } from '../../game.js' */

const DIMENSION_WIDTH = 7
// const DIMENSION_HIGHT = 6
const ROW_INDEXES = [ 0, 7, 14, 21, 28, 35 ]
const COL_INDEXES = [ 0, 1, 2, 3, 4, 5, 6 ]

const ROW_WIN_CONDITIONS_TEMPLATE = [ // x6
	[ 0, 1, 2, 3 ],
	[ 1, 2, 3, 4 ],
	[ 2, 3, 4, 5 ],
	[ 3, 4, 5, 6 ],
]

const COL_WIN_CONDITIONS_TEMPLATE = [ // x7
	[  0,  7, 14, 21 ],
	[  7, 14, 21, 28 ],
	[ 14, 21, 28, 35 ]
]

const DIAG_DOWN_WIN_CONDITIONS = [
	[ 14, 22, 30, 38 ],

	[  7, 15, 23, 31 ],
	[ 15, 23, 31, 39 ],

	[  0,  8, 16, 24 ],
	[  8, 16, 24, 32 ],
	[ 16, 24, 32, 40 ],

	[  1,  9, 17, 25 ],
	[  9, 17, 25, 33 ],
	[ 17, 25, 33, 41 ],

	[  2, 10, 18, 26 ],
	[ 10, 18, 26, 34 ],

	[  3, 11, 19, 27 ]
]

const DIAG_UP_WIN_CONDITIONS = [
	[  3,  9, 15, 21 ],

	[  4, 10, 16, 22 ],
	[ 10, 16, 22, 28 ],

	[  5, 11, 17, 23 ],
	[ 11, 17, 23, 29 ],
	[ 17, 23, 29, 35 ],

	[  6, 12, 18, 24 ],
	[ 12, 18, 24, 30 ],
	[ 18, 24, 30, 36 ],

	[ 13, 19, 25, 31 ],
	[ 19, 25, 31, 37 ],

	[ 20, 26, 32, 38 ]
]


export class ConnectFour {
	/**
	 * @template U
	 * @returns {GameBoard<U>}
	 */
	static emptyBoard() {
		return [
			EMPTY, EMPTY, EMPTY, EMPTY, EMPTY, EMPTY, EMPTY,
			EMPTY, EMPTY, EMPTY, EMPTY, EMPTY, EMPTY, EMPTY,
			EMPTY, EMPTY, EMPTY, EMPTY, EMPTY, EMPTY, EMPTY,
			EMPTY, EMPTY, EMPTY, EMPTY, EMPTY, EMPTY, EMPTY,
			EMPTY, EMPTY, EMPTY, EMPTY, EMPTY, EMPTY, EMPTY,
			EMPTY, EMPTY, EMPTY, EMPTY, EMPTY, EMPTY, EMPTY
		]
	}

	/**
	 * @template U
	 * @param {GameBoard<U>} board
	 * @param {Array<U>} _users
	 */
	static openingLayout(board, _users) {
		return Array.from(board)
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
	 * @param {GameBoard<U>} board
	 * @returns {Winner<U>}
	 */

// biome-ignore lint/complexity/noExcessiveCognitiveComplexity: winner check is complex
static  #winner(board) {
		// diag up
		for(const diag of DIAG_UP_WIN_CONDITIONS) {
			const values = diag.map(d => board[d])
			const [ first ] = values
			if(first === undefined || first === EMPTY) { continue }
			const win = values.every(u => u === first)
			if(win) { return { name: 'diagonal', user: first, run: diag } }
		}

		// diag down
		for(const diag of DIAG_DOWN_WIN_CONDITIONS) {
			const values = diag.map(d => board[d])
			const [ first ] = values
			if(first === undefined || first === EMPTY) { continue }
			const win = values.every(u => u === first)
			if(win) { return { name: 'diagonal', user: first, run: diag } }
		}

		// rows
		for(const row of ROW_INDEXES) {
			for(const rwc of ROW_WIN_CONDITIONS_TEMPLATE) {
				const run = rwc.map(r => row + r)
				const values = run.map(v => board[v])
				const [ first ] = values
				if(first === undefined || first === EMPTY) { continue }
				const win = values.every(u => u === first)
				if(win) { return { name: 'row', user: first, run } }
			}
		}

		// cols
		for(const col of COL_INDEXES) {
			for(const cwc of COL_WIN_CONDITIONS_TEMPLATE) {
				const run = cwc.map(c => col + c)
				const values = run.map(v => board[v])
				const [ first ] = values
				if(first === undefined || first === EMPTY) { continue }
				const win = values.every(u => u === first)
				if(win) { return { name: 'col', user: first, run  }}
			}
		}

		return { user: EMPTY }
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
	 */
	static #isResolved(full, win) { return full || win }

	/**
	 * @param {boolean} full
	 * @param {boolean} win
	 */
	static #isDraw(full, win) { return full && !win }

	/**
	 * @template U
	 * @param {GameBoard<U>} board
	 */
	static isResolved(board) {
		const full = ConnectFour.#isFull(board)
		const win = ConnectFour.#isWin(ConnectFour.#winner(board))
		return ConnectFour.#isResolved(full, win)
	}

	/**
	 * @template U
	 * @param {GameBoard<U>} board
	 * @returns {Resolution<U>}
	 */
	static resolution(board) {
		const winner = ConnectFour.#winner(board)
		const full = ConnectFour.#isFull(board)
		const win = ConnectFour.#isWin(winner)
		const resolved = ConnectFour.#isResolved(full, win)
		const draw = ConnectFour.#isDraw(full, win)

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
	 * @param {GameBoard<U>} board
	 * @param {U} _user
	 * @param {Move} move
	 */
	static isValidMove(board, _user, move) {
		const { position } = move
		if(position < 0 || position >= DIMENSION_WIDTH) { return false }

		const column = ROW_INDEXES.map(i => i + position)
		const hasEmpty = column.map(i => board[i]).includes(EMPTY)

		return hasEmpty
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

		const column = ROW_INDEXES
			.map(i => i + position)
			.map(c => ({ position: c, value: board[c] }))

		const item = column.findLast(({ value }) => value === EMPTY)
		if(item === undefined) { throw new Error('invalid move - column not empty') }

		return board.with(item.position, user)
	}
}



// function printConnectFour(board) {
// 	for(const r of ROW_INDEXES) {
// 		const row = board.slice(r, r + DIMENSION_WIDTH)
// 		console.log(row.map(p => `${p === EMPTY ? '.' : p }`).join(' '))
// 	}
// 	console.log()
// }

// let b = ConnectFour.emptyBoard()
// printConnectFour(b)

// import * as readline from 'node:readline/promises'
// import { stdin as input, stdout as output } from 'node:process'

// const rl = readline.createInterface({ input, output })

// const userA = 'A'
// const userB = 'B'
// let currentUser = userA

// while(!ConnectFour.isResolved(b)) {
// 	// console.log('not resolved')
// 	const answer = await rl.question(`user ${currentUser} - select column: `)
// 	const position = Number.parseInt(answer)
// 	if(Number.isNaN(position) || !ConnectFour.isValidMove(b, currentUser, { position })) {
// 		console.log('invalid move, select again', position)
// 		continue
// 	}

// 	b = ConnectFour.move(b, currentUser, { position })
// 	currentUser = currentUser === userA ? userB : userA
// 	printConnectFour(b)
// }

// rl.close()
// console.log('Resolved', ConnectFour.resolution(b))
