import crypto from 'crypto';

async function simulateLatency() {
	return new Promise(unsleep => setTimeout(unsleep, 50));
}

/**
 * @type {Map<string, Secret>}
 */
const secrets = new Map();

export class Secret {
	#id;
	#value;

	/**
	 * @param {string} id 
	 * @param {string} [value]
	 */
	constructor(id, value) {
		this.#id = id;
		this.#value = value ?? crypto.randomBytes(64).toString('base64url');
		secrets.set(id, this);
	}

	get id() {
		return this.#id;
	}

	async read() {
		await simulateLatency();
		return this.#value;
	}

	async write(value) {
		await simulateLatency();
		this.#value = value;
	}
}