import { userStore } from '../store/user.js'
import { MIME_TYPE_MULTIPART_FORM_DATA, MIME_TYPE_URL_FORM_DATA } from '../util/content-type.js'

/**
 * @import { HandlerFn } from '../util/dig.js'
 */

/** @type {HandlerFn} */
export async function listUsers(matches, sessionUser, body, query) {
	const user = await userStore.fromToken(sessionUser.token)
		.catch(error => {
			console.log('list users error fromToken', error.message)
			return undefined
		})

	if (user === undefined) {
		throw new Error('invalid user token')
	}

	const allUsers = await userStore.list(user)

	// const userFilter = query.getAll('u') ?? query.getAll('user') ?? '*'
	// if(userFilter === '*') { return { users: allUsers } }

	if((body.contentType.mimetype !== MIME_TYPE_MULTIPART_FORM_DATA) && (body.contentType.mimetype !== MIME_TYPE_URL_FORM_DATA)) {
		throw new Error('unknown body mime type')
	}

	// console.log('text', await body.text())
	const formData = await body.formData()
	console.log('users', [ ...formData.getAll('user'), ...formData.getAll('u') ])

	return {
		users: allUsers
	}
}