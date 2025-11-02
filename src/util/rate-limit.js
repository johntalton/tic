export  const HTTP_HEADER_RATE_LIMIT = 'RateLimit'
export const HTTP_HEADER_RATE_LIMIT_POLICY = 'RateLimit-Policy'

/**
 * @typedef {Object} RateLimitInfo
 * @property {string} name
 * @property {number} remaining
 * @property {number} resetSeconds
 * @property {string} partitionKey
 */

/**
 * @typedef {Object} RateLimitPolicyInfo
 * @property {string} name
 * @property {number} quota
 * @property {number} size
 * @property {number} quotaUnits
 * @property {number} windowSeconds
 * @property {string} [partitionKey]
 */

export const LIMIT_PARAMETERS = {
	REMAINING_QUOTA: 'r',
	TIME_TILL_RESET_SECONDS: 't',
	PARTITION_KEY: 'pk'
}

export const POLICY_PARAMETER = {
	QUOTA: 'q',
	QUOTA_UNITS: 'qu',
	WINDOW_SECONDS: 'w',
	PARTITION_KEY: 'pk'
}

export const QUOTA_UNIT = {
	REQUEST: 'request',
	BYTES: 'content-bytes',
	CONCURRENT: 'concurrent-requests'
}

export class RateLimit {
	/**
	 * @param {RateLimitInfo} limitInfo
	 */
	static from(limitInfo) {
		const { name, remaining, resetSeconds, partitionKey } = limitInfo

		if(name === undefined || remaining === undefined) { return undefined }

		const rs = resetSeconds ? `;${LIMIT_PARAMETERS.TIME_TILL_RESET_SECONDS}=${resetSeconds}` : ''
		const pk = partitionKey ? `'${LIMIT_PARAMETERS.PARTITION_KEY}=${partitionKey}` : ''
		return `"${name}";${LIMIT_PARAMETERS.REMAINING_QUOTA}=${remaining}${rs}${pk}`
	}
}

export class RateLimitPolicy {
	/**
	 * @param {...RateLimitPolicyInfo} policies
	 */
	static from(...policies) {
		if(policies === undefined) { return undefined }

		return policies
			.filter(policy => policy.name !== undefined && policy.quota !== undefined)
			.map(policy => {
				const {
					name,
					quota,
					quotaUnits,
					windowSeconds,
					partitionKey
				} = policy

				const q = quota ? `${POLICY_PARAMETER.QUOTA}=${quota}` : undefined
				const qu = quotaUnits ? `${POLICY_PARAMETER.QUOTA_UNITS}="${quotaUnits}"` : undefined
				const ws = windowSeconds ? `${POLICY_PARAMETER.WINDOW_SECONDS}=${windowSeconds}` : undefined
				const pk = partitionKey ? `${POLICY_PARAMETER.PARTITION_KEY}=${partitionKey}` : undefined
				return [ `"${name}"`, q, qu, ws, pk ]
					.filter(item => item !== undefined)
					.join(';')
			})
			.join(',')
	}
}
