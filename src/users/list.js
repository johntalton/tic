import { userStore } from '../store/store.js'
import { timed, TIMING } from '../util/timing.js'
import { encodedUserId, encodedUserIdFromString, fromEncodedUserId } from './util.js'
import { SearchQueryList } from '../util/search-query-list.js'

/** @import { HandlerFn } from '../util/dig.js' */
/** @import { UserInfoList } from '../types/public.user.js' */

/** @type {HandlerFn<UserInfoList>} */
export async function listUsers(_matches, sessionUser, _body, query, _stream, handlerPerformance) {
	const userId = await userStore.fromToken(sessionUser.tokens.access, handlerPerformance)

	const userFilterRaw = SearchQueryList.get(query, { plural: 'users', singular: 'user', short: 'u' })
	const userFilter = await Promise.all(userFilterRaw.map(f => fromEncodedUserId(encodedUserIdFromString(f))))

	const allUsers = await timed(
		TIMING.USER_LIST,
		handlerPerformance,
		() => userStore.list(userId, userFilter))

	return {
		users: await Promise.all(allUsers.map(async user => ({
			...user,
			storeUserId: undefined,
			id: await encodedUserId(user.storeUserId)
		})))
	}
}