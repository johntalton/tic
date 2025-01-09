export const KEY_DURATION = 'dur' // common in milliseconds
export const KEY_DESCRIPTION = 'desc'

export const HTTP_HEADER_SERVER_TIMING = 'Server-Timing'

export const SEPARATOR = {
	METRIC: ',',
	PARAMETER: ';',
	KVP: '='
}

export class ServerTiming {
	static encode(timings) {
		if(timings === undefined) { return undefined }
		if(timings.length <= 0) { return undefined }

		return timings
			.map(({ name, duration, description }) => [
					`${name}`,
					description !== undefined ? `${KEY_DESCRIPTION}${SEPARATOR.KVP}"${description}"` : undefined,
					duration !== undefined ? `${KEY_DURATION}${SEPARATOR.KVP}${Math.trunc(duration * 10) / 10}` : undefined
				]
				.filter(item => item !== undefined)
				.join(SEPARATOR.PARAMETER))
			.join(SEPARATOR.METRIC)
	}
}


// console.log(ServerTiming.encode([{ name: 'missedCache' }]))
// console.log(ServerTiming.encode([{ name: 'cpu', duration: 2.4 }]))

// // cache;desc="Cache Read";dur=23.2
// console.log(ServerTiming.encode([{ name: 'cache', duration: 23.2, description: "Cache Read" }]))

// // db;dur=53, app;dur=47.2
// console.log(ServerTiming.encode([
// 	{ name: 'db', duration: 54 },
// 	{ name: 'app', duration: 47.2 }
// ]))