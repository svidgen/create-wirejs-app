import { CookieJar } from "./cookie-jar.js";

const contextWrappers = new Set();

/**
 * @template T
 * @param {(context: Context) => T} contextWrapper
 * @return {T}
 */
export function withContext(contextWrapper) {
	contextWrappers.add(contextWrapper);
	return contextWrapper;
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