/**
 * @type {Map<string, FileService>}
 */
const services = new Map();

export class FileService {
	id;

	/**
	 * @type {Map<string, string>}
	 */
	files = new Map();

	/**
	 * 
	 * @param {{
	 * 	id: string
	 * }} options
	 */
	constructor({ id }) {
		this.id = id;
		services.set(id, this);
	}

	/**
	 * @param {string} filename
	 * @return {Promise<string>} file data as a string
	 */
	async read(filename) {
		const data = this.files.get(filename);
		if (data === undefined) throw new Error(`File not found`);
		return data;
	}

	/**
	 * 
	 * @param {string} filename 
	 * @param {string} data 
	 */
	async write(filename, data) {
		this.files.set(filename, data);
	}

	/**
	 * 
	 * @param {string} filename 
	 */
	async delete(filename) {
		this.files.delete(filename);
	}

	/**
	 * 
	 * @param {{
	 * 	prefix?: string
	 * }} options
	 */
	async * list({ prefix }) {
		for (const name of this.files.keys()) {
			if (name.startsWith(prefix)) yield name;
		}
	}
}