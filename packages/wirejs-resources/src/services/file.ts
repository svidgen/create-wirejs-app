import process from 'process';
import fs from 'fs';
import path from 'path';

import { Resource } from '../resource.js';

const CWD = process.cwd();

const ALREADY_EXISTS_CODE = 'EEXIST';

export class FileService extends Resource {
	constructor(scope: Resource | string, id: string) {
		super(scope, id);
	}

	#fullNameFor(filename: string) {
		const sanitizedId = this.absoluteId.replace('~', '-').replace(/\.+/g, '.');
		const sanitizedName = filename.replace('~', '-').replace(/\.+/g, '.');
		return path.join(CWD, 'temp', 'wirejs-services', sanitizedId, sanitizedName);
	}

	async read(filename: string, encoding: BufferEncoding = 'utf8') {
		return fs.promises.readFile(this.#fullNameFor(filename), { encoding });
	}

	async write(
		filename: string,
		data: string,
		{ onlyIfNotExists = false } = {}
	) {
		const fullname = this.#fullNameFor(filename);
		const flag = onlyIfNotExists ? 'wx' : 'w';
		await fs.promises.mkdir(path.dirname(fullname), { recursive: true });
		return fs.promises.writeFile(fullname, data, { flag });
	}

	async delete(filename: string) {
		return fs.promises.unlink(this.#fullNameFor(filename));
	}

	async * list({ prefix = '' } = {}) {
		const all = await fs.promises.readdir(CWD, { recursive: true });
		for (const name of all) {
			if (prefix === undefined || name.startsWith(prefix)) yield name;
		}
	}

	isAlreadyExistsError(error: { code: any }) {
		return error.code === ALREADY_EXISTS_CODE;
	}
}