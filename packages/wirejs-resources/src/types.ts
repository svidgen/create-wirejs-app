export type User = {
	/**
	 * Something that uniquely identifies the user in the authentication system
	 * and does not change over time.
	 */
	id: string;
	
	/**
	 * The self-identifier the user has chosen to log in with.
	 */
	username: string;

	/**
	 * The name this user will be known by to other users.
	 */
	displayName: string;
};

export type AuthenticationField = {
	label: string;
	type: 'text' | 'password';
	isRequired?: boolean;
};

export type AuthenticationAction = {
	name: string;
	title?: string;
	description?: string;
	message?: string;
	fields?: Record<string, AuthenticationField>;
	buttons?: readonly string[];
};

export type AuthenticationState = {
	state: 'authenticated' | 'unauthenticated';
	user: User | undefined;
};

export type AuthenticationMachineAction = Readonly<AuthenticationAction & { key: string; }>;

export type AuthenticationMachineState = AuthenticationState & {
	message?: string;
	actions: Record<string, AuthenticationMachineAction>;
};

export type AuthenticationMachineInput = {
	key: string;
	inputs?: Record<string, string | number | boolean>;
	verb?: string;
};

export type AuthenticationMachineInputFor<T extends AuthenticationMachineAction> = {
	key: T['key'];
	verb: string;
	inputs: T['fields'] extends undefined ? Record<string, never> : {
		[K in keyof T['fields']]: FieldInputFor<T['fields'][K]>
	}
}

// pretty simple for now!
export type FieldInputFor<T> =
	T extends AuthenticationField ? 
		T['type'] extends ('text' | 'password') ? string : never
	: never;

export type AuthenticationError = {
	message: string;
	field?: string;
};

export type AuthenticationServiceOptions = {
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
};