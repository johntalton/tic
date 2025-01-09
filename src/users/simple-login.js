import { userStore } from '../store/user.js'


export async function simpleLogin(sessionUser, body, query) {
	const name = query.get('name')

	console.log('--- attemping simple login for', name)

	const user = await userStore.fromName(name)
		.catch(e => undefined)

	if(user === undefined) {
		// create new user
	}
	else {
		// await userStore.get(user)
	}

	if(name === 'bob123') {
		return {
			id: 'bob123',
			displayName: name,
			token: 'abcd1234'
		}
	}

	if(name === 'alice') {
		return {
			id: 'alice.one',
			displayName: name,
			token: 'umbrella'
		}
	}

	throw new Error('invalid user')
}