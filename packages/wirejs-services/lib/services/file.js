async function simulateLatency() {
	return new Promise(unsleep => setTimeout(unsleep, 10));
}

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
	constructor(id) {
		this.id = id;
		if (services.has(id)) {
			this.files = services.get(id).files;
		} else {
			services.set(id, this);
		}
	}

	/**
	 * @param {string} filename
	 * @return {Promise<string>} file data as a string
	 */
	async read(filename) {
		await simulateLatency();
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
		await simulateLatency();
		this.files.set(filename, data);
	}

	/**
	 * 
	 * @param {string} filename 
	 */
	async delete(filename) {
		await simulateLatency();
		this.files.delete(filename);
	}

	/**
	 * 
	 * @param {{
	 * 	prefix?: string
	 * }} [options]
	 */
	async * list({ prefix } = {}) {
		await simulateLatency();
		let count = 0;
		for (const name of this.files.keys()) {
			count++;
			if (count % 1000 == 0) await simulateLatency();
			if (prefix === undefined || name.startsWith(prefix)) yield name;
		}
	}
}