export const MIME_TYPE_JSON = 'application/json'
export const MIME_TYPE_TEXT = 'text/plain'

const SEPARATOR = {
	SUBTYPE: '/',
	PARAMETER: ';',
	KVP: '='
}
const CHARSET_UTF8 = 'utf8'
const CHARSET = 'charset'
const PARAMETER_CHARSET_UTF8 = `${CHARSET}${SEPARATOR.KVP}${CHARSET_UTF8}`
export const CONTENT_TYPE_JSON = `${MIME_TYPE_JSON}${SEPARATOR.PARAMETER}${PARAMETER_CHARSET_UTF8}`
export const CONTENT_TYPE_TEXT = `${MIME_TYPE_TEXT}${SEPARATOR.PARAMETER}${PARAMETER_CHARSET_UTF8}`


export function parseContentType(contentTypeHeader) {
	if(contentTypeHeader === undefined) { return {} }

	const [ mimetypeRaw, ...parameterSet ] = contentTypeHeader.trim().split(SEPARATOR.PARAMETER).map(entry => entry.trim())

	const [ type, subtype ] = mimetypeRaw
		.split(SEPARATOR.SUBTYPE)
		.map(t => t.trim())

	const parameters = new Map(parameterSet.map(parameter => parameter.split(SEPARATOR.KVP).map(p => p.trim())))

	const charset = parameters.get(CHARSET)

	return {
		mimetype: `${type}${SEPARATOR.SUBTYPE}${subtype}`,
		mimetypeRaw, type, subtype,
		charset,
		parameters
	}
}