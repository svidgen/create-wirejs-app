#!/usr/bin/env node

import process from 'process';
import http from 'http';
import fs from 'fs';
import path from 'path';

import webpack from 'webpack';
import webpackConfigure from './configs/webpack.config.js';
import { rimraf } from 'rimraf';
import esbuild from 'esbuild';

import { JSDOM } from 'jsdom';
import { useJSDOM } from 'wirejs-dom/v2';
import { requiresContext, Context, CookieJar } from 'wirejs-resources';
import { prebuildApi } from 'wirejs-resources/internal';

const CWD = process.cwd();
const getWebpackConfig = () => webpackConfigure(process.env, process.argv);
const [_nodeBinPath, _scriptPath, action] = process.argv;
const processes = [];

const logger = {
	log(...items) {
		console.log('wirejs', ...items);
	},
	error(...items) {
		console.error('wirejs ERROR', ...items);
	},
	info(...items) {
		console.info('wirejs', ...items);
	},
	warn(...items) {
		console.warn('wirejs', ...items);
	}
};

const oldFetch = globalThis.fetch;
globalThis.fetch = (url, ...args) => {
	if (typeof url === 'string') {
		try {
			return fetch(new URL(url), ...args);
		} catch {
			return fetch(`http://localhost:3000${url}`, ...args);
		}
	} else {
		return oldFetch(url, ...args);
	}
}

/**
 * 
 * @param {http.IncomingMessage} req 
 * @returns 
 */
function createContext(req) {
	const { url, headers } = req;
	const origin = headers.origin || `http://${headers.host}`;
	const location = new URL(`${origin}${url}`);
	const cookies = new CookieJar(headers.cookie);
	return new Context({ cookies, location });
}

/**
 * 
 * @param {object} api
 * @param {{method: string, args: any[]}} call
 * @param {Context} context
 * @returns {Promise<any>}
 */
async function callApiMethod(api, call, context) {
	try {
		const [scope, ...rest] = call.method;
		logger.info('api method parsed', { scope, rest });
		if (rest.length === 0) {
			logger.info('api method resolved. invoking...', requiresContext(api[scope]));
			if (requiresContext(api[scope])) {
				return {
					data: await api[scope](context, ...call.args.slice(1))
				};
			} else {
				return {
					data: await api[scope](...call.args)
				};
			}
		} else {
			logger.info('nested scope found');
			return callApiMethod(api[scope], {
				...call,
				method: rest,
			}, context);
		}
	} catch (error) {
		console.log(error);
		return { error: error.message };
	}
}

/**
 * 
 * @param {http.IncomingMessage} req 
 * @param {http.ServerResponse} res 
 * @returns 
 */
async function handleApiResponse(req, res) {
	const {
		headers, url, method, params, query,
		baseUrl, originalUrl, trailers
	} = req;

	const context = createContext(req);

	if (url === '/api') {
		const body = await postData(req);
		const calls = JSON.parse(body);
		logger.info('handling API request', body);

		const apiPath = path.join(CWD, 'api', 'index.js');
		const api = await import(`${apiPath}?cache-id=${new Date().getTime()}`);

		const responses = [];
		for (const call of calls) {
			logger.info('handling API call', call);
			responses.push(await callApiMethod(api, call, context));
		}

		logger.info('setting cookies', context.cookies.getSetCookies());
		for (const cookie of context.cookies.getSetCookies()) {
			const cookieOptions = [];
			if (cookie.maxAge) cookieOptions.push(`Max-Age=${cookie.maxAge}`);
			if (cookie.httpOnly) cookieOptions.push('HttpOnly');
			if (cookie.secure) cookieOptions.push('Secure');
			
			logger.info('setting cookie', cookie.name, cookie.value, cookieOptions);
			res.appendHeader(
				'Set-Cookie',
				`${cookie.name}=${cookie.value}; ${cookieOptions.join('; ')}`
			);
		}

		res.setHeader('Content-Type', 'application/json; charset=utf-8')
		res.end(JSON.stringify(
			responses
		));
	} else {
		logger.error('Bad endpoint given', { url });

		res.statusCode = 404;
		res.end("404 - Endpoint not found");
	}
}

/**
 * 
 * @param {http.IncomingMessage} req 
 * @returns 
 */
function fullPathFrom(req) {
	const relativePath = req.url === '/' ? 'index.html' : req.url;
	return path.join(CWD, 'dist', relativePath);
}


/**
 * 
 * @param {http.IncomingMessage} req 
 * @param {http.ServerResponse} res 
 * @returns 
 */
async function tryStaticPath(req, res) {
	const fullPath = fullPathFrom(req);

	logger.info('checking static', fullPath);
	if (!fs.existsSync(fullPath)) return false;
	logger.info('static found');

	if (fullPath.endsWith(".html")) {
		res.setHeader('Content-Type', 'text/html; charset=utf-8');
	} else if (fullPath.endsWith(".js")) {
		res.setHeader('Content-Type', 'text/javascript; charset=utf-8');
	} else {
		res.setHeader('Content-Type', 'text/plain; charset=utf-8');
	}

	try {
		res.end(fs.readFileSync(fullPath));
	} catch {
		res.statusCode = 404;
		res.end("404 - File not found (b)");
	}

	return true;
}

/**
 * Compare two strings by length for sorting in order of increasing length.
 * 
 * @param {string} a 
 * @param {string} b 
 * @returns 
 */
function byLength(a, b) {
    return a.length - b.length;
}

/**
 * @param {string} pattern - string pattern, where `*` matches anything
 * @param {string} text 
 * @returns 
 */
function globMatch(pattern, text) {
    const parts = pattern.split('%');
    const regex = new RegExp(parts.join('.+'));
    return regex.test(text);
}

/**
 * 
 * @param {Context} context 
 * @param {string} [forceExt]
 */
function routeSSR(context, forceExt) {
	const SSR_ROOT = path.join(CWD, 'dist', 'ssr');
	const asJSPath = forceExt ?
		context.location.pathname.replace(/\.(\w+)$/, `.${forceExt}`)
		: context.location.pathname
	;
	const allHandlers = fs.readdirSync(SSR_ROOT, { recursive: true })
		.filter(p => p.endsWith('.js'))
		.map(p => `/${p}`)
	;
	const matchingHandlers = allHandlers.filter(h => globMatch(h, asJSPath));
	const match = matchingHandlers.sort(byLength).pop();

	if (match) {
		return path.join(SSR_ROOT, match);
	}
}

/**
 * @param {http.IncomingMessage} req 
 * @param {http.ServerResponse} res 
 * @returns 
 */
async function trySSRScriptPath(req, res) {
	const context = createContext(req);
	const srcPath = routeSSR(context);
	if (!srcPath) return false;

	logger.info('SSR handler associated script found', srcPath);

	res.setHeader('Content-Type', 'text/javascript');

	try {
		res.end(fs.readFileSync(srcPath));
	} catch {
		res.statusCode = 404;
		res.end("404 - File not found (c)");
	}

	return true;
}

/**
 * 
 * @param {http.IncomingMessage} req
 * @param {http.ServerResponse} res
 * @returns 
 */
async function trySSRPath(req, res) {
	const context = createContext(req);

	const asJSPath = context.location.pathname.replace(/\.(\w+)$/, '.js');
	const srcPath = routeSSR(context, 'js');
	if (!srcPath) return false;

	logger.info('SSR handler found', srcPath);

	try {
		useJSDOM(JSDOM);
		const self = {};
		const moduleData = await fs.promises.readFile(srcPath);
		eval(`${moduleData}`);
		const module = self.exports;
		if (typeof module.generate === 'function') {
			const doc = await module.generate(context);
			const doctype = doc.parentNode.doctype?.name || '';

			let hydrationsFound = 0;
			while (globalThis.pendingDehydrations?.length > 0) {
				globalThis.pendingDehydrations.shift()(doc);
				hydrationsFound++;
			}

			if (hydrationsFound) {
				const script = doc.parentNode.createElement('script');
				script.src = asJSPath;
				doc.parentNode.body.appendChild(script);
			}

			res.setHeader('Content-type', 'text/html; charset=utf-8');
			res.end([
				doctype ? `<!doctype ${doctype}>\n` : '',
				doc.outerHTML
			].join(''));

			return true;
		} else {
			logger.info('SSR module missing generate function');
			return false;
		}
	} catch (error) {
		logger.error('ssr error', error);
		res.statusCode = 404;
		res.end("404 - File not found (a)");
	}

	return true;
}

/**
 * 
 * @param {http.IncomingMessage} req 
 * @param {http.ServerResponse} res 
 * @param {any} compiler 
 * @returns 
 */
async function handleRequest(req, res, compiler) {
	logger.info('received', JSON.stringify({ url: req.url }, null, 2));

	if (req.url.startsWith('/api')) {
		return handleApiResponse(req, res, compiler);
	}

	// const fs = compiler.outputFileSystem;

	if (await tryStaticPath(req, res, fs)) return;
	if (await trySSRScriptPath(req, res, fs)) return;
	if (await trySSRPath(req, res, fs)) return;

	// if we've made it this far, we don't have what you're looking for
	res.statusCode = '404';
	res.end('404 - Not found');
}

/**
 * 
 * @param {http.IncomingMessage} request 
 * @returns 
 */
async function postData(request) {
	return new Promise((resolve, reject) => {
		const buffer = [];
		const timeout = setTimeout(() => {
			reject("Post data not received.");
		}, 5000);
		request.on('data', data => buffer.push(data));
		request.on('end', () => {
			if (!timeout) return;
			clearTimeout(timeout);
			resolve(buffer.join(''));
		});
	});
};

async function compile(watch = false) {
	const stats = await new Promise(async (resolve, reject) => {
		let compiler;
		if (watch) {
			const prebuild = await esbuild.context({
				entryPoints: [`${CWD}/src/**/*.ts`],
				outdir: `${CWD}/pre-dist`,
				bundle: false,
				format: 'esm',
				conditions: ['wirejs:client'],
			});
			await prebuild.rebuild();
			prebuild.watch();
			webpack({
				...getWebpackConfig(),
				mode: 'development',
				watch: true
			}, () => {
				console.log();
				console.log('Compiled: http://localhost:3000/');
			}).run(() => {});

			logger.log('Starting server...');
			const server = http.createServer(handleRequest);
			server.listen(3000).on('listening', () => {
				console.log('Started listening on http://localhost:3000/')
			});
		} else {
			logger.log('prebundling JS');
			await esbuild.build({
				entryPoints: [`${CWD}/src/**/*.ts`],
				outdir: `${CWD}/pre-dist`,
				bundle: false,
				format: 'esm',
				conditions: ['wirejs:client'],
			});
			logger.log('starting webpack compiler');
			compiler = webpack(getWebpackConfig());
			compiler.run((err, res) => {
				logger.log('invoking webpack compiler');
				if (err) {
					logger.error('webpack compiler failed');
					logger.error(err);
					reject(err);
				} else {
					logger.error('webpack compiler succeeded');
					resolve(res);
				}
			});
		}
	});

	if (stats?.compilation?.errors?.length > 0) {
		logger.log('compilation errors', stats.compilation.errors);
		throw new Error('Build failed.');
	}

	return stats;
}

const engine = {
	async build({ watch = false } = {}) {
		logger.log('build starting');

		await rimraf('dist');
		logger.log('cleared old dist folder');

		await rimraf('pre-dist');
		logger.log('cleared old pre-dist folder');

		await fs.promises.mkdir('dist');
		logger.log('recreated dist folder');

		await fs.promises.mkdir('pre-dist');
		logger.log('recreated pre-dist folder');

		try {
			await compile(watch);
			logger.log('finished compile');
		} catch (err) {
			logger.error(err);
		}
		logger.log('build finished')
	},

	async start() {
		logger.log('starting')
		this.build({ watch: true });

		await new Promise(resolve => {
			function exitGracefully() {
				logger.log('Exiting gracefully ...');
				processes.forEach(p => p.kill());
				resolve();
			}
			process.on('SIGINT', exitGracefully);
			process.on('SIGTERM', exitGracefully);
		});

		// explicit exit forces lingering child processes to die.
		logger.log('stopping')
		process.exit();
	},

	async ['prebuild-api']() {
		logger.log("prebuilding api ...");
		await esbuild.build({
			entryPoints: [`${CWD}/**/*.ts`],
			outdir: CWD,
			platform: 'node',
			bundle: false,
			format: 'esm',
		});
		await prebuildApi();
		logger.log("api prebuild finished");
	},
};

if (typeof engine[action] === 'function') {
	logger.log(`Running ${action} ... `);
	engine[action]().then(() => {
		logger.log('All done!');
	});
} else {
	logger.error(`Invalid wirejs-scripts action: ${action}`);
}
