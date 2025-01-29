export type Cookie = {
	name: string;
	value: string;
	httpOnly?: boolean;
	secure?: boolean;
	maxAge?: number;
}

export class CookieJar {
	#cookies: Record<string, Cookie> = {};

	/**
	 * The list of cookies that have been set with `set()` which need to be
	 * sent to the client.
	 */
	#setCookies = new Set<string>();

	/**
	 * Initialize
	 */
	constructor(cookie?: string) {
		this.#cookies = Object.fromEntries(
			(cookie || '')
				.split(/;/g)
				.map(c => {
					const [k, v] = c.split('=').map(p => decodeURIComponent(p.trim()));
					return [k, {
						name: k,
						value: v
					}];
				})
		);
	}

	set(cookie: Cookie) {
		this.#cookies[cookie.name] = {...cookie};
		this.#setCookies.add(cookie.name);
	}
	
	get(name: string) {
		return this.#cookies[name] ? { ...this.#cookies[name] } : undefined;
	}

	delete(name: string) {
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
	 */
	getAll() {
		const all: Record<string, string> = {};
		for (const cookie of Object.values(this.#cookies)) {
			all[cookie.name] = cookie.value;
		}
		return all;
	}

	getSetCookies() {
		const all: Cookie[] = [];
		for (const name of this.#setCookies) {
			all.push({...this.#cookies[name]});
		}
		return all;
	}
}