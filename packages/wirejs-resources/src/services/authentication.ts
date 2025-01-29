import { scrypt, randomBytes } from 'crypto';

import * as jose from 'jose';

import { Resource } from '../resource.js';
import { FileService } from './file.js';
import { Secret } from '../resources/secret.js';
import { withContext } from '../adapters/context.js';
import { overrides } from '../overrides.js';
import type { CookieJar } from '../adapters/cookie-jar.js';

function hash(password: string, salt?: string): Promise<string> {
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

async function verifyHash(password: string, passwordHash: string): Promise<boolean> {
	const [saltPart, _hashPart] = passwordHash.split('$');
	const rehashed = await hash(password, saltPart);
	return rehashed === passwordHash;
}

// #region types

type User = {
	id: string;
	password: string;
};

type AuthenticationInput = {
	label: string;
	type: 'text' | 'password';
	isRequired?: boolean;
};

type Action = {
	name: string;
	title?: string;
	description?: string;
	message?: string;
	inputs?: Record<string, AuthenticationInput>;
	buttons?: string[];
};

type AuthenticationBaseState = {
	state: 'authenticated' | 'unauthenticated';
	user: string | undefined;
};

type AuthenticationState = {
	state: AuthenticationBaseState;
	message?: string;
	actions: Record<string, Action>;
};

type PerformActionParameter = {
	key: string;
	inputs: Record<string, string | number | boolean>;
	verb: string;
};

type AuthenticationError = {
	message: string;
	field?: string;
};

type AuthenticationServiceOptions = {
	/**
	 * The number of seconds the authentication session stays alive.
	 */
	duration?: number;

	/**
	 * Whether to automatically extend (keep alive) an authentication session when used.
	 */
	keepalive?: boolean;

	/**
	 * The name of the cookie to use to store the authentication state JWT.
	 */
	cookie?: string;
}

type SetOfUsers = {
	get(username: string): Promise<User | undefined>;
	set(username: string, user: User): Promise<void>;
	has(username: string): Promise<boolean>;
}

// #endregion

const ONE_WEEK = 7 * 24 * 60 * 60; // days * hours/day * minutes/hour * seconds/minute

export class AuthenticationService extends Resource {
	#duration: number;;
	#keepalive: boolean;
	#cookieName: string;
	#rawSigningSecret: Secret;
	#signingSecret: Promise<Uint8Array<ArrayBufferLike>> | undefined;
	#users: SetOfUsers;

	constructor(
		scope: Resource | string,
		id: string,
		{ duration, keepalive, cookie }: AuthenticationServiceOptions = {}
	) {
		super(scope, id);

		this.#duration = duration || ONE_WEEK;
		this.#keepalive = !!keepalive;
		this.#cookieName = cookie ?? 'identity';

		this.#rawSigningSecret = new (overrides.Secret || Secret)(this, 'jwt-signing-secret');
		const fileService = new (overrides.FileService || FileService)(this, 'files');

		this.#users = {
			id,
			
			async get(username: string) {
				try {
					const data = await fileService.read(this.filenameFor(username));
					return JSON.parse(data);
				} catch {
					return undefined;
				}
			},

			async set(username: string, details: User) {
				await fileService.write(this.filenameFor(username), JSON.stringify(details));
			},

			async has(username: string) {
				const user = await this.get(username);
				return !!user;
			},

			filenameFor(username: string) {
				return `${username}.json`;
			}
		} as any;
	}

	async getSigningSecret(): Promise<Uint8Array<ArrayBufferLike>> {
		const secretAsString = await this.#rawSigningSecret.read();
		return new TextEncoder().encode(secretAsString);
	}

	get signingSecret(): Promise<Uint8Array<ArrayBufferLike>> {
		if (!this.#signingSecret) {
			this.#signingSecret = this.getSigningSecret();
		}
		return this.#signingSecret;
	}

	async getBaseState(cookies: CookieJar): Promise<AuthenticationBaseState> {
		let idCookie: string | undefined;
		let user: string | undefined;

		try {
			idCookie = cookies.get(this.#cookieName)?.value;
			const idPayload = idCookie ? (
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

	async getState(cookies: CookieJar): Promise<AuthenticationState> {
		const state = await this.getBaseState(cookies);
		if (state.state === 'authenticated') {
			if (this.#keepalive) this.setBaseState(cookies, state.user);
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

	async setBaseState(cookies: CookieJar, user?: string) {
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

	missingFieldErrors(
		input: Record<string, string | number | boolean>,
		fields: string[]
	): AuthenticationError[] | undefined {
		const errors: AuthenticationError[] = [];
		for (const field of fields) {
			if (!input[field]) errors.push({
				field,
				message: "Field is required."
			});
		}
		return errors.length > 0 ? errors : undefined;
	}

	async setState(
		cookies: CookieJar,
		{ key, inputs, verb: _verb }: PerformActionParameter
	): Promise<AuthenticationState | { errors: AuthenticationError[] }> {
		if (key === 'signout') {
			await this.setBaseState(cookies, undefined);
			return this.getState(cookies);
		} else if (key === 'signup') {
			const errors = this.missingFieldErrors(inputs, ['username', 'password']);
			if (errors) {
				return { errors };
			} else if (await this.#users.has(inputs.username as string)) {
				return { errors: 
						[{
						field: 'username',
						message: 'User already exists.'
					}]
				};
			} else {
				await this.#users.set(inputs.username as string, {
					id: inputs.username as string,
					password: await hash(inputs.password as string)
				});
				await this.setBaseState(cookies, inputs.username as string);
				return this.getState(cookies);
			}
		} else if (key === 'signin') {
			const user = await this.#users.get(inputs.username as string);
			if (!user) {
				return { errors:
					[{
						field: 'username',
						message: `User doesn't exist.`
					}]
				};
			} else if (await verifyHash(inputs.password as string, user.password)) {
				// a real authentication service will use password hashing.
				// this is an in-memory just-for-testing user pool.
				await this.setBaseState(cookies, inputs.username as string);
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
			const user = await this.#users.get(state.user!);
			if (!user) {
				return { errors:
					[{
						field: 'username',
						message: `You're not signed in as a recognized user.`
					}]
				};
			} else if (await verifyHash(inputs.existingPassword as string, user.password)) {
				await this.#users.set(user.id, {
					...user,
					password: await hash(inputs.newPassword as string)
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

	buildApi(this: AuthenticationService) {
		return withContext(context => ({
			getState: () => this.getState(context.cookies),

			setState: (
				options: Parameters<typeof this['setState']>[1]
			) => this.setState(context.cookies, options),
		}));
	}
}