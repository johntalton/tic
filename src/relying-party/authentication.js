import { Challenge } from './challenge.js'

export function startAuthentication(user, query) {

	console.log('starting authentication', user, query)

	const challenge = Challenge.generate()
	const encodedChallenge = Buffer.from(challenge).toString('base64url')

	// PublicKeyCredentialRequestOptions
	return {
		challenge: encodedChallenge,
		rpId: 'next.local',
		// allowCredentials: [],
		// userVerification: 'preferred',
		// timeout: 1000 * 60 * 1,
		// hints: [],
	}
}

export function authenticate(user, publicKeyCredential, query) {
	console.log({ user, query, publicKeyCredential })

	const { id, rawId, type } = publicKeyCredential
	const {
		clientDataJSON: clientDataBase64url,
		signature: signatureBase64url,
		userHandle: userId
	} = publicKeyCredential.response

	const clientDataBuffer = Buffer.from(clientDataBase64url, 'base64url')
	const decoder = new TextDecoder('utf-8')
	const clientDataJSON = decoder.decode(clientDataBuffer)
	const clientData = JSON.parse(clientDataJSON)

	console.log(id, clientData)

	const {
		type: clientDataType,
		challenge,
		origin
	} = clientData

	// validate we have id
	// and it matches rawid
	// type is 'public-key'

	// validate client data
	//	type is 'webauthn.get'
	//	challenge matches expected challenge
	//	origin correct?



	return { token: 'abcd1234'}
}