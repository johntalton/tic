export const ALPHABET = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789-_'

export class ID {
	static generate(size = 20) {
		const buffer = new Uint8Array(size)
		crypto.getRandomValues(buffer)
		const alphabetLength = ALPHABET.length
		return [ ...buffer ].map(index => ALPHABET[index % alphabetLength ]).join('')
	}
}

