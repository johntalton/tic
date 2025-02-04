export const WIN = 1
export const LOSE = 0
export const DRAW = 0.5

const BASE = 10
const DIVISOR = 400
const K_FACTOR = 32

// https://en.wikipedia.org/wiki/Elo_rating_system
export class ELO {
	static #expected(ratingFor, ratingAgainst, divisor) {
		const exponent = (ratingAgainst - ratingFor) / divisor
		return 1 / (1 + Math.pow(BASE, exponent))
	}


	static compute(A, B, kFactor = K_FACTOR) {
		const expectedA = ELO.#expected(A.rating, B.rating, DIVISOR)
		const expectedB = ELO.#expected(B.rating, A.rating, DIVISOR)

		const deltaA = kFactor * (A.score - expectedA)
		const deltaB = kFactor * (B.score - expectedB)

		return {
			ratingA: Math.round(A.rating + deltaA),
			ratingB: B.rating + deltaB
		}
	}
}

// const initialElo = 1613
// const games = [
// 	{ score: 0, opponent: 1609 },
// 	{ score: 0.5, opponent: 1477 },
// 	{ score: 1, opponent: 1388 },
// 	{ score: 1, opponent: 1586 },
// 	{ score: 0, opponent: 1720 }
// ]
// const result = 1604 // 1601 from wikipedia (why?)

// let currentA = initialElo
// for(const g of games) {
// 	const { ratingA } = ELO.compute(
// 		{ rating: currentA, score: g.score },
// 		{ rating: g.opponent, score: 1 - g.score })

// 	currentA = ratingA
// }
// console.log(currentA)