/**
 * @param {string} str
 */
export function isSingleGrapheme(str) {
  if(!str.isWellFormed()) { return false }
  const seg = new Intl.Segmenter('en-US', { granularity: 'grapheme' })
  const result = [ ...seg.segment(str) ]
  return result.length === 1
}