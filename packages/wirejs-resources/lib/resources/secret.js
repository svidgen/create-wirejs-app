import crypto from 'crypto';
import { Resource } from '../resource.js';
import { FileService } from '../services/file.js';
import { overrides } from '../overrides.js';

const FILENAME = 'secret';

export class Secret extends Resource {
	/**
	 * @type {FileService}
	 */
	#fileService;

	/**
	 * @type {Promise<any>}
	 */
	#initPromise;

	/**
	 * @param {Resource | string}
	 * @param {string} id 
	 */
	constructor(scope, id) {
		super(scope, id);
		this.#fileService = new (overrides.FileService || FileService)(this, 'files');
	}

	#initialize() {
		this.#initPromise = this.#initPromise || this.#fileService.write(
			FILENAME,
			JSON.stringify(crypto.randomBytes(64).toString('base64url')),
			{ onlyIfNotExists: true }
		).catch(error => {
			if (!this.#fileService.isAlreadyExistsError(error)) throw error;
		});
		return this.#initPromise;
	}

	/**
	 * @returns {any}
	 */
	async read() {
		await this.#initialize();
		return JSON.parse(await this.#fileService.read(FILENAME));
	}

	/**
	 * @param {any} data 
	 */
	async write(data) {
		await this.#initialize();
		await this.#fileService.write(FILENAME, JSON.stringify(data));
	}
}