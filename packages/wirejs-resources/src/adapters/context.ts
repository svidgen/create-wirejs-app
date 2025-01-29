import { CookieJar } from "./cookie-jar.js";

const __requiresContext = Symbol('__requiresContext');

type ApiMethod = (...args: any) => any;

type ApiNamespace = {
	[K in string]: ApiMethod | ApiNamespace
};

type ContextfulApiMethod<T> = 
	T extends ((...args: infer ARGS) => infer RT)
	? ((context: Context | boolean, ...args: ARGS) => RT extends Promise<any>
		? RT
		: Promise<RT>
	) : never
;

type ContextfulApiNamespace<T> = {
	[K in keyof T]: T[K] extends ApiMethod
		? ContextfulApiMethod<T[K]>
		: ContextfulApiNamespace<T[K]>
};

type ContextWrapped<T extends ApiNamespace | ApiMethod> = 
	T extends ApiMethod
	? ContextfulApiMethod<T>
	: ContextfulApiNamespace<T>
;

export function withContext<
	T extends ApiMethod | ApiNamespace
>(
	contextWrapper: (context: Context) => T,
	path: string[] = []
): ContextWrapped<T> {
	// first param needs to be a function, which enables `Proxy` to implement `apply()`.
	const fnOrNs = new Proxy(function() {}, {
		apply(_target, _thisArg, args) {
			const [context, ...remainingArgs] = args;
			let functionOrNamespaceObject = contextWrapper(context) as any;
			console.log({context, args, functionOrNamespaceObject, path});
			for (const k of path) {
				functionOrNamespaceObject = functionOrNamespaceObject[k];
			}
			return functionOrNamespaceObject(...remainingArgs);
		},
		get(_target, prop: string | symbol) {
			if (prop === __requiresContext) return true;
			return withContext(contextWrapper, [...path, prop as string])
		}
	});
	return fnOrNs as any;
}

export function requiresContext(fnOrNS: Object): fnOrNS is (context: Context) => any {
	return (fnOrNS as any)[__requiresContext] === true;
}

export class Context {
	cookies: CookieJar;
	location: URL;

	constructor({ cookies, location }: {
		cookies: CookieJar,
		location: URL
	}) {
		this.cookies = cookies;
		this.location = location;
	}
}