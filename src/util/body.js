
export function requestBody(stream) {
	const reader = new ReadableStream({
		start(controller) {
			stream.on('data', chunk => {
				// chunk is a node Buffer (which is a TypedArray)
				if(!(chunk instanceof Buffer)) { controller.error('invalid chunk type') }
				controller.enqueue(chunk)
			})

			stream.on('end', () => {
				controller.close()
			})
		},
	})

	return {
		blob: (mimetype) => bodyBlob(reader, mimetype),
		arrayBuffer: () => bodyArrayBuffer(reader),
		bytes: () => bodyUint8Array(reader),
		text: (encoding) => bodyText(reader, encoding),
		formData: undefined,
		json: (encoding) => bodyJSON(reader, encoding)
	}
}

async function bodyBlob(reader, mimetype) {
	const parts = []
	for await (const part of reader) {
		parts.push(part)
	}

	return new Blob(parts, { type: mimetype ?? '' })
}

async function bodyArrayBuffer(reader) {
	const blob = await bodyBlob(reader)
	return blob.arrayBuffer()

	// const u8 = await bodyUint8Array(reader)
	// return u8.buffer
}

async function bodyUint8Array(reader) {
	const buffer = await bodyArrayBuffer(reader)
	return new Uint8Array(buffer)

	// let total = 0
	// const parts = []
	// for await (const part of reader) {
	// 	total += part.byteLength
	// 	parts.push(part)
	// }

	// const buffer = new Uint8Array(total)
	// let offset = 0
	// for (const part of parts) {
	// 	buffer.set(part, offset)
	// 	offset += part.byteLength
	// }

	// return buffer
}

async function bodyText(reader, encoding) {
	// const blob = await bodyBlob(reader)
	// return blob.text()

	const u8 = await bodyUint8Array(reader)
	const decoder = new TextDecoder(encoding ?? 'utf-8', { fatal: true })
	return decoder.decode(u8)
}

async function bodyJSON(reader, encoding) {
	const text = await bodyText(reader, encoding)
	return (text === '') ? {} : JSON.parse(text)
}