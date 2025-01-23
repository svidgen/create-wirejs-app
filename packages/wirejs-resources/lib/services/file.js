import process from 'process';
import fs from 'fs';
import path from 'path';

const CWD = process.cwd();

/**
 * @type {Map<string, FileService>}
 */
const services = new Map();

export class FileService {
	id;

	/**
	 * 
	 * @param {{
	 * 	id: string
	 * }} options
	 */
	constructor(id) {
		this.id = id;
		if (!services.has(id)) {
			services.set(id, this);
		}
	}

	/**
	 * @param {string} filename 
	 * @returns 
	 */
	#fullNameFor(filename) {
		const sanitizedId = this.id.replace('~', '-').replace(/\.+/g, '.');
		const sanitizedName = filename.replace('~', '-').replace(/\.+/g, '.');
		return path.join(CWD, 'temp', 'wirejs-services', 'files', sanitizedId, sanitizedName);
	}

	/**
	 * @param {string} filename
	 * @param {BufferEncoding} [encoding]
	 * @return {Promise<string>} file data as a string
	 */
	async read(filename, encoding = 'utf8') {
		return fs.promises.readFile(this.#fullNameFor(filename), { encoding });
	}

	/**
	 * 
	 * @param {string} filename 
	 * @param {string} data 
	 */
	async write(filename, data) {
		const fullname = this.#fullNameFor(filename);
		await fs.promises.mkdir(path.dirname(fullname), { recursive: true });
		return fs.promises.writeFile(fullname, data);
	}

	/**
	 * 
	 * @param {string} filename 
	 */
	async delete(filename) {
		return fs.promises.unlink(this.#fullNameFor(filename));
	}

	/**
	 * 
	 * @param {{
	 * 	prefix?: string
	 * }} [options]
	 */
	async * list({ prefix = '' } = {}) {
		const all = await fs.promises.readdir(CWD, { recursive: true });
		for (const name of all) {
			if (prefix === undefined || name.startsWith(prefix)) yield name;
		}
	}
}