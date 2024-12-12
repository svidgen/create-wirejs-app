#!/usr/bin/env node

import process, { argv, env } from 'process';
import { rimraf } from 'rimraf';
import fs from 'fs';
import path from 'path';

import webpack from 'webpack';
import webpackConfigure from './configs/webpack.config.js';
import WebpackDevServer from 'webpack-dev-server';
import { log } from 'console';

import { JSDOM } from 'jsdom';
import { useJSDOM, dehydrate, pendingHydration } from 'wirejs-dom/v2';

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

async function exec(cmd) {
	logger.info('exec', cmd);
	return new Promise((resolve, reject) => {
		let proc;
		proc = child_process.exec(cmd, (error, stdout, stderr) => {
			processes.splice(processes.indexOf(proc), 1);
			if (error || stderr) {
				reject({ error, stderr });
			} else {
				resolve(stdout);
			}
		});
		processes.push(proc);
	});
}

/**
 * 
 * @param {object} api
 * @param {{method: string, args: any[]}} call
 * @returns {Promise<any>}
 */
async function callApiMethod(api, call) {
	try {
		const [scope, ...restOfScope] = call.method.split('.');
		if (typeof api[scope] === 'function' && restOfScope.length === 0) {
			return {
				data: await api[scope](...call.args)
			};
		} else if (typeof api[scope] === 'object' && restOfScope.length > 0) {
			return callApiMethod(api[scope], {
				...call,
				method: restOfScope.join('.'),
			});
		} else {
			return { error: "Method not found" };
		}
	} catch (error) {
		return { error };
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

	if (url === '/api') {
		const body = await postData(req);
		const calls = JSON.parse(body);
		logger.info('handling API request', body);

		const apiPath = path.join(CWD, 'api', 'index.js');
		const api = await import(`${apiPath}?cache-id=${new Date().getTime()}`);

		const responses = [];
		for (const call of calls) {
			logger.info('handling API call', call);
			responses.push(await callApiMethod(api, call));
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
				/* static: {
					directory: path.join(CWD, 'dist')
				}, */
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
