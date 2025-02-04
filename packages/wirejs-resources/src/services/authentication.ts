import { scrypt, randomBytes, randomUUID } from 'crypto';

import * as jose from 'jose';

import { Resource } from '../resource.js';
import { FileService } from './file.js';
import { Secret } from '../resources/secret.js';
import { withContext } from '../adapters/context.js';
import { overrides } from '../overrides.js';
import type { CookieJar } from '../adapters/cookie-jar.js';
import type {
	User,
	AuthenticationError,
	AuthenticationMachineAction,
	AuthenticationMachineInput,
	AuthenticationMachineInputFor,
	AuthenticationMachineState,
	AuthenticationServiceOptions,
	AuthenticationState,
} from '../types.js';

/**
 * Saved under the username for looking the user up by username.
 */
type InternalUser = {
	id: string;
	username: string;
	password: string;
};


function newId() {
	return randomUUID();
}

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

const actions = {
	changepassword: {
		name: "Change Password",
		fields: {
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
	signin: {
		name: "Sign In",
		fields: {
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
		fields: {
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
	signout: {
		name: "Sign out"
	},
} as const;

function machineAction<
	K extends keyof typeof actions
>(key: K): Readonly<{ key: K } & typeof actions[K]> {
	return {
		key,
		...actions[key]
	};
}

function isAction<
	Action extends keyof typeof actions
>(
	input: AuthenticationMachineInput,
	action: Action
): input is AuthenticationMachineInputFor<
	Readonly<{ key: Action } & typeof actions[Action]>
> {
	return input.key === action;
}

function hasNonEmptyString(o: any, k: string): boolean {
	return (
		typeof o === 'object' && k in o && typeof o[k] === 'string' && o[k].length > 0
	);
}

function isInternalUser(candidate: unknown): candidate is InternalUser {
	return (
		hasNonEmptyString(candidate, 'id')
		&& hasNonEmptyString(candidate, 'password')
	);
}

const ONE_WEEK = 7 * 24 * 60 * 60; // days * hours/day * minutes/hour * seconds/minute

class UserStore {
	constructor(private files: FileService) {}

	async get(username: string): Promise<InternalUser | null> {
		try {
			const data = await this.files.read(`byUsername/${username}.json`);
			const parsed = JSON.parse(data) as unknown;
			return isInternalUser(parsed) ? parsed : null;
		} catch {
			return null;
		}
	}

	private async reserveId(username: string): Promise<string> {
		const candidateId = newId();

		try {
			await this.files.write(
				`byId/${candidateId}.json`,
				JSON.stringify({ username }),
				{ onlyIfNotExists: true }
			);
		} catch (err: any) {
			if (this.files.isAlreadyExistsError(err)) {
				return this.reserveId(username);
			} else {
				throw err;
			}
		}

		return candidateId;
	}

	private async releaseId(id: string): Promise<void> {
		return this.files.delete(`byId/${id}.json`);
	}

	private async createUserEntry(user: InternalUser, retries = 3):
		Promise<'ok' | 'fail' | 'already-exists'>
	{
		try {
			await this.files.write(
				`byUsername/${user.username}.json`,
				JSON.stringify(user),
				{ onlyIfNotExists: true }
			);
			return 'ok';
		} catch (err: any) {
			if (this.files.isAlreadyExistsError(err)) {
				return 'already-exists';
			} else {
				if (retries > 0) {
					await new Promise(unsleep => setTimeout(unsleep, 500));
					return this.createUserEntry(user, retries - 1);
				} else {
					return 'fail';
				}
			}
		}
	}

	async create(username: string, password: string):
		Promise<InternalUser | 'already-exists' | 'fail'>
	{
		const id = await this.reserveId(username);
		const user: InternalUser = { id, username, password };
		const result = await this.createUserEntry(user);
		switch (result) {
			case 'already-exists':
			case 'fail':
				try {
					await this.releaseId(id);
				} finally {
					return result;
				}
			case 'ok':
				return user;
			default:
				throw new Error("Unrecognized result from filesystem: " + result);
		}
	}

	async update(username: string, details: InternalUser): Promise<void> {
		await this.files.write(`byUsername/${username}`, JSON.stringify(details));
	}

	async has(username: string): Promise<boolean> {
		const user = await this.get(username);
		return !!user;
	}

	async getById(id: string): Promise<InternalUser | null> {
		try {
			const idJSON = await this.files.read(`byId/${id}.json`);
			const { username } = JSON.parse(idJSON);
			return this.get(username);
		} catch {
			return null;
		}
	}
}

export class AuthenticationService extends Resource {
	#duration: number;;
	#keepalive: boolean;
	#cookieName: string;
	#rawSigningSecret: Secret;
	#signingSecret: Promise<Uint8Array<ArrayBufferLike>> | undefined;
	#users: UserStore;

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

		this.#users = new UserStore(fileService);
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

	async getState(cookies: CookieJar): Promise<AuthenticationState> {
		let idCookie: string | undefined;
		let user: User | undefined;

		try {
			idCookie = cookies.get(this.#cookieName)?.value;
			const idPayload = idCookie ? (
				await jose.jwtVerify(idCookie, await this.signingSecret)
			) : undefined;
			user = idPayload ? {
				id: idPayload.payload.sub!,
				username: (idPayload.payload as any).username as string,
				displayName: (idPayload.payload as any).username as string,
			} : undefined;
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

	async getMachineState(cookies: CookieJar): Promise<AuthenticationMachineState> {
		const state = await this.getState(cookies);
		if (state.state === 'authenticated') {
			if (this.#keepalive) this.setState(cookies, state.user);
			return {
				...state,
				actions: {
					changepassword: machineAction('changepassword'),
					signout: machineAction('signout'),
				}
			}
		} else {
			return {
				...state,
				actions: {
					signin: machineAction('signin'),
					signup: machineAction('signup'),
				}
			}
		}
	}

	async setState(cookies: CookieJar, user?: User) {
		if (!user) {
			cookies.delete(this.#cookieName);
		} else {
			const jwt = await new jose.SignJWT(user)
				.setProtectedHeader({ alg: 'HS256' })
				.setIssuedAt()
				.setSubject(user.id)
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

	async setMachineState(
		cookies: CookieJar,
		form: AuthenticationMachineInput
	): Promise<AuthenticationMachineState | { errors: AuthenticationError[] }> {
		if (isAction(form, 'signout')) {
			await this.setState(cookies, undefined);
			return this.getMachineState(cookies);
		} else if (isAction(form, 'signup')) {
			const errors = this.missingFieldErrors(form.inputs, ['username', 'password']);
			if (errors) {
				return { errors };
			}
			
			const createResult = await this.#users.create(
				form.inputs.username,
				await hash(form.inputs.password)
			);

			if (createResult === 'already-exists') {
				return { errors: [{
					field: 'username',
					message: 'User already exists.'
				}]};
			} else if (createResult === 'fail') {
				return { errors: [{
					message: 'Internal error. Please try again.'
				}]};
			} else {
				await this.setState(cookies, {
					id: createResult.id,
					username: createResult.username,
					displayName: createResult.username,
				});
				return this.getMachineState(cookies);
			}
		} else if (isAction(form, 'signin')) {
			const user = await this.#users.get(form.inputs.username);
			if (!user) {
				return { errors:
					[{
						field: 'username',
						message: `User doesn't exist.`
					}]
				};
			} else if (await verifyHash(form.inputs.password, user.password)) {
				// a real authentication service will use password hashing.
				// this is an in-memory just-for-testing user pool.
				await this.setState(cookies, {
					id: user.id,
					username: user.username,
					displayName: user.username,
				});
				return this.getMachineState(cookies);
			} else {
				return { errors:
					[{
						field: 'password',
						message: "Incorrect password."
					}]
				};
			}
		} else if (isAction(form, 'changepassword')) {
			const state = await this.getState(cookies);
			const user = state.user ? await this.#users.get(state.user.username) : null;
			if (!user) {
				return { errors:
					[{
						field: 'username',
						message: `You're not signed in as a recognized user.`
					}]
				};
			} else if (await verifyHash(form.inputs.existingPassword, user.password)) {
				await this.#users.update(user.username, {
					...user,
					password: await hash(form.inputs.newPassword)
				});
				return {
					...await this.getMachineState(cookies),
					message: "Password updated.",
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
			getState: () => this.getMachineState(context.cookies),
			setState: (
				options: Parameters<typeof this['setMachineState']>[1]
			) => this.setMachineState(context.cookies, options),
			getCurrentUser: async (): Promise<User | null> => {
				const state = await this.getState(context.cookies);
				if (state.state === 'authenticated' && state.user) {
					return state.user;
				} else {
					return null;
				}
			},
			requireCurrentUser: async (): Promise<User> => {
				const state = await this.getState(context.cookies);
				if (state.state === 'authenticated' && state.user) {
					return state.user;
				} else {
					throw new Error("Unauthorized.");
				}
			}
		}));
	}
}