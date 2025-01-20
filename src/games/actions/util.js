import { Tic, isViewable } from '../tic.js'

import { gameStore } from '../../store/game.js'
import { userStore } from '../../store/user.js'

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
