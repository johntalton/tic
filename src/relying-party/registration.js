import { userStore } from '../store/user.js'
import { Challenge } from './challenge.js'

const temporaryUserMap = new Map()



export async function startRegistration(user, query) {
	// console.log({ user, query })
	if(!query.has('username')) { throw new Error('missing username') }
	const username = query.get('username')

	// lookup user
	const userInfo = await userStore.fromName(username)
	if(userInfo !== undefined) { throw new Error('existing user') }

	const userId = crypto.randomUUID()

	const webauthn = {
		username,
		challenge: Challenge.generate(),
		userId
	}

	temporaryUserMap.set(userId, webauthn)
	console.log(userId, webauthn)

	// const encodedChallenge = webauthn.challenge.toBase64({ alphabet: 'base64url' })
	const encodedChallenge = Buffer.from(webauthn.challenge).toString('base64url')



	// PublicKeyCredentialCreationOptions
	return {
		challenge: encodedChallenge,
		rp: {
			id: 'next.local', // if absent default to domain of origin
			name: ''
		},
		user: {
			id: webauthn.userId,
			name: username,
			displayName: username
		},
		pubKeyCredParams: [
			{ type: "public-key", alg: -7 },
			{ type: "public-key", alg: -257 }
		],
		authenticatorSelection: {
		// 	// residentKey: '',
			requireResidentKey: true,
		// 	// userVerification: 'preferred'
		}
		// excludeCredentials: [],
		// timeout: 1000 * 60 * 1
		// hints: []

	}
}


export function register(user, publicKeyCredential, query) {
	console.log({ user, query, publicKeyCredential })

	const { id, rawId } = publicKeyCredential

	const {
		clientDataJSON: clientDataBase64url,
		publicKey: publicKeyBase64url,
		publicKeyAlgorithm, transports
	} = publicKeyCredential.response

	const publicKeyBuffer = Buffer.from(publicKeyBase64url, 'base64url')

	const clientDataBuffer = Buffer.from(clientDataBase64url, 'base64url')
	const decoder = new TextDecoder('utf-8')
	const clientDataJSON = decoder.decode(clientDataBuffer)
	const clientData = JSON.parse(clientDataJSON)

	const {
		type: clientDataType,
		challenge,
		origin
	} = clientData

	console.log(id, publicKeyAlgorithm, transports, clientData, publicKeyBuffer)

	// validate we have an ID (raw matches id too)

	// validate client data
	//	type is 'webauthn.create'
	//	challenge matches expected challenge
	//	origin correct?



	// const userInfo = temporaryUserMap.get()
	// userStore.create()


	return {
		token: 'asdf1234'
	}
}