import process from 'process';
import fs from 'fs';
import path from 'path';

import { Resource } from '../resource.js';

const CWD = process.cwd();

const ALREADY_EXISTS_CODE = 'EEXIST';

export class FileService extends Resource {
	/**
	 * @param {Resource | string} scope
	 * @param {string} id
	 */
	constructor(scope, id) {
		super(scope, id);
	}

	/**
	 * @param {string} filename 
	 * @returns 
	 */
	#fullNameFor(filename) {
		const sanitizedId = this.absoluteId.replace('~', '-').replace(/\.+/g, '.');
		const sanitizedName = filename.replace('~', '-').replace(/\.+/g, '.');
		return path.join(CWD, 'temp', 'wirejs-services', sanitizedId, sanitizedName);
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
	 * @param {{
	 * 	onlyIfNotExists?: boolean;
	 * }} [options]
	 */
	async write(filename, data, { onlyIfNotExists = false } = {}) {
		const fullname = this.#fullNameFor(filename);
		const flag = onlyIfNotExists ? 'wx' : 'w';
		await fs.promises.mkdir(path.dirname(fullname), { recursive: true });
		return fs.promises.writeFile(fullname, data, { flag });
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

	isAlreadyExistsError(error) {
		return error.code === ALREADY_EXISTS_CODE;
	}
}