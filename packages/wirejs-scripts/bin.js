#!/usr/bin/env node

import process, { argv, env } from 'process';
import { rimraf } from 'rimraf';
import fs from 'fs';
import path from 'path';

import webpack from 'webpack';
import webpackConfigure from './configs/webpack.config.js';
import WebpackDevServer from 'webpack-dev-server';

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
	console.log('exec', cmd);
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

		logger.info('request parsed', {
			url,
			body,
			calls
		});

		const apiPath = path.join(CWD, 'api', 'index.js');
		const api = await import(`${apiPath}?cache-id=${new Date().getTime()}`);

		const responses = [];
		for (const call of calls) {
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
				static: {
					directory: path.join(CWD, 'dist')
				},
				open: Boolean(env['open']),
				proxy: {
					'/api': {
						bypass: handleApiResponse
					}
				}
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