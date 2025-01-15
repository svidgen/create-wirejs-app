import * as jose from 'jose';
import { Secret } from '../resources/secret.js';
import { CookieJar } from '../adapters/cookie-jar.js';

function simulateBaseLatency() {
	return new Promise(unsleep => setTimeout(unsleep, 100));
}

function simulateAuthenticateLatency() {
	return new Promise(unsleep => setTimeout(unsleep, 1000));
}

const signingSecret = new Secret('auth-signing-secret');

/**
 * @typedef {{
 * 	id: string;
 * 	password: string;
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
 * 	title?: string;
 * 	description?: string;
 * 	message?: string;
 * 	inputs?: AuthenticationInput[];
 * 	buttons?: string[];
 * }} Action
 */

/**
 * @typedef {{
 * 	state: 'authenticated' | 'unauthenticated',
 * 	user: string | undefined
 * }} AuthenticationBaseState
 */

/**
 * @typedef {{
 * 	state: AuthenticationBaseState,
 * 	actions: Record<string, Action>
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
 * 	field?: string;
 * }} AuthenticationError
 */

/**
 * @typedef {Object} AuthenticationServiceOptions
 * @property {number} [duration] - The number of seconds the authentication session stays alive.
 * @property {boolean} [keepalive] - Whether to automatically extend (keep alive) an authentication session when used.
 * @property {string} [cookie] - The name of the cookie to use to store the authentication state JWT.
 */

/**
 * @type {Map<string, AuthService>}
 */
const services = new Map();

const ONE_WEEK = 7 * 24 * 60 * 60; // days * hours/day * minutes/hour * seconds/minute

export class AuthenticationService {
	id;
	#duration;
	#keepalive;
	#cookieName;
	#signingSecret;

	/**
	 * @type {Map<string, User>}
	 */
	#users = new Map();

	/**
	 * 
	 * @param {string} id 
	 * @param {AuthenticationServiceOptions} [options]
	 */
	constructor(id, { duration, keepalive, cookie } = {}) {
		this.id = id;
		this.#duration = duration || ONE_WEEK;
		this.#keepalive = !!keepalive;
		this.#cookieName = cookie ?? 'identity';
		services.set(id, this);
	}

	async getSigningSecret() {
		const secretAsString = await signingSecret.read();
		return new TextEncoder().encode(secretAsString);
	}

	/**
	 * @type {Promise<Uint8Array<ArrayBufferLike>>}
	 */
	get signingSecret() {
		if (!this.#signingSecret) {
			this.#signingSecret = this.getSigningSecret();
		}
		return this.#signingSecret;
	}

	/**
	 * @param {CookieJar} cookies
	 * @returns {Promise<AuthenticationBaseState>}
	 */
	async getBaseState(cookies) {
		const idCookie = cookies.get(this.#cookieName)?.value;
		const idPayload = idCookie ? (
			await jose.jwtVerify(idCookie, await this.signingSecret)
		) : undefined;
		const user = idPayload ? idPayload.payload.sub : undefined;

		console.log({idCookie, idPayload, user});

		if (user) {
			return {
				state: {
					state: 'authenticated',
					user
				}
			}
		} else {
			return {
				state: {
					state: 'unauthenticated',
					user: undefined,
				}
			}
		}
	}

	/**
	 * @param {CookieJar} cookies
	 * @returns {Promise<AuthenticationState>}
	 */
	async getState(cookies) {
		await simulateBaseLatency();
		const state = await this.getBaseState(cookies);
		if (state.state === 'authenticated') {
			return {
				state,
				actions: {
					signout: {
						link: "Sign out"
					},
					changepassword: {
						name: "Change password",
						inputs: {
							existingPassword: 'password',
							newPassword: 'password'
						},
						buttons: ['Change Password']
					}
				}
			}
		} else {
			return {
				state,
				actions: {
					signup: {
						name: "Sign Up",
						inputs: {
							username: 'string',
							password: 'password',
						},
						buttons: ['Sign Up']
					},
					signin: {
						name: "Sign In",
						inputs: {
							username: 'string',
							password: 'password',
						},
						buttons: ['Sign In']
					}
				}
			}
		}
	}

	/**
	 * 
	 * @param {CookieJar} cookies 
	 * @param {string | undefined} [user]
	 */
	async setBaseState(cookies, user) {
		if (user) {
			cookies.delete(this.#cookieName);
		} else {
			const jwt = await new jose.SignJWT({})
				.setProtectedHeader({ alg: 'HS256' })
				.setIssuedAt()
				.setSubject(user)
				.setExpirationTime(`${this.#duration}s`)
				.sign(await this.signingSecret);

			cookies.set({
				name: this.#cookieName,
				value: jwt,
				httpOnly: true,
				secure: true,
				maxAge: this.duration
			});
		}	
	}

	/**
	 * 
	 * @param {Record<string, string>} input 
	 * @param {string[]} fields 
	 * @returns {AuthenticationError[] | undefined}
	 */
	missingFieldErrors(input, fields) {
		/**
		 * @type {AuthenticationError[]}
		 */
		const errors = [];
		for (const field of fields) {
			if (!input[field]) errors.push({
				field,
				message: "Field is required."
			});
		}
		return errors.length > 0 ? errors : undefined;
	}

	/**
	 * @param {CookieJar} cookies
	 * @param {PerformActionParameter} params
	 * @returns {Promise<AuthenticationState | AuthenticationError[]>}
	 */
	async setState(cookies, { name, inputs, verb: _verb }) {
		if (name === 'signout') {
			await simulateBaseLatency();
			this.setBaseState(cookies, undefined);
		} else if (name === 'signup') {
			await simulateAuthenticateLatency();
			const errors = this.missingFieldErrors(inputs, ['username', 'password']);
			if (errors) {
				return errors;
			} else if (this.#users.has(inputs.username)) {
				return [{
					field: 'username',
					message: 'User already exists.'
				}];
			} else {
				this.#users.set(inputs.username, {
					id: inputs.username,
					password: inputs.password
				});
			}
		} else if (name === 'signin') {
			await simulateAuthenticateLatency();
			const user = this.#users.get(inputs.username);
			if (!user) {
				return [{
					field: 'username',
					message: `User doesn't exist.`
				}];
			} else if (user.password === inputs.password) {
				// a real authentication service will use password hashing.
				// this is an in-memory just-for-testing user pool.
				this.setBaseState(cookies, inputs.username);
			}
		} else {
			await simulateBaseLatency();
			return [{
				message: 'Unrecognized authentication action.'
			}];
		}
	}
}