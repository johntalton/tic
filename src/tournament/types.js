/** @import { EncodedGameId, IdentifiableActionableGame, GameListing } from '../types/public.game.js' */
/** @import { EncodedUserId, IdentifiableUser } from '../types/public.user.js' */

/** @typedef {string & { readonly _brand: 'tid' }} TournamentId */
/** @typedef {string & { readonly _brand: 'bn' }} BracketName */
/** @typedef {string & { readonly _brand: 'mn' }} MethodologyName */

/** @typedef {'open'|'closed'} TournamentStateState */
/** @typedef {'invite-only'} BracketMode */
/** @typedef {'pending'|'open'|'closed'} RoundStateState */
/** @typedef {'future'|'pending'|'open'|'resolved'} GameState */


/**
 * @typedef {Object} Methodology
 * @property {(stage: StageState, bracket: BracketState) => Array<RoundState>} rounds
 * @property {(fixture: FixtureState) => Array<MatchState>} matches
 */


/**
 * @typedef {Object} Backend
 * @property {() => Promise<Array<IdentifiableActionableGame>>} list
 * @property {() => Promise<IdentifiableActionableGame>} create
 * @property {(gameId: EncodedGameId) => Promise<IdentifiableActionableGame>} fetch
 * @property {(gameId: EncodedGameId, reason: string) => Promise<void>} close
 * @property {(gameId: EncodedGameId, targets: Array<EncodedUserId>) => Promise<IdentifiableActionableGame>} offer
 */



/**
 * @typedef {Object} MatchState
 * @property {EncodedGameId} gameId
 * @property {GameState} state
 */

/**
 * @typedef {Object} FixtureState
 * @property {EncodedUserId} playerA
 * @property {EncodedUserId} playerB
 * @property {Array<MatchState>} matches
 */

/**
 * @typedef {Object} RoundState
 * @property {RoundStateState} state
 * @property {Array<FixtureState>} fixtures
 */

/**
 * @typedef {Object} StageState
 * @property {MethodologyName} methodology
 * @property {BracketName} bracket
 * @property {Array<RoundState>} rounds
 */

/**
 * @typedef {Object} BracketState
 * @property {BracketName} name
 * @property {BracketMode} mode
 * @property {Array<EncodedUserId>} invites
 * @property {Array<EncodedUserId>} players
 */

/**
 * @typedef {Object} TournamentState
 * @property {Backend} backend
 * @property {TournamentStateState} state
 * @property {Array<BracketState>} brackets
 * @property {Array<StageState>} stages
 */

/**
 * @typedef {TournamentState & { tournamentId: TournamentId }} IdentifiableTournamentState
 */


export default {}