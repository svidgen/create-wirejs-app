import { scrypt, randomBytes } from 'crypto';

import * as jose from 'jose';

import { Resource } from '../resource.js';
import { Secret } from '../resources/secret.js';
import { FileService } from './file.js';
import { CookieJar } from '../adapters/cookie-jar.js';
import { withContext } from '../adapters/context.js';


/**
 * @param {string} password 
 * @param {string} [salt]
 */
function hash(password, salt) {
	return new Promise((resolve, reject) => {
		const finalSalt = salt || randomBytes(16).toString('hex');
		scrypt(password, finalSalt, 64, (err, key) => {
			if (err) {
				reject(err);
			} else {
				resolve(`${finalSalt}$${key.toString('hex')}`);
			}
		})
	});
}

/**
 * @param {string} password 
 * @param {string} passwordHash 
 */
async function verifyHash(password, passwordHash) {
	const [saltPart, _hashPart] = passwordHash.split('$');
	const rehashed = await hash(password, saltPart);
	return rehashed === passwordHash;
}

/**
 * @typedef {{
 * 	id: string;
 * 	password: string;
 * }} User
 */

/**
 * @typedef {{
 * 	label: string;
 * 	type: 'string' | 'password' | 'number' | 'boolean';
 * 	isRequired?: boolean;
 * }} AuthenticationInput
 */

/**
 * @typedef {{
 * 	name: string;
 * 	title?: string;
 * 	description?: string;
 * 	message?: string;
 * 	inputs?: Record<string, AuthenticationInput>;
 * 	buttons?: string[];
 * }} Action
 */

/**
 * @typedef {{
 * 	state: 'authenticated' | 'unauthenticated';
 * 	user: string | undefined;
 * }} AuthenticationBaseState
 */

/**
 * @typedef {{
 * 	state: AuthenticationBaseState;
 * 	message?: string;
 * 	actions: Record<string, Action>;
 * }} AuthenticationState
 */

