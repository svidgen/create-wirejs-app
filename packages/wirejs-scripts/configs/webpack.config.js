import { useJSDOM } from 'wirejs-dom/v2';
import fs from 'fs';
import path from 'path';
import glob from 'glob';
import process from 'process';
import CopyWebpackPlugin from 'copy-webpack-plugin';
import marked from 'marked';
import { JSDOM } from 'jsdom';


const CWD = process.cwd();

// https://marked.js.org/using_advanced
marked.setOptions({
	highlight: function (code, lang) {
		try {
			const highlighter = require('highlight.js');
			const language = highlighter.getLanguage(lang) ? lang : 'plaintext';
			return highlighter.highlight(code, { language }).value;
		} catch (e) {
			console.log("highlight.js not installed. Skipping syntax highlighting.");
		}
	}
});

const BUILD_ID = (new Date()).getTime();

fs.writeFileSync('./src/build_id.json', JSON.stringify(BUILD_ID.toString()));

function distPath({ subpathOut = '', subpathIn = '', extensionOut } = {}) {
	return function ({ context, absoluteFilename }) {
		const prefixIn = path.resolve(context, subpathIn);
		const prefixOut = path.resolve(context, 'dist', subpathOut);
		const relativeName = path.join('./', absoluteFilename.slice(prefixIn.toString().length));
		const fullOutPath = extensionOut ?
			path.resolve(prefixOut, relativeName).replace(/\.\w+$/, ".html")
			: path.resolve(prefixOut, relativeName);
		console.log(`Mapping ${relativeName} to ${fullOutPath}`);
		return fullOutPath;
	};
};

const layouts = {};
const CollectLayouts = {
	transformer: (content, path) => {
		// add one to dirname prefix to include separating slash
		const relativePath = path.slice(CWD.length + 1);
		layouts[relativePath] = content.toString();
		return layouts[relativePath];
	}
};

const SSG = {
	transformer: async (content, _path) => {
		let _meta = {};

		let body;
		try {
            body = _path.endsWith('.md') ? marked(content.toString()) : content.toString();
		} catch (err) {
			console.error(`Could not parse page ${_path}`, err);
			throw err;
		}

		// apply no layout if the document has already provided the
		// overarching html structure.
		if (!_meta.layout && body && (
			String(body).startsWith('<!doctype html>')
			|| String(body).startsWith('<html'))
		) {
			return body;
		}

		const layoutPath = path.join(
			'src',
			'layouts',
			(_meta.layout || 'default')
		) + '.html';

		const layout = layouts[layoutPath];

		try {
			return layout;
		} catch (err) {
			console.error(`Could not parse layout ${layoutPath}`, err);
			throw err;
		}
	}
};

const Generated = {
	transformer: async (content, contentPath) => {
		useJSDOM(JSDOM);

		try {
			if (contentPath.endsWith('.js')) {
				const module = await import(contentPath);
				if (typeof module.generate === 'function') {
					const doc = await module.generate(contentPath);
					const doctype = doc.parentNode.doctype?.name || '';

					let hydrationsFound = 0;
					while (globalThis.pendingDehydrations?.length > 0) {
						globalThis.pendingDehydrations.shift()(doc);
						hydrationsFound++;
					}

					if (hydrationsFound) {
						const script = doc.parentNode.createElement('script');
						script.src = contentPath.substring((CWD + '/src/ssg').length);
						doc.parentNode.body.appendChild(script);
					}

					return [
						doctype ? `<!doctype ${doctype}>\n` : '',
						doc.outerHTML
					].join('');
				} else {
					return;
				}
			} else {
				return content.toString();
			}
		} catch (err) {
			console.error(`Could not generate page ${contentPath}`, err);
			throw err;
		}
	}
};

