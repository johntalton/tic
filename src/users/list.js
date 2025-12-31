import { userStore } from '../store/user.js'
import { MIME_TYPE_MULTIPART_FORM_DATA, MIME_TYPE_URL_FORM_DATA } from '../util/content-type.js'

/** @import { HandlerFn } from '../util/dig.js' */
/** @import { UserInfoList } from '../types/public.js' */

/** @type {HandlerFn<UserInfoList>} */
export async function listUsers(matches, sessionUser, body, query) {
	if(sessionUser.tokens.access === undefined) { throw new Error('access token required') }
	const userId = await userStore.fromToken(sessionUser.tokens.access)

	const allUsers = await userStore.list(userId)

	// const userFilter = query.getAll('u') ?? query.getAll('user') ?? '*'
	// if(userFilter === '*') { return { users: allUsers } }

	// if((body.contentType.mimetype !== MIME_TYPE_MULTIPART_FORM_DATA) && (body.contentType.mimetype !== MIME_TYPE_URL_FORM_DATA)) {
	// 	throw new Error('unknown body mime type')
	// }

	// // console.log('text', await body.text())
	// const formData = await body.formData()
	// console.log('users', [ ...formData.getAll('user'), ...formData.getAll('u') ])

	return {
		users: allUsers
	}
}