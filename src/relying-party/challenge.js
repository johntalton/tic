export class Challenge {
	static generate() {
		// return Uint8ClampedArray.from({ length: 32 }, () => Math.trunc(Math.random() * 255))

		const buffer = new Uint8Array(32)
		return crypto.getRandomValues(buffer)
	}
}