/**
 * @typedef {{
 * 	key: string;
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

const ONE_WEEK = 7 * 24 * 60 * 60; // days * hours/day * minutes/hour * seconds/minute

export class AuthenticationService extends Resource {
	#duration;
	#keepalive;
	#cookieName;

	/**
	 * @type {Secret}
	 */
	#rawSigningSecret;

	/**
	 * @type {Promise<Uint8Array<ArrayBufferLike>> | undefined}
	 */
	#signingSecret;

	#users;

	/**
	 * 
	 * @param {Resource | string} scope
	 * @param {string} id 
	 * @param {AuthenticationServiceOptions} [options]
	 */
	constructor(scope, id, { duration, keepalive, cookie } = {}) {
		super(scope, id);

		this.#duration = duration || ONE_WEEK;
		this.#keepalive = !!keepalive;
		this.#cookieName = cookie ?? 'identity';

		this.#rawSigningSecret = new Secret(this, 'jwt-signing-secret');
		const fileService = new FileService(this, 'files');

		this.#users = {
			id,
			
			/**
			 * 
			 * @param {string} username
			 */
			async get(username) {
				try {
					const data = await fileService.read(this.filenameFor(username));
					return JSON.parse(data);
				} catch {
					return undefined;
				}
			},

			/**
			 * @param {string} username
			 * @param {User} user
			 */
			async set(username, details) {
				await fileService.write(this.filenameFor(username), JSON.stringify(details));
			},

			/**
			 * @param {string} username
			 */
			async has(username) {
				const user = await this.get(username);
				return !!user;
			},

			/**
			 * @param {string} username 
			 * @returns 
			 */
			filenameFor(username) {
				return `${username}.json`;
			}
		}
	}

	async getSigningSecret() {
		const secretAsString = await this.#rawSigningSecret.read();
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
		let idCookie, idPayload, user;

		try {
			idCookie = cookies.get(this.#cookieName)?.value;
			idPayload = idCookie ? (
				await jose.jwtVerify(idCookie, await this.signingSecret)
			) : undefined;
			user = idPayload ? idPayload.payload.sub : undefined;
		} catch (err) {
			// jose doesn't like our cookie.
			console.error(err);
		}

		if (user) {
			return {
				state: 'authenticated',
				user
			}
		} else {
			return {
				state: 'unauthenticated',
				user: undefined,
			}
		}
	}

	/**
	 * @param {CookieJar} cookies
	 * @returns {Promise<AuthenticationState>}
	 */
	async getState(cookies) {
		const state = await this.getBaseState(cookies);
		if (state.state === 'authenticated') {
			if (this.#keepalive) this.setBaseState(state);
			return {
				state,
				actions: {
					changepassword: {
						name: "Change Password",
						inputs: {
							existingPassword: {
								label: 'Old Password',
								type: 'password',
							},
							newPassword: {
								label: 'New Password',
								type: 'password',
							}
						},
						buttons: ['Change Password']
					},
					signout: {
						name: "Sign out"
					},
				}
			}
		} else {
			return {
				state,
				actions: {
					signin: {
						name: "Sign In",
						inputs: {
							username: {
								label: 'Username',
								type: 'text',
							},
							password: {
								label: 'Password',
								type: 'password',
							},
						},
						buttons: ['Sign In']
					},
					signup: {
						name: "Sign Up",
						inputs: {
							username: {
								label: 'Username',
								type: 'text',
							},
							password: {
								label: 'Password',
								type: 'password',
							},
						},
						buttons: ['Sign Up']
					},
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
		if (!user) {
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
				maxAge: this.#duration
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
	 * @returns {Promise<AuthenticationState | { errors: AuthenticationError[] }>}
	 */
	async setState(cookies, { key, inputs, verb: _verb }) {
		if (key === 'signout') {
			await this.setBaseState(cookies, undefined);
			return this.getState(cookies);
		} else if (key === 'signup') {
			const errors = this.missingFieldErrors(inputs, ['username', 'password']);
			if (errors) {
				return { errors };
			} else if (await this.#users.has(inputs.username)) {
				return { errors: 
						[{
						field: 'username',
						message: 'User already exists.'
					}]
				};
			} else {
				await this.#users.set(inputs.username, {
					id: inputs.username,
					password: await hash(inputs.password)
				});
				await this.setBaseState(cookies, inputs.username);
				return this.getState(cookies);
			}
		} else if (key === 'signin') {
			const user = await this.#users.get(inputs.username);
			if (!user) {
				return { errors:
					[{
						field: 'username',
						message: `User doesn't exist.`
					}]
				};
			} else if (await verifyHash(inputs.password, user.password)) {
				// a real authentication service will use password hashing.
				// this is an in-memory just-for-testing user pool.
				await this.setBaseState(cookies, inputs.username);
				return this.getState(cookies);
			} else {
				return { errors:
					[{
						field: 'password',
						message: "Incorrect password."
					}]
				};
			}
		} else if (key === 'changepassword') {
			const state = await this.getBaseState(cookies);
			const user = await this.#users.get(state.user);
			if (!user) {
				return { errors:
					[{
						field: 'username',
						message: `You're not signed in as a recognized user.`
					}]
				};
			} else if (await verifyHash(inputs.existingPassword, user.password)) {
				await this.#users.set(user.id, {
					...user,
					password: await hash(inputs.newPassword)
				});
				return {
					message: "Password updated.",
					...await this.getState(cookies)
				};
			} else {
				return { errors: [{
						field: 'existingPassword',
						message: "The provided existing password is incorrect."
					}]
				};
			}
		} else {
			return { errors: 
				[{
					message: 'Unrecognized authentication action.'
				}]
			};
		}
	}

	buildApi() {
		return withContext(context => ({
			getState: () => this.getState(context.cookies),

			/**
			 * 
			 * @param {Parameters<typeof this['setState']>[1]} options 
			 * @returns 
			 */
			setState: (options) => this.setState(context.cookies, options),
		}));
	}
}