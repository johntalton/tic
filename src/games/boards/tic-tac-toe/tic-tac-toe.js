/** biome-ignore-all lint/style/noMagicNumbers: win condition has a bunch */
import { EMPTY } from '../../game.js'

/** @import { GameBoard, Game, Move, Winner, Resolution } from '../../game.js' */

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

export class TicTacToe {
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
	 * @param {Array<U>} _users
	 */
	static openingLayout(board, _users) {
		return Array.from(board)
	}

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
	static isWin(board) { return TicTacToe.#isWin(TicTacToe.winner(board)) }

	/**
	 * @template U
	 * @param {GameBoard<U>} board
	 */
	static isDraw(board) { return TicTacToe.#isDraw(TicTacToe.isFull(board), TicTacToe.isWin(board)) }

	/**
	 * @template U
	 * @param {GameBoard<U>} board
	 */
	static isResolved(board) { return TicTacToe.#isResolved(TicTacToe.isFull(board), TicTacToe.isWin(board)) }

	/**
	 * @template U
	 * @param {GameBoard<U>} board
	 * @returns {Resolution<U>}
	 */
	static resolution(board) {
		const winner = TicTacToe.winner(board)
		const full = TicTacToe.isFull(board)
		const win = TicTacToe.#isWin(winner)
		const draw = TicTacToe.#isDraw(full, win)
		const resolved = TicTacToe.#isResolved(full, win)

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
		return board[position] === EMPTY
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
		return board.with(position, user)
	}
}