export default (env, argv) => {
	var devtool = 'source-map';
	if (argv.mode == 'development') {
		devtool = 'eval-cheap-source-map';
	}

	const sources = ['./src/index.js']
		.concat(glob.sync('./src/layouts/**/*.js'))
		.concat(glob.sync('./src/routes/**/*.js'))
		.concat(glob.sync('./src/ssg/**/*.js'))
		.concat(glob.sync('./src/ssr/**/*.js'))
	;

	const entry = sources.reduce((files, path) => {
		if (path.match(/src\/ssg/)) {
			files[path.toString().slice('./src/ssg'.length)] = path;
		} else if (path.match(/src\/ssr/)) {
			// keep SSR bundles in the ssr subfolder
			files[path.toString().slice('./src'.length)] = path;
		} else if (path.match(/src\/routes/)) {
			files[path.toString().slice('./src/routes'.length)] = path;
		} else if (path.match(/src\/layouts/)) {
			files[path.toString().slice('./src/'.length)] = path;
		}
		return files;
	}, {});

	return {
		// here's where we might need to select different "import" conditions,
		// which match with `exports: { path: { condition: "" } }` in package.json
		// for different build types for API's, SSR, etc.
		resolve: {
			conditionNames: ['wirejs:client'],
		},
		watchOptions: {
			ignored: [
				"**/dist/*",
				"**/node_modules/*"
			]
		},
		node: {
			__filename: true
		},
		entry,
		output: {
			filename: "[name]",
			library: {
				type: 'global',
				name: 'exports'
			}
		},
		target: 'web',
		devtool,
		plugins: [

			// TODO: does it make sense to actually handle static assets
			// first? then layouts? then everything else?

			// handle layouts first. other things depend on them.
			new CopyWebpackPlugin({
				patterns: [
					{
						from: './src/layouts/**/*.html',
						to: distPath({
							subpathIn: 'src/layouts',
							subpathOut: 'layouts'
						}),
						transform: CollectLayouts,
						noErrorOnMissing: true,
					},
				]
			}),

			// now pages, etc.
			new CopyWebpackPlugin({
				patterns: [
					{
						from: 'static',
						noErrorOnMissing: true,
						priority: 10,
					},
					{
						from: './src/ssg/**/*.js',
						to: distPath({ subpathIn: 'src/ssg', extensionOut: 'html' }),
						transform: Generated,
						noErrorOnMissing: true,
						priority: 5
					},
					// {
					// 	from: './src/routes/**/*.md',
					// 	to: distPath({ subpathIn: 'src/routes' }),
					// 	transform: SSG,
					// 	noErrorOnMissing: true,
					// 	priority: 3,
					// },
					// {
					// 	from: './src/routes/**/*.html',
					// 	to: distPath({ subpathIn: 'src/routes' }),
					// 	transform: SSG,
					// 	noErrorOnMissing: true,
					// 	priority: 3,
					// },
					// {
					// 	from: './src/routes/**/*.xml',
					// 	to: distPath({ subpathIn: 'src/routes' }),
					// 	transform: SSG,
					// 	noErrorOnMissing: true,
					// 	priority: 3,
					// },
					// {
					// 	from: './src/routes/**/*.rss',
					// 	to: distPath({ subpathIn: 'src/routes' }),
					// 	transform: SSG,
					// 	noErrorOnMissing: true,
					// 	priority: 3,
					// },
					// {
					// 	from: './src/routes/**/*.css',
					// 	to: distPath({ subpathIn: 'src/routes' }),
					// 	noErrorOnMissing: true,
					// 	// trasform: ???
					// 	priority: 3,
					// },
					// {
					// 	from: './src/routes/**/*.png',
					// 	to: distPath({ subpathIn: 'src/routes' }),
					// 	noErrorOnMissing: true,
					// 	priority: 3,
					// },
					// {
					// 	from: './src/routes/**/*.jpg',
					// 	to: distPath({ subpathIn: 'src/routes' }),
					// 	noErrorOnMissing: true,
					// 	priority: 3,
					// },
					// {
					// 	from: './src/routes/**/*.json',
					// 	to: distPath({ subpathIn: 'src/routes' }),
					// 	noErrorOnMissing: true,
					// 	priority: 3,
					// },
					// {
					// 	from: './src/routes/**/*.svg',
					// 	to: distPath({ subpathIn: 'src/routes' }),
					// 	noErrorOnMissing: true,
					// 	priority: 3,
					// },
					// {
					// 	from: './src/routes/**/*.mp3',
					// 	to: distPath({ subpathIn: 'src/routes' }),
					// 	noErrorOnMissing: true,
					// 	priority: 3,
					// },
				],
			}),
		],
		module: {
			rules: [
				{
					test: /\.css$/,
					use: [
						"style-loader",
						// path.resolve(__dirname, '../node_modules/style-loader'),
						{
							loader: "css-loader",
							// loader: path.resolve(__dirname, '../node_modules/css-loader'),
							options: {
								// don't try to require() url assets
								url: false
							}
						}
					]
				},
				{
					test: /\.html$/,
					loader: "file-loader",
					// loader: path.resolve(__dirname, '../node_modules/file-loader'),
					options: {
						name: "[name].[ext]",
					}
				},
				{
					test: /\.mjs$/,
					resolve: {
						fullySpecified: false
					}
				},
				{
					test: /\.(md|tpl)$/,
					use: "raw-loader",
					// use: path.resolve(__dirname, '../node_modules/raw-loader')
				},
			]
		}
	};
};