export class CouchUtil {
	/**
	 * @param {string} username
	 * @param {string} password
	 */
	static basicAuthHeader(username, password) {
		// const encoder = new TextEncoder()
		// const u8 = encoder.encode(`${username}:${password}`)
		// const encodedCredentials = u8.toBase64()
		const encodedCredentials = btoa(`${username}:${password}`)
		const basicAuth = `Basic ${encodedCredentials}`
		return {
			'Authorization': basicAuth
		}
	}
}