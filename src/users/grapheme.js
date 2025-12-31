/**
 * @typedef {string & { readonly _brand: 'glyph' }} Glyph
 */

/**
 * @param {string} str
 * @returns {str is Glyph}
 */
export function isSingleGrapheme(str) {
  if(!str.isWellFormed()) { return false }
  const seg = new Intl.Segmenter('en-US', { granularity: 'grapheme' })
  const result = [ ...seg.segment(str) ]
  return result.length === 1
}

/**
 * @param {string} str1
 * @param {string} str2
 */
export function areEquivalent(str1, str2) {
  return str1.normalize('NFC') === str2.normalize('NFC')
}


// const Ns = 'nոռｎ𝐧𝑛𝒏𝓃𝓷𝔫𝕟𝖓𝗇𝗻𝘯𝙣𝚗'

// for(const n of Ns) {
//   console.log(n, isSingleGrapheme(n), areEquivalent(n, 'n'))
// }

// const encoder = new TextEncoder()

// const n1 = String.fromCodePoint(0x6E, 0x303)
// const n2 = String.fromCodePoint(0x00F1)
// console.log(n1, n2, n1 == n2, areEquivalent(n1, n2))

// console.log(n1.isWellFormed(), n2.isWellFormed())

// console.log(encoder.encode('ñ'), encoder.encode(n1), encoder.encode(n2))
// console.log(encoder.encode('ñ'.normalize()), encoder.encode(n1.normalize()), encoder.encode(n2.normalize()))

