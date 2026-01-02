export const FORWARDED_KEY_BY = 'by'
export const FORWARDED_KEY_FOR = 'for'
export const FORWARDED_KEY_HOST = 'host'
export const FORWARDED_KEY_PROTO = 'proto'

export const KNOWN_FORWARDED_KEYS = [
	FORWARDED_KEY_BY,
	FORWARDED_KEY_FOR,
	FORWARDED_KEY_HOST,
	FORWARDED_KEY_PROTO
]

export const SKIP_ANY = '*'

export const SEPARATOR = {
	ITEM: ',',
	ELEMENT: ';',
	KVP: '='
}

export class Forwarded {
	/**
	 * @param {string|undefined} header
	 * @param {Array<string>} acceptedKeys
	 * @returns {Array<Map<string, string>>}
	 */
	static parse(header, acceptedKeys = KNOWN_FORWARDED_KEYS) {
		if(typeof header !== 'string') { return [] }

		return header
			.trim()
			.split(SEPARATOR.ITEM)
			.map(single => new Map(single
					.trim()
					.split(SEPARATOR.ELEMENT)
					.map(kvp => {
						const [ rawKey, rawValue ] = kvp.trim().split(SEPARATOR.KVP)

						const key = rawKey?.trim()?.toLowerCase()
						if (key === undefined || !acceptedKeys.includes(key)) { return undefined }

						const value = rawValue?.trim()
						if(value === undefined) { return undefined }
						if(value.length <= 0) { return undefined }

						/** @type {[string, string]} */
						const result = [ key, value ]
						return result
					})
					.filter(item => item !== undefined))
			)
			.filter(m => m.size !== 0)
	}

	/**
	 * @param {Array<Map<string, string>>} forwardedList
	 * @param {Array<string>} skipList list of for values starting with right-most to skip in forwarded list
	 * @returns {Map<string, string>|undefined}
	 */
	static selectRightMost(forwardedList, skipList = []) {
		const iter = skipList[Symbol.iterator]()

		for(const forwarded of forwardedList.toReversed()) {
			const forValue = forwarded.get(FORWARDED_KEY_FOR)
			const { done, value } = iter.next()
			if(done) { return forwarded }
			if(value !== SKIP_ANY && value !== forValue) { return undefined }
		}

		return undefined
	}
}


/*
const examples = [
	{ f: [], s: [], ef: undefined },

	{ f: [], s: [ '1.1.1.1' ] , ef: undefined },
	{ f: [], s: [ '*' ] , ef: undefined },

	{ f: [ { for: '1.1.1.1' } ], s: [], ef: '1.1.1.1' },
	{ f: [ { for: '1.1.1.1' } ], s: [ '*' ], ef: undefined },
	{ f: [ { for: '1.1.1.1' }, { for: '2.2.2.2' } ], s: [], ef: '2.2.2.2' },
	{ f: [ { for: '1.1.1.1' }, { for: '2.2.2.2' } ], s: [ '2.2.2.2' ], ef: '1.1.1.1' },
	{ f: [ { for: '1.1.1.1' }, { for: '2.2.2.2' }, { for: '3.3.3.3' } ], s: [ '3.3.3.3', '2.2.2.2' ], ef: '1.1.1.1' },
	{ f: [ { for: '1.1.1.1' }, { for: '2.2.2.2' }, { for: '3.3.3.3' } ], s: [ '3.3.3.3', '*' ], ef: '1.1.1.1' },
	{ f: [ { for: '1.1.1.1' }, { for: '2.2.2.2' }, { for: '3.3.3.3' } ], s: [ '*', '*' ], ef: '1.1.1.1' },
	{ f: [ { for: '1.1.1.1' }, { for: '2.2.2.2' }, { for: '3.3.3.3' } ], s: [ '*', '*', '*' ], ef: undefined },

	{ f: [ { for: '1.1.1.1' } ], s: [ '*', '*' ], ef: undefined },

	{ f: [ { for: '1.1.1.1' }, { for: '2.2.2.2' }, { for: '3.3.3.3' } ], s: [ '3.3.3.3'], ef: '2.2.2.2' },
	{ f: [ { for: '1.1.1.1' }, { for: '2.2.2.2' }, { for: '3.3.3.3' } ], s: [ '*'], ef: '2.2.2.2' },
]

for(const { f, s, ef } of examples) {
	const result = Forwarded.selectRightMost(f.map(i => new Map(Object.entries(i))), s)
	const resultFor = result?.get('for')
	if(resultFor !== ef) {
		console.log(`mismatch ${ef} !== ${resultFor}`)
	}
}
*/


/*
	const examples = [
		null,
		undefined,
		42,
		'',
		'			',
		'some value here',
		'======;;;',
		',=,=,=;;;==,,,for',
		'a=2, b=3, by=, =10',
		'by=🚀',
		'🔑="a key"',

		'for="_gazonk"',
		'for="_mdn"',
		'For="[2001:db8:cafe::17]:4711"',
		'for=192.0.2.60;proto=http;by=203.0.113.43',
		'for=192.0.2.43, for=198.51.100.17',
		'for=192.0.2.43',
		'for=192.0.2.43, for=198.51.100.17;by=203.0.113.60;proto=http;host=example.com"',
		'for=192.0.2.43, for="[2001:db8:cafe::17]"',
		'for=192.0.2.43,for="[2001:db8:cafe::17]",for=unknown',
		'for=192.0.2.43, for="[2001:db8:cafe::17]", for=unknown',
		'for=_hidden, for=_SEVKISEK',
		'for=192.0.2.43, for="[2001:db8:cafe::17]", for=unknown',

		' for = 1.1.1.1   ,for=     2.2.2.2    ',
		' fro=not_real, for=[::1]',
		'FOr=192.0.2.43:47011,for="[2001:db8:cafe::17]:47011"',
		' for=12.34.56.78, for=23.45.67.89;secret=egah2CGj55fSJFs, for=10.1.2.3'
	]

	for (const example of examples) {
		console.log('================================')
		console.log(example)
		console.log(Forwarded.parse(example, [ ...KNOWN_FORWARDED_KEYS, 'secret', '🔑']))
	}
*/
