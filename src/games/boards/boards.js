import { ConnectFour } from './connect-four/connect-four.js'
import { Reversi } from './reversi/reversi.js'
import { TicTacToe } from './tic-tac-toe/tic-tac-toe.js'

/** @import { GameBoard, Move, Resolution } from '../game.js' */

/** @typedef { 'Reversi' | 'TTT' | 'C4' } BoardType */

export const KNOWN_BOARD_TYPES = [ 'Reversi', 'TTT', 'C4' ]

/** @type {BoardType} */
export const DEFAULT_GAME_TYPE = 'TTT'

/**
 * @param {string|undefined} type
 * @returns {type is BoardType}
 */
export function isBoardType(type) {
	if(type === undefined) { return false }
	return KNOWN_BOARD_TYPES.includes(type)
}

export class BoardFactory {
	/**
	 * @template U
	 * @param {BoardType} type
	 * @returns {GameBoard<U>}
	 */
	static emptyBoard(type) {
		if(type === 'C4') { return ConnectFour.emptyBoard() }
		if(type === 'Reversi') { return Reversi.emptyBoard() }
		if(type === 'TTT' || type === undefined) { return TicTacToe.emptyBoard() }

		throw new Error('unknown board type')
	}

	/**
	 * @template U
	 * @param {BoardType} type
	 * @param {GameBoard<U>} board
	 * @param {Array<U>} users
	 */
	static openingLayout(type, board, users) {
		if(type === 'C4') { return ConnectFour.openingLayout(board, users) }
		if(type === 'Reversi') { return Reversi.openingLayout(board, users) }
		if(type === 'TTT' || type === undefined) { return TicTacToe.openingLayout(board, users) }

		throw new Error('unknown board type')
	}

	/**
	 * @template U
	 * @param {BoardType} type
	 * @param {GameBoard<U>} board
	 * @param {U} user
	 * @param {Move} move
	 */
	static isValidMove(type, board, user, move) {
		if(type === 'C4') { return ConnectFour.isValidMove(board, user, move) }
		if(type === 'Reversi') { return Reversi.isValidMove(board, user, move) }
		if(type === 'TTT' || type === undefined) { return TicTacToe.isValidMove(board, user, move) }

		throw new Error('unknown board type')
	}

	/**
	 * @template U
	 * @param {BoardType} type
	 * @param {GameBoard<U>} board
	 * @param {U} user
	 * @param {Move} move
	 * @returns {GameBoard<U>}
	 */
	static move(type, board, user, move) {
		if(type === 'C4') { return ConnectFour.move(board, user, move) }
		if(type === 'Reversi') { return Reversi.move(board, user, move) }
		if(type === 'TTT' || type === undefined) { return TicTacToe.move(board, user, move) }

		throw new Error('unknown board type')
	}

	/**
	 * @template U
	 * @param {BoardType} type
	 * @param {GameBoard<U>} board
	 */
	static isResolved(type, board) {
		if(type === 'C4') { return ConnectFour.isResolved(board) }
		if(type === 'Reversi') { return Reversi.isResolved(board) }
		if(type === 'TTT' || type === undefined) { return TicTacToe.isResolved(board) }

		throw new Error('unknown board type')
	}

	/**
	 * @template U
	 * @param {BoardType} type
	 * @param {GameBoard<U>} board
	 * @returns {Resolution<U>}
	 */
	static resolution(type, board) {
		if(type === 'C4') { return ConnectFour.resolution(board) }
		if(type === 'Reversi') { return Reversi.resolution(board) }
		if(type === 'TTT' || type === undefined) { return TicTacToe.resolution(board) }

		throw new Error('unknown board type')
	}
}