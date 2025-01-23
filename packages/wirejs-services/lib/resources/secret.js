import process from 'process';
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';

const CWD = process.cwd();

/**
 * @type {Map<string, Secret>}
 */
const secrets = new Map();

export class Secret {
	#id;

	/**
	 * @param {string} id 
	 * @param {string} [value]
	 */
	constructor(id, value) {
		this.#id = id;
		secrets.set(id, this);
		if (!fs.existsSync(this.#filename())) {
			fs.mkdirSync(path.dirname(this.#filename()), { recursive: true });
			fs.writeFileSync(
				this.#filename(),
				value ?? crypto.randomBytes(64).toString('base64url')
			);
		}
	}

	#filename() {
		const sanitizedId = this.id.replace('~', '-').replace(/\.+/g, '.');
		return path.join(CWD, 'temp', 'wirejs-services', 'secrets', sanitizedId);
	}

	get id() {
		return this.#id;
	}

	async read() {
		return fs.promises.readFile(this.#filename(), 'utf8');
	}

	async write(value) {
		fs.promises.writeFile(this.#filename(), value);
	}
}