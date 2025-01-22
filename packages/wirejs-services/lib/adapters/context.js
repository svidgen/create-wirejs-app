import { CookieJar } from "./cookie-jar.js";

const contextWrappers = new Set();

/**
 * @typedef {(...args: any) => any} ApiMethod
 */

/**
 * @typedef {{
 * 	[K in string]: ApiMethod | ApiNamespace
 * }} ApiNamespace
 */

/**
 * @template T
 * @typedef {T extends ((...args: infer ARGS) => infer RT)
 * 	? ((
 * 		context: Context | boolean,
 * 		...args: ARGS
 * 	) => RT extends Promise<any> ? RT : Promise<RT>) : never
 * } ContextfulApiMethod
 */

/**
 * @template T
 * @typedef {{
 * 	[K in keyof T]: T[K] extends ApiMethod
 * 	? ContextfulApiMethod<T[K]>
 * 	: ContextfulApiNamespace<T[K]>
 * }} ContextfulApiNamespace
 */

/**
 * @template {ApiNamespace | ApiMethod} T
 * @typedef {T extends ApiMethod
 * 	? ContextfulApiMethod<T>
 * 	: ContextfulApiNamespace<T>
 * } ContextWrapped
 */

/**
 * @template {ApiMethod | ApiNamespace} T
 * @param {(context: Context) => T} contextWrapper
 * @param {string[]} [path]
 * @returns {ContextWrapped<T>}
 */
export function withContext(contextWrapper, path = []) {
	// first param needs to be a function, which enables `Proxy` to implement `apply()`.
	const fnOrNs = new Proxy(function() {}, {
		apply(_target, _thisArg, args) {
			const [context, ...remainingArgs] = args;
			let functionOrNamespaceObject = contextWrapper(context);
			console.log({context, args, functionOrNamespaceObject, path});
			for (const k of path) {
				functionOrNamespaceObject = functionOrNamespaceObject[k];
			}
			return functionOrNamespaceObject(...remainingArgs);
		},
		get(_target, prop) {
			return withContext(contextWrapper, [...path, prop])
		}
	});
	contextWrappers.add(fnOrNs);
	return fnOrNs;
}

/**
 * 
 * @param {Object} fnOrNS
 * @returns {fnOrNS is (context: Context) => T}
 */
export function requiresContext(fnOrNS) {
	return contextWrappers.has(fnOrNS);
}

export class Context {
	/**
	 * @type {CookieJar} cookies
	 */
	cookies;

	/**
	 * @param {CookieJar} cookies
	 */
	constructor(cookies) {
		this.cookies = cookies;
	}
}