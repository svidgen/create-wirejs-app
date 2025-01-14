// import bcrypt from 'bcrypt';

/**
 * @typedef {{
 * 	id: string;
 * 	email: string;
 * 	passwordHash: string;
 * }} User
 */

/**
 * @typedef {{
 * 	name: string;
 * 	type: 'string' | 'password' | 'number' | 'boolean';
 * 	isRequired: boolean;
 * }} AuthenticationInput
 */

/**
 * @typedef {{
 * 	name: string;
 * 	title: string;
 * 	message?: string;
 * 	inputs: AuthenticationInput[];
 * 	verbs: string[];
 * }} Action
 */

/**
 * @typedef {{
 * 	user: null | User;
 * 	availableActions: Action[];
 * }} AuthenticationState
 */

/**
 * @typedef {{
 * 	name: string;
 * 	inputs: Record<string, string | number | boolean>;
 * 	verb: string;
 * }} PerformActionParameter
 */

/**
 * @typedef {{
 * 	message: string;
 * 	field: string | undefined;
 * }} AuthenticationError
 */

/**
 * @type {Map<string, AuthService>}
 */
const services = new Map();

export class AuthenticationService {
	id;

	/**
	 * @type {Map<string, User>}
	 */
	#users = new Map();

	constructor({ id }) {
		this.id = id;
		services.set(id, this);
	}

	/**
	 * @param {PerformActionParameter?} params
	 * @returns {Promise<AuthenticationState | AuthenticationError[]>}
	 */
	async getState({ name, inputs, verb } = undefined) {

	}
}
