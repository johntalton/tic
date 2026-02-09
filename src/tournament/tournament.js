import { GameAPI } from '../agent/node-game-api.js'
import { EventSource } from '../util/event-source.js'

import { Tournament, Bracket, Stage, Round, Fixture, Match } from './structures.js'
import { MethodologyFactory } from './methodology.js'

/** @import { EncodedGameId, IdentifiableActionableGame, GameListing } from '../types/public.game.js' */

/** @import {
	BracketState,
	FixtureState,
	IdentifiableTournamentState,
	MatchState,
	RoundState,
	StageState,
	TournamentId,
	TournamentState,
	TournamentStateState
 } from './types.js' */

const STORE = new Map()

export class Store {
	/**
	 * @param {TournamentId} id
	 * @param {TournamentState} tournament
	 * @returns {Promise<IdentifiableTournamentState>}
	 */
	static async create(id, tournament) {
		if(STORE.has(id)) { throw new Error('store id exists') }
		STORE.set(id, JSON.stringify(tournament))
		return Store.get(id)
	}

	/**
	 * @param {TournamentId} id
	 * @param {TournamentState} tournament
	 * @returns {Promise<IdentifiableTournamentState>}
	 */
	static async update(id, tournament) {
		STORE.set(id, JSON.stringify(tournament))
		return Store.get(id)
	}

	/**
	 * @param {TournamentId} id
	 * @returns {Promise<IdentifiableTournamentState>}
	 */
	static async get(id) {
		return { ...JSON.parse(STORE.get(id)), tournamentId: id  }
	}

	/**
	 * @param {TournamentStateState} [state='open']
	 * @returns {Promise<IterableIterator<Pick<IdentifiableTournamentState, 'tournamentId'>, undefined, never>>}
	 */
	static async list(state = 'open') {
		return STORE.entries()
			.filter(([ key, value ]) => value.state === state)
			.map(([ key ]) => ({ tournamentId: key }))
	}
}

const sseToken = 'token:sse:orc'
const BASE_URL = 'https://tic.next.local:8443'
const shutdown = new AbortController()
const eventSource = new EventSource(`${BASE_URL}/tic/v1/events?token=${sseToken}`, { withCredentials: true })
const Backend = new GameAPI({
		id: 'user:Orchestrator',
		accessToken: 'token:access:orc'
	},
	BASE_URL)




/**
 * @param {TournamentState} tournament
 */
async function processTournament(tournament) {
	console.log('processTournament\t-------')

	// console.log('processTournament', tournament)

	const processBracket = (/** @type {BracketState} */ bracket) => processTournamentBracket(tournament, bracket)
	const processStage = (/** @type {StageState} */ stage) => processTournamentStage(tournament, stage)

	await Promise.all(tournament.brackets.map(processBracket))
	await Promise.all(tournament.stages.map(processStage))
}

/**
 * @param {TournamentState} tournament
 * @param {BracketState} bracket
 */
async function processTournamentBracket(tournament, bracket) {
	console.log('\tprocessBracket', bracket.name)
	console.log('\tprocessBracket - ready', Bracket.ready(bracket))
}

/**
 * @param {TournamentState} tournament
 * @param {StageState} stage
 */
async function processTournamentStage(tournament, stage) {
	console.log('\tprocessStage')
	const methodology = MethodologyFactory.from(stage.methodology)
	if(methodology === undefined) { throw new Error('invalid methodology') }

	const bracket = tournament.brackets.find(b => b.name === stage.bracket)
	if(bracket === undefined) { throw new Error('invalid bracket') }

	//
	const ready = stage.rounds.map(Round.ready).reduce((acc, ready) => acc && ready, true)
	const rounds = methodology.rounds(stage, bracket)
	console.log('\tprocessStage adding rounds', rounds)
	stage.rounds.push(...rounds)

	//
	const processRound = (/** @type {RoundState} */ round) => processTournamentRound(tournament, stage, round)
	await Promise.all(stage.rounds.map(processRound))
}

/**
 * @param {TournamentState} tournament
 * @param {StageState} stage
 * @param {RoundState} round
 */
async function processTournamentRound(tournament, stage, round) {
	console.log('\t\tprocessRound', round.state)

	switch(round.state) {
		case 'pending': {} break
		case 'open': {} break
		case 'closed': {} break
		default: {
			/** @type {never} */
			const _state = round.state
			console.log('\t\tprocessRound - unknown state', _state)
		}
	}

	const processFixture = (/** @type {FixtureState} */ fixture) => processTournamentFixture(tournament, stage, round, fixture)
	await Promise.all(round.fixtures.map(processFixture))
}

