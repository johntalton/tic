import { Bracket, Round } from './structures.js'

/** @import {
	BracketState,
	FixtureState,
	MatchState,
	Methodology,
	RoundState,
	StageState
} from './types.js' */

export class MethodologyFactory {
	/**
	 * @param {string} name
	 * @returns {Methodology|undefined}
	 */
	static from(name) {
		if(name.toLowerCase() === 'elimination') { return Elimination }
		return undefined
	}
}



export class Ladder {}


 export class Elimination {


	/**
	 * @param {StageState} stage
	 * @param {BracketState} bracket
	 * @returns {Array<RoundState>}
	 */
	static rounds(stage, bracket) {
		if(!Bracket.ready(bracket)) {
			// console.log('Bracket not ready', bracket.name)
			return []
		}

		const active = stage.rounds.find(Round.active)
		if(active !== undefined) { return [] }



		// shuffle
		// console.log('Elimination.rounds', bracket.players)
		const midpoint = Math.trunc(bracket.players.length / 2)
		const groupA = bracket.players.slice(0, midpoint)
		const groupB = bracket.players.slice(midpoint)

		const fixtures = groupA.map((A, index) => ({
			playerA: A,
			playerB: groupB.at(index),
			matches: []
		}))
		// console.log('Elimination.rounds fixtures', fixtures)

		return [ { state: 'pending', fixtures } ]
	}

	/**
	 * @param {FixtureState} fixture
	 * @returns {Array<MatchState>}
	 */
	static matches(fixture) {
		if(fixture.matches.length > 0) { return [] }

		return [
			{
				gameId: '',
				state: 'future'
			},
			{
				gameId: '',
				state: 'future'
			}
		]
	}
}



export class RoundRobin {

}


