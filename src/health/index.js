import { gameStore, userStore } from '../store/store.js'

/** @import { HandlerFn } from '../util/dig.js' */

/**
 * @typedef {Object} Health
 */

/** @type {HandlerFn<Health>} */
export async function getHealth(_matches, _user, _body, _query, stream, handlerPerformance, shutdownSignal) {
  //

  const { promise, resolve, reject } = Promise.withResolvers()
  const initPayload = new Uint8Array(8)
  crypto.getRandomValues(initPayload)

  stream.session?.ping(initPayload, (err, duration, payload) => {
    //
    if(err) { reject(err) }
    resolve({ duration, payload })
  })

  const pingHealth = promise.then(results => {
    // todo check initPayload vs payload
    handlerPerformance.push({ name: 'health-ping', duration: results.duration })
  })

  const [ gameHealth, userHealth, _ ] = await Promise.all([ gameStore.health(), userStore.health(), pingHealth ])

  return {
    alive: true,
    shutdown: shutdownSignal.aborted,
    services: [
      userHealth, gameHealth
    ]
  }
}
