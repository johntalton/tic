/**
 * @import { RateLimitPolicyInfo } from '@johntalton/http-util/headers'
 */

/**
 * @typedef {Object} BucketInfo
 * @property {number} tokenCount
 * @property {number} lastRefillTime
 */


export class Bucket {
	/**
	 * @param {BucketInfo} bucket
	 * @param {RateLimitPolicyInfo} policy
	 * @param {number} [count=1]
	 */
	static getToken(bucket, policy, count = 1) {
		// console.log(`${policy.name}: get ${count}`, policy)

		const now =  Date.now()
		const elapsedTimeMs = (now - bucket.lastRefillTime)
		// console.log(`${policy.name}: elapsed since last refile: ${elapsedTimeMs} Ms`)

		if(elapsedTimeMs > (policy.windowSeconds * 1000)) {
			// console.log(`${policy.name}: refill`)

			const quotaPerMs = policy.quota / policy.windowSeconds / 1000
			const tokensPerElapsedTime = Math.round(quotaPerMs * elapsedTimeMs)

			const tokensNeeded = Math.min(tokensPerElapsedTime, policy.size - bucket.tokenCount)
			// console.log(`${policy.name}: need ${tokensNeeded} for ${elapsedTimeMs}`)

			bucket.tokenCount += tokensNeeded
			bucket.lastRefillTime = now
			// console.log(`${policy.name}: current count after refill ${bucket.tokenCount}`)
		}

		if((bucket.tokenCount - count) >= 0) {
			bucket.tokenCount = Math.max(bucket.tokenCount - count, 0)
			// console.log(`${policy.name}: current count ${bucket.tokenCount}`)
			return { exhausted: false, }
		}

		const timeUntilRefillMs = Math.round(Math.max(0, policy.windowSeconds - (elapsedTimeMs / 1000)))
		// console.log(`${policy.name}: limited until ${timeUntilRefillMs} S`)

		return { exhausted: true, resetSeconds: timeUntilRefillMs }
	}
}

export class RateLimiter {
	/**
	 * @param {Map<string, BucketInfo>} store
	 * @param {string} key
	 * @param {RateLimitPolicyInfo} policy
	 */
	static test(store, key, policy) {
		if(!store.has(key)) {
			store.set(key, {
				tokenCount: 0,
				lastRefillTime: 0
			})
		}

		const bucket = store.get(key)
		if(bucket === undefined) {
			throw new Error('undefined bucket has check')
		}
		const { exhausted, resetSeconds } = Bucket.getToken(bucket, policy, 1)

		return {
			name: policy.name,
			exhausted,

			remaining: bucket.tokenCount,
			resetSeconds,
			retryAfterS: resetSeconds
		}
	}
}

// const policyA = {
// 	name: 'defaultA',
// 	size: 5,
// 	quota: 1,
// 	windowSeconds: 2
// }

// const bucketA = {
// 	lastRefillTime: 0,
// 	tokenCount: 0,
// }

// const policyB = {
// 	name: 'defaultB',
// 	size: 5,
// 	quota: 5,
// 	windowSeconds: 5,
// }

// const bucketB = {
// 	lastRefillTime: 0,
// 	tokenCount: 0,
// }

// const buckets = new Map()


// const delayMs = ms => new Promise(resolve => setTimeout(resolve, ms))

// const startA = Date.now()
// let sumA = 0
// setInterval(async () => {
// 	await delayMs(Math.floor(100 * Math.random()))
// 	console.log('One')

// 	for(const i of [1]) {
// 		// const acquired = Bucket.getToken(bucketA, policyA)
// 		const { exhausted } = RateLimiter.test(buckets, 'A', policyA)
// 		if(!exhausted) { sumA += 1 }
// 		const durationS = (Date.now() - startA) / 1000
// 		const rate = sumA / durationS
// 		console.log('pass', !exhausted, rate)
// 	}
// 	console.log()
// }, 1000 * 1)

// const startB = Date.now()
// let sumB = 0
// setInterval(async () => {
// 	await delayMs(Math.floor(100 * Math.random()))
// 	console.log('Two')

// 	// const acquired = Bucket.getToken(bucketB, policyB)
// 	const { exhausted } = RateLimiter.test(buckets, 'B', policyB)
// 	if(!exhausted) { sumB += 1 }
// 	const durationS = (Date.now() - startB) / 1000
// 	const rate = sumB / durationS
// 	console.log('pass', !exhausted, rate)

// 	console.log()
// }, 1000 * 1)




// RateLimit-Policy: "burst";q=100;w=60,"daily";q=1000;w=86400
// RateLimit-Policy: "default";q=100;w=10
// RateLimit-Policy: "permin";q=50;w=60,"perhr";q=1000;w=3600
// RateLimit-Policy: "peruser";q=100;w=60;pk=:cHsdsRa894==:
// RateLimit-Policy: "peruser";q=65535;qu="bytes";w=10;pk=:sdfjLJUOUH==:
// console.log(RateLimitPolicy.from())
// console.log(RateLimitPolicy.from({}))
// console.log(RateLimitPolicy.from({ name: 'default', quota: 100 }))
// console.log(RateLimitPolicy.from({ name: 'default', quota: 100, windowSeconds: 10 }))
// console.log(RateLimitPolicy.from(
// 	{ name: 'permin', quota: 50, windowSeconds: 60 },
// 	{ name: 'perhr', quota: 1000, windowSeconds: 3600 },
// ))
// console.log(RateLimitPolicy.from(
// 	{ name: 'peruser', quota: 100, windowSeconds: 60, partitionKey: ':cHsdsRa894==:' },
// ))
// console.log(RateLimitPolicy.from(
// 	{ name: 'peruser', quota: 65535, quotaUnits: QUOTA_UNIT.BYTES, windowSeconds: 10, partitionKey: ':sdfjLJUOUH==:' },
// ))

// RateLimit: "default";r=50;t=30
// RateLimit: "problemPolicy";r=0;t=10
// RateLimit: "daily";r=1;t=36400
// console.log(RateLimit.from())
// console.log(RateLimit.from('default'))
// console.log(RateLimit.from('default', 50))
// console.log(RateLimit.from('default', 50, 30))
// console.log(RateLimit.from('problemPolicy', 0, 10))
// console.log(RateLimit.from('daily', 1, 36400))
// console.log(RateLimit.from('default', 50, 30, ':foo:'))


// RateLimit-Policy: "hour";q=1000;w=3600, "day";q=5000;w=86400
// RateLimit: "day";r=100;t=36000


