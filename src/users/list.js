import { storeUserIdFromString, userStore } from '../store/couch/user.js'
import { timed, TIMING } from '../util/timing.js'
// import { MIME_TYPE_MULTIPART_FORM_DATA, MIME_TYPE_URL_FORM_DATA } from '../util/content-type.js'

/** @import { HandlerFn } from '../util/dig.js' */
/** @import { UserInfoList } from '../types/public.js' */

/** @type {HandlerFn<UserInfoList>} */
export async function listUsers(_matches, sessionUser, _body, query, _stream, handlerPerformance) {
	if(sessionUser.tokens.access === undefined) { throw new Error('access token required') }
	const userId = await userStore.fromToken(sessionUser.tokens.access, handlerPerformance)

	const userFilterRaw = [ ...query.getAll('u'), ...query.getAll('user') ]
	const userFilter = userFilterRaw.map(f => storeUserIdFromString(f))

	// if((body.contentType.mimetype !== MIME_TYPE_MULTIPART_FORM_DATA) && (body.contentType.mimetype !== MIME_TYPE_URL_FORM_DATA)) {
	// 	throw new Error('unknown body mime type')
	// }

	// // console.log('text', await body.text())
	// const formData = await body.formData()
	// console.log('users', [ ...formData.getAll('user'), ...formData.getAll('u') ])

	const allUsers = await timed(
		TIMING.USER_LIST,
		handlerPerformance,
		() => userStore.list(userId, userFilter))

	return {
		users: allUsers
	}
}