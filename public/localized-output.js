export const DEFAULT_LANG = 'en-US'

const LANG_MAP = {
	'accept': {
		'en-US': 'Accept',
		'en-BR': 'Asep',
		'it': 'Accepto'
	}
}

async function loadLanguage(key, lang) {
	return LANG_MAP[key][lang]
}

export class LocalizedOutput extends HTMLElement {
	static observedAttributes = [ 'lang' ]

	#map = new Map()
	#slotElem
	#textElem
	#key = 'accept'

  constructor() {
		super()

		this.attachShadow({ mode: 'open' })
		this.#slotElem = document.createElement('slot')
		this.#textElem = document.createTextNode('')
		this.shadowRoot?.append(this.#slotElem, this.#textElem)
	}

	connectedCallback() {
		const ancestorLangElem = this.closest('[lang]')
		const ancestorLang = ancestorLangElem?.getAttribute('lang') ?? DEFAULT_LANG
		const currentLang = this.getAttribute('lang') ?? ancestorLang

		// this.#textElem.value = this.innerText
		this.#map.set(currentLang, this.innerText)
	}

	attributeChangedCallback(name, oldValue, newValue) {
		if(name === 'lang') {
			if(this.#map.has(newValue)) {
				this.#slotElem?.remove()
				this.#textElem.textContent = this.#map.get(newValue)
			}

			loadLanguage(this.#key, newValue)
				.then(value => {
					// loaded
					this.#slotElem?.remove()
					this.#map.set(newValue, value)
					this.#textElem.textContent = value
				})
				.catch(e => console.warn(e))
		}
	}
}

customElements.define('localized-output', LocalizedOutput)