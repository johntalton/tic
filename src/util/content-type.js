export const MIME_TYPE_JSON = 'application/json'
export const MIME_TYPE_TEXT = 'text/plain'
export const MIME_TYPE_EVENT_STREAM = 'text/event-stream'
export const MIME_TYPE_XML = 'application/xml'
export const MIME_TYPE_URL_FORM_DATA = 'application/x-www-form-urlencoded'
export const MIME_TYPE_MULTIPART_FORM_DATA = 'multipart/form-data'
export const MIME_TYPE_OCTET_STREAM = 'application/octet-stream'

/**
 * @typedef {Object} ContentType
 * @property {string} mimetype
 * @property {string} mimetypeRaw
 * @property {string} type
 * @property {string} subtype
 * @property {string} [charset]
 * @property {Map<string, string>} parameters
 */

export const SEPARATOR = {
	SUBTYPE: '/',
	PARAMETER: ';',
	KVP: '='
}

export const CHARSET_UTF8 = 'utf8'
export const CHARSET = 'charset'
export const PARAMETER_CHARSET_UTF8 = `${CHARSET}${SEPARATOR.KVP}${CHARSET_UTF8}`
export const CONTENT_TYPE_JSON = `${MIME_TYPE_JSON}${SEPARATOR.PARAMETER}${PARAMETER_CHARSET_UTF8}`
export const CONTENT_TYPE_TEXT = `${MIME_TYPE_TEXT}${SEPARATOR.PARAMETER}${PARAMETER_CHARSET_UTF8}`

/** @type {ContentType} */
export const WELL_KNOWN_JSON = {
	mimetype: 'application/json',
	mimetypeRaw: 'application/json',
	type: 'application',
	subtype: 'json',
	charset: 'utf8',
	parameters: new Map()
}

export const WELL_KNOWN = new Map([
	[ 'application/json', WELL_KNOWN_JSON ],
	[ 'application/json;charset=utf8', WELL_KNOWN_JSON ]
])


/**
 * @param {string} contentTypeHeader
 * @returns {ContentType|undefined}
 */
export function parseContentType(contentTypeHeader) {
	if(contentTypeHeader === undefined) { return undefined }

	const wellKnown = WELL_KNOWN.get(contentTypeHeader)
	if(wellKnown !== undefined) { return wellKnown }

	const [ mimetypeRaw, ...parameterSet ] = contentTypeHeader.trim().split(SEPARATOR.PARAMETER).map(entry => entry.trim())

	const [ type, subtype ] = mimetypeRaw
		.split(SEPARATOR.SUBTYPE)
		.map(t => t.trim())

	const parameters = new Map(parameterSet.map(parameter => {
		const [ key, value ] = parameter.split(SEPARATOR.KVP).map(p => p.trim())
		return [ key, value ]
	}))

	const charset = parameters.get(CHARSET)

	return {
		mimetype: `${type}${SEPARATOR.SUBTYPE}${subtype}`,
		mimetypeRaw, type, subtype,
		charset,
		parameters
	}
}
