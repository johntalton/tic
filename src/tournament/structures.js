/** @import { EncodedUserId, IdentifiableUser } from '../types/public.user.js' */

/** @import {
	BracketState,
	FixtureState,
	MatchState,
	RoundState,
	StageState,
	TournamentId,
	TournamentState
 } from './types.js' */

// an individual game withing a fixture
export class Match {
	/**
	 * @param {MatchState} match
	 */
	static ready(match) {
		return match.state === 'future'
	}
}

// a set of matches between two players
export class Fixture {
	/**
	 * @param {FixtureState} fixture
	 */
	static ready(fixture) {
		return true
	}

	/**
	 * @param {FixtureState} fixture
	 */
	static active(fixture) {
		return true
	}
}

// a parallel set of fixtures to rank player for next round
export class Round {
	/**
	 * @param {RoundState} round
	 */
	static ready(round) {
		return true
	}

	/**
	 * @param {RoundState} round
	 */
	static active(round) {
		return round.state === 'open'
	}

	/**
	 * @param {RoundState} round
	 */
	static closed(round) {
		return false
	}
}

// container for multiple rounds with different properties
export class Stage {

}

// container for users participating in rounds
export class Bracket {
	/**
	 * @param {BracketState} bracket
	 * @returns {boolean}
	 */
	static ready(bracket) {
		if(bracket.players.length <= 0) {
			// console.log('bracket players zero', bracket)
			return false
		}

		if(bracket.mode === 'invite-only') {
			if(bracket.invites.length > 0) { return false }
			// if time window
			return true
		}

		console.log('bracket not ready (unknown mode)')
		return false
	}

	/**
	 * @param {BracketState} bracket
	 * @param {EncodedUserId} user
	 */
	static accept(bracket, user) {
		if(!bracket.invites.includes(user)) {
			return false
		}

		console.log('Bracket.accept', user)
		bracket.invites = bracket.invites.filter(u => u !== user)
		bracket.players.push(user)

		// console.log('Bracket.accept', bracket)

		return true
	}
}




// a set of rounds for each bracket that produce final ranking
export class Tournament {
	/**
	 * @returns {TournamentId}
	 */
	static id() {
		const u8 = new Uint8Array(5)
		crypto.getRandomValues(u8)
		// @ts-ignore
		return u8.toHex()
	}

	/**
	 * @param {{ signal: AbortSignal }} options
	 */
	static async *events(options) {
		const { signal } = options
		const iter = Iterator.from([])

		let { resolve: pendingResolve, promise: pending } = Promise.withResolvers()

		const timer = setInterval(() => {
			pendingResolve({ type: 'heartbeat' })

			const { resolve, promise } = Promise.withResolvers()
			pendingResolve = resolve
			pending = promise
		}, 1000)

		signal.addEventListener('abort', event => {
			console.log('abort - clear interval', signal.reason)
			clearInterval(timer)
		}, { once: true })

		while(!signal.aborted) {
			yield pending
		}

		console.log('Goodbye')
	}
}