/**
 * @param {TournamentState} tournament
 * @param {StageState} stage
 * @param {RoundState} round
 * @param {FixtureState} fixture
 */
async function processTournamentFixture(tournament, stage, round, fixture) {
	console.log('\t\t\tprocessFixture')
	const methodology = MethodologyFactory.from(stage.methodology)
	if(methodology === undefined) { throw new Error('invalid methodology') }

	//
	const matches = methodology.matches(fixture)
	console.log('\t\t\tprocessFixture adding matches', matches)
	fixture.matches.push(...matches)

	if(Round.active(round)) {
		console.log('\t\t\tprocessFixture - round open')

		const readyMatch = fixture.matches.find(Match.ready)
		if(readyMatch !== undefined) {
			console.log('\t\t\tprocessFixture - transition match to pending')
			readyMatch.state = 'pending'
		}
		else {
			console.log('\t\t\tprocessFixture - no ready matches')
		}
	}

	//
	const processMatch = (/** @type {MatchState} */ match) => processTournamentMatch(tournament, stage, round, fixture, match)
	await Promise.all(fixture.matches.map(processMatch))
}

/**
 * @param {TournamentState} tournament
 * @param {StageState} stage
 * @param {RoundState} round
 * @param {FixtureState} fixture
 * @param {MatchState} match
 */
async function processTournamentMatch(tournament, stage, round, fixture, match) {
	console.log('\t\t\t\tprocessMatch', match.state)

	switch(match.state)	{
		case 'future': {} break
		case 'pending': {

			console.log('\t\t\t\tprocessMatch - create game for', fixture.playerA, fixture.playerB)

			const game = await Backend.create()
			console.log('\t\t\t\tprocessMatch - create game', game.id)
			match.gameId = game.id

			const offeredGame = await Backend.offer(game.id, [ fixture.playerA, fixture.playerB ])
			console.log(offeredGame.offers)



		} break
		case 'open': {} break
		case 'resolved': {} break
		default: {
			/** @type {never} */
			const _state = match.state
			console.warn('\t\t\t\tprocessMatch - unknown state', _state)
		} break
	}

}








async function main() {
	// const eventService = new Promise(async () => {
	// 	const signal = shutdown.signal
	// 	for await (const event of Tournament.events({ signal })) {
	// 		console.log('event', event)
	// 	}
	// })


	eventSource.addEventListener('open', event => {
		console.log('SSE open')
	})
	eventSource.addEventListener('error', event => {
		console.log('SSE error')
	})
	eventSource.addEventListener('update', event => {
		console.log('SSE update')
	})

	const tournament = await Store.create(Tournament.id(), {
		mode: 'open',
		brackets: [
			{
				name: 'group-one',
				mode: 'invite-only',
				invites: [ 'U:user:PNWbohDYLzDfsl08kNfd', 'U:user:Agent' ],
				players: []
			}
		],
		stages: [
			{
				methodology: 'Elimination',
				bracket: 'group-one',
				rounds: []
			}
		]
	})



	// const existing = await Store.list()
	// await Promise.all(existing.map(processTournament))

	//
	await processTournament(tournament)
	Store.update(tournament.tournamentId, tournament)

	//
	Bracket.accept(tournament.brackets[0], 'U:user:Agent')
	Bracket.accept(tournament.brackets[0], 'U:user:PNWbohDYLzDfsl08kNfd')
	Store.update(tournament.tournamentId, tournament)

	//
	await processTournament(tournament)
	Store.update(tournament.tournamentId, tournament)

	//
	tournament.stages[0].rounds[0].state = 'open'
	Store.update(tournament.tournamentId, tournament)

	//
	await processTournament(tournament)
	Store.update(tournament.tournamentId, tournament)


	//
	// console.log(tournament.stages[0].rounds[0])
	// console.log(JSON.stringify(await Store.get(tournament.tournamentId), undefined, 1))
}

main()

process.on('SIGINT', event => {
	console.log('SigInt', event)

	if(shutdown.signal.aborted) {
		console.log('SigInt - exit')

		// console.log(process._getActiveRequests())
		// console.log(process._getActiveHandles())

		process.exit()
	}

	eventSource.close()
	// eventSource.removeEventListener('open')

	shutdown.abort('SigInt')
})