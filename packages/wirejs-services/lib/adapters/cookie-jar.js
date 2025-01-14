/**
 * @typedef {Object} Cookie
 * @property {string} name
 * @property {string} value
 * @property {number} [maxAge] - The maximum age (TTL) in seconds
 * @property {boolean} [httpOnly] - Whether the cookie is only accessible to the client (not JS)
 * @property {boolean} [secure] - Whether the cookie should only be sent over HTTPS (or localhost)
 */

export class CookieJar {
	/**
	 * @type {Record<string, Cookie>}
	 */
	#cookies = {};

	/**
	 * The list of cookies that have been set with `set()` which need to be
	 * sent to the client.
	 * 
	 * @type {Set<string>}
	 */
	#setCookies = new Set();

	/**
	 * Initialize
	 * 
	 * @param {Record<string, Cookie>} cookies 
	 */
	constructor(cookies) {
		for (const cookie of Object.values(cookies)) {
			this.#cookies[cookie.name] = {...cookie};
		}
	}

	/**
	 * @param {Cookie} cookie 
	 */
	set(cookie) {
		this.#cookies[cookie.name] = {...cookie};
		this.#setCookies.add(cookie.name);
	}
	
	/**
	 * 
	 * @param {string} name 
	 * @returns {Cookie | undefined}
	 */
	get(name) {
		return {...this.#cookies.get(name)};
	}

	/**
	 * 
	 * @param {string} name 
	 */
	delete(name) {
		if (this.#cookies[name]) {
			this.#cookies[name].value = '-- deleted --';
			this.#cookies[name].maxAge = 0;
			this.#setCookies.add(name);
		}
	}

	/**
	 * Gets a copy of all cookies.
	 * 
	 * Changes made to this copy are not reflected
	 * 
	 * @returns {Record<string, string>}
	 */
	getAll() {
		const all = {};
		for (const cookie of Object.values(this.#cookies)) {
			all[cookie.name] = cookie.value;
		}
		return all;
	}

	getSetCookies() {
		const all = [];
		for (const name of this.#setCookies) {
			all.push({...this.#cookies[name]});
		}
		return all;
	}
}