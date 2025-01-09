function parseClientDataJSON(buffer) {
	const decoder = new TextDecoder('utf-8')
	return decoder.decode(buffer)
}

export async function login(urlBase) {
	const WEBAUTHN_AUTHENTICATE_URL = new URL('/tic/v1/authentication', urlBase)
	const WEBAUTHN_AUTHORIZE_URL = new URL('/tic/v1/authenticate', urlBase)

	const response = await fetch(WEBAUTHN_AUTHENTICATE_URL, {
			method: 'GET',
			mode: 'cors',
			headers: {
				'Accept': 'application/json',
				'Authorization': `Bearer Anonymous`
			}
		})

	if (!response.ok) { throw new Error('failed auth request') }
	const publicKeyCredentialRequestOptionsJSON = await response.json()




	// {
	// 	challenge: '345345345345353534',
	// 	// timeout: 3 * 1000,
	// 	rpId: 'localhost',
	// 	allowCredentials: [{
	// 		id: 'QfmZfCvB5EPrf7Zc5dQ_IGr5Mje5wFfs1A7OxT0T9Kg',
	// 		type: 'public-key'
	// 	}],
	// }

	console.log('server authentication options', publicKeyCredentialRequestOptionsJSON)
	const publicKeyCredentialRequestOptions = PublicKeyCredential.parseRequestOptionsFromJSON(publicKeyCredentialRequestOptionsJSON)
	console.log(publicKeyCredentialRequestOptions)

	const credentials = await navigator.credentials.get({
		publicKey: publicKeyCredentialRequestOptions
	})

	const userHandle = credentials.response.userHandle
	const signature = credentials.response.signature
	const clientData = parseClientDataJSON(credentials.response.clientDataJSON)

	console.log({
		userHandle,
		signature,
		clientData
	})

	const response2 = await fetch(WEBAUTHN_AUTHORIZE_URL, {
		method: 'POST',
		mode: 'cors',
		headers: {
			'Accept': 'application/json',
			'Authorization': `Bearer Anonymous`,
			'Content-Type': 'application/json;charset=utf-8'
		},
		body: JSON.stringify(credentials)
	})
	if (!response2.ok) { throw new Error('failed to post auth') }

	const result2 = await response2.json()
	console.log(result2)
}

export async function register(urlBase, username) {
	const WEBAUTHN_REGISTRATION_URL = new URL('/tic/v1/registration', urlBase)
	const WEBAUTHN_REGISTER_URL = new URL('/tic/v1/register', urlBase)

	const url = new URL(WEBAUTHN_REGISTRATION_URL)
	url.searchParams.set('username', username)

	const response = await fetch(url, {
			method: 'GET',
			mode: 'cors',
			headers: {
				'Accept': 'application/json',
				'Authorization': `Bearer Anonymous`
			}
		})

	if (!response.ok) { throw new Error('failed register request') }

	const publicKeyCredentialsCreateOptionsJSON = await response.json()

	console.log({ publicKeyCredentialsCreateOptionsJSON })
	const publicKeyCredentialsCreateOptions = PublicKeyCredential.parseCreationOptionsFromJSON(publicKeyCredentialsCreateOptionsJSON)
	console.log({ publicKeyCredentialsCreateOptions })

	const credentials = await navigator.credentials.create({
		publicKey: publicKeyCredentialsCreateOptions
	})

	if (credentials === null) {
		throw new Error('Credentials not created')
	}

	console.log('created', credentials)

	const id = credentials.id
	const clientData = parseClientDataJSON(credentials.response.clientDataJSON)
	// const authenticatorData = credentials.response.getAuthenticatorData()
	const pk = credentials.response.getPublicKey() // SPKI
	const pkAlgo = credentials.response.getPublicKeyAlgorithm()
	const transports = credentials.response.getTransports()

	console.log({
		id,
		clientData, pk, pkAlgo, transports
	})


	// post results for registration
	const response2 = await fetch(WEBAUTHN_REGISTER_URL, {
		method: 'POST',
		mode: 'cors',
		headers: {
			'Accept': 'application/json',
			'Authorization': `Bearer Anonymous`,
			'Content-Type': 'application/json;charset=utf-8'
		},
		body: JSON.stringify(credentials)
	})
	if (!response2.ok) { throw new Error('failed post register') }

	const result2 = await response2.json()

	console.log(result2)
}