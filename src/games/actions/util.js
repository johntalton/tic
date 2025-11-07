import { Tic, isViewable } from '../tic.js'
import { ELO, WIN, LOSE, DRAW } from '../elo.js'
import { gameStore } from '../../store/game.js'
import { userStore } from '../../store/user.js'

/** @import { StoreGameId, StoreGame } from '../../store/game.js' */
/** @import { ActionableGame, Game } from '../tic.js' */
/** @import {StoreUserId} from '../../store/user.js' */

/**
 * @typedef {Object} ResolvedStoreInfo
 * @property {StoreUserId} user
 * @property {Game} game
 * @property {StoreGame} gameObject
 */

/**
 * @param {StoreGameId} id
 * @param {{ token: string }} sessionUser
 * @returns {Promise<ResolvedStoreInfo>}
 */
export async function resolveFromStore(id, sessionUser) {
  // if(id === '404') { throw new Error('404 test id')}

  const user = await userStore.fromToken(sessionUser.token)
  if(user === undefined) {
    throw new Error('invalid user token')
  }

  const gameObject = await gameStore.get(id)
  if(gameObject === undefined) { throw new Error('unknown game') }

  const { game } = gameObject
  if(game === undefined) { throw new Error('object does not have a game') }

  if(!isViewable(game, user)) { throw new Error('not viewable') }

  return { user, game, gameObject }
}

/**
 * @param {ActionableGame} actionableGame
 */
export async function computeAndUpdateELO(actionableGame) {
  // resolved, compute and update players ELO
	const { resolution } = actionableGame
	if(resolution.resolved) {
		const [ playerAObject, playerBObject ] = await Promise.all(actionableGame.players.map(playerId => userStore.get(playerId)))

		const scoreA = resolution.draw ? DRAW : ((resolution.winner.user === playerAObject._id) ? WIN : LOSE)
		const scoreB = 1 - scoreA

		const nextELO = ELO.compute(
			{ rating: playerAObject.user.elo, score: scoreA },
			{ rating: playerBObject.user.elo, score: scoreB })

		// console.log('winner', resolution.winner.user)
		// console.log(playerAObject._id, playerAObject.user.displayName, playerAObject.user.elo, scoreA)
		// console.log(playerBObject._id, playerBObject.user.displayName, playerBObject.user.elo, scoreB)
		// console.log(nextELO)

		const updatedAt = Date.now()

		const updatedPlayerAObject = {
			...playerAObject,
			user: {
				...playerAObject.user,
				elo: nextELO.ratingA
			},
			meta: {
				...playerAObject.meta,
				updatedAt
			}
		}

		const updatedPlayerBObject = {
			...playerBObject,
			user: {
				...playerBObject.user,
				elo: nextELO.ratingB
			},
			meta: {
				...playerBObject.meta,
				updatedAt
			}
		}

		return Promise.all([
			userStore.set(updatedPlayerAObject._id, updatedPlayerAObject),
			userStore.set(updatedPlayerBObject._id, updatedPlayerBObject)
		])
	}
}