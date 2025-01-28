import http from 'http';
import fs from 'fs';
import path from 'path';

import { JSDOM } from 'jsdom';
import { useJSDOM } from 'wirejs-dom/v2';
import { Context, CookieJar } from 'wirejs-resources';

const SSR_ROOT = path.join(path.dirname(module.filename), 'ssr');

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
    const parts = pattern.split('*');
    const regex = new RegExp(parts.join('.+'));
    return regex.test(text);
}

/**
 * 
 * @param {http.IncomingMessage} req 
 * @returns 
 */
function createContext(req) {
	const { url, headers } = req;
	const origin = headers.origin || `https://${headers.host}`;
	const location = new URL(`${origin}${url}`);
	const cookies = new CookieJar(headers.cookie);
	return new Context({ cookies, location });
}

/**
 * 
 * @param {Context} context 
 * @param {string} [forceExt]
 */
function routeSSR(context, forceExt) {
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
		global.self = global.window;
		await import(srcPath);
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

			res.setHeader('Content-type', 'text/html; charset=utf-8')
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
 * @returns 
 */
async function handleRequest(req, res) {
	logger.info('received', JSON.stringify({ url: req.url }, null, 2));

	if (await trySSRScriptPath(req, res)) return;
	if (await trySSRPath(req, res)) return;

	// if we've made it this far, we don't have what you're looking for
	res.statusCode = '404';
	res.end('404 - Not found');
}

const server = http.createServer(handleRequest);
server.listen(3000).on('listening', () => {
	console.log('Listening on port 3000')
});