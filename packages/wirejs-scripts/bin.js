#!/usr/bin/env node

import process, { env } from 'process';
import { rimraf } from 'rimraf';
import fs from 'fs';
import path from 'path';

import webpack from 'webpack';
import webpackConfigure from './configs/webpack.config.js';
import WebpackDevServer from 'webpack-dev-server';

import { JSDOM } from 'jsdom';
import { useJSDOM, dehydrate, pendingHydration } from 'wirejs-dom/v2';
import { requiresContext, Context, CookieJar } from 'wirejs-services';

const CWD = process.cwd();
const webpackConfig = webpackConfigure(process.env, process.argv);
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
			logger.info('api method resolved. invoking...');
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
		return { error: error.message };
	}
}

/**
 * @type {WebpackDevServer.ByPass}
 */
async function handleApiResponse(req, res) {
	const {
		headers, url, method, params, query,
		baseUrl, originalUrl, trailers
	} = req;

	const cookies = new CookieJar(req.headers.cookie);
	const context = new Context(cookies);

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

		logger.info('setting cookies', cookies.getSetCookies());
		for (const cookie of cookies.getSetCookies()) {
			const cookieOptions = {
				...(cookie.maxAge !== undefined ? { maxAge: cookie.maxAge * 1000 } : {}),
				httpOnly: !!cookie.httpOnly,
				secure: !!cookie.secure
			};
			logger.info('setting cookie', cookie.name, cookie.value, cookieOptions);
			res.cookie(cookie.name, cookie.value, cookieOptions);
		}

		res.send(JSON.stringify(
			responses
		));
	} else {
		logger.error('Bad endpoint given', { url });

		res.status(404);
		res.send("404 - Endpoint not found");
	}
}

function fullPathFrom(req) {
	const relativePath = req.url === '/' ? 'index.html' : req.url;
	return path.join(CWD, 'dist', relativePath);
}

async function tryStaticPath(req, res, fs) {
	const fullPath = fullPathFrom(req);

	logger.info('checking static', fullPath);
	if (!fs.existsSync(fullPath)) return false;
	logger.info('static found');

	if (fullPath.endsWith(".html")) {
		res.setHeader('Content-Type', 'text/html');
	} else if (fullPath.endsWith(".js")) {
		res.setHeader('Content-Type', 'text/javascript');
	} else {
		res.setHeader('Content-Type', 'text/plain');
	}

	try {
		res.send(fs.readFileSync(fullPath));
	} catch {
		res.status(404);
		res.send("404 - File not found");
	}

	return true;
}

async function trySSRScriptPath(req, res, fs) {
	const srcPath = path.join(CWD, 'dist', 'ssr', req.url);

	logger.info('checking SSR script path', srcPath);
	if (!fs.existsSync(srcPath)) return false;
	logger.info('script path found');

	res.setHeader('Content-Type', 'text/javascript');

	try {
		res.send(fs.readFileSync(srcPath));
	} catch {
		res.status(404);
		res.send("404 - File not found");
	}

	return true;
}

async function trySSRPath(req, res, wfs) {
	const asJSPath = req.url.replace(/\.(\w+)$/, '.js');
	logger.info('src JS path', asJSPath);

	const fullPath = path.join(CWD, 'dist', 'ssr', asJSPath);
	const srcPath = path.join(CWD, 'src', 'ssr', asJSPath);

	logger.info('checking ssr', srcPath);
	if (!fs.existsSync(srcPath)) return false;
	logger.info('ssr found');

	try {
		useJSDOM(JSDOM);
		global.self = global.window;
		const module = await import(`${srcPath}?cache-id=${new Date().getTime()}`);
		if (typeof module.generate === 'function') {
			const doc = await module.generate(fullPath);
			const doctype = doc.parentNode.doctype?.name || '';

			let hydrationsFound = 0;
			while (pendingHydration.length > 0) {
				const id = pendingHydration.shift().id;
				const el = doc.parentNode.getElementById(id)
				if (el) {
					dehydrate(el);
					hydrationsFound++;
				}
			}

			if (hydrationsFound) {
				const script = doc.parentNode.createElement('script');
				script.src = asJSPath;
				doc.parentNode.body.appendChild(script);
			}

			res.send([
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
		res.status(404);
		res.send("404 - File not found");
	}

	return true;
}

async function handleRequest(req, res, compiler) {
	logger.info('received', JSON.stringify({ url: req.url }, null, 2));

	if (req.url.startsWith('/api')) {
		return handleApiResponse(req, res, compiler);
	}

	const fs = compiler.outputFileSystem;

	if (await tryStaticPath(req, res, fs)) return;
	if (await trySSRScriptPath(req, res, fs)) return;
	if (await trySSRPath(req, res, fs)) return;
}

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
	const stats = await new Promise((resolve, reject) => {
		let compiler;
		if (watch) {
			compiler = webpack({
				...webpackConfig,
				mode: 'development'
			});

			const server = new WebpackDevServer({
				hot: false,
				liveReload: false,
				webSocketServer: false,
				open: Boolean(env['open']),
				devMiddleware: {
					index: false
				},
				proxy: [
					{
						context: ['', '/*'],
						bypass: (req, res) => handleRequest(req, res, compiler)
					}
				]
			}, compiler);

			logger.log('Starting server...');
			server.start().then(() => {
				resolve({});
			});
		} else {
			logger.log('instantiating webpack compiler');
			compiler = webpack(webpackConfig);
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

		rimraf.sync('dist');
		logger.log('cleared old dist folder');

		fs.mkdirSync('dist');
		logger.log('recreated dist folder');

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
	}

};

if (typeof engine[action] === 'function') {
	logger.log(`Running ${action} ... `);
	engine[action]().then(() => {
		logger.log('All done!');
	});
} else {
	logger.error(`Invalid wirejs-scripts action: ${action}`);
}
