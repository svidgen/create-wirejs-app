#!/usr/bin/env node

import process from 'process';
import path from 'path';
import fs from 'fs';
import { rimraf } from 'rimraf';
import copy from 'recursive-copy';
import esbuild from 'esbuild';
import { exec, execSync } from 'child_process';

const CWD = process.cwd();
const __filename = import.meta.url.replace(/^file:/, '');
const SELF_DIR = path.dirname(__filename);
const TEMP_DIR = path.join(SELF_DIR, 'temp');
const PROJECT_API_DIR = path.join(CWD, 'api');
const PROJECT_DIST_DIR = path.join(CWD, 'dist');
const BACKEND_DIR = path.join(CWD, 'amplify');
const HOSTING_DIR = path.join(CWD, '.amplify-hosting');
const STATIC_DIR = path.join(HOSTING_DIR, 'static');
const COMPUTE_DIR = path.join(HOSTING_DIR, 'compute', 'default');

const [_nodeBinPath, _scriptPath, action] = process.argv;

/**
 * establish Amplify deployment directory skeleton, used by Amplify
 * to deploy frontend (hosting) and backend (services).
 */
async function createSkeleton() {
	console.log("creating skeleton deployment directories")
	await rimraf(HOSTING_DIR);
	await fs.promises.mkdir(HOSTING_DIR, { recursive: true });
	await fs.promises.mkdir(STATIC_DIR, { recursive: true });
	await fs.promises.mkdir(COMPUTE_DIR, { recursive: true });
	
	// skeleton for backend assets
	await copy(path.join(SELF_DIR, 'amplify-backend-assets'), path.join(BACKEND_DIR));
	
	// skeleton for hosting assets
	await copy(path.join(SELF_DIR, 'amplify-hosting-assets'), path.join(HOSTING_DIR));
	console.log("done creating deployment directories")

	console.log("installing SSR server deps");
	execSync(`npm install --prefix ${COMPUTE_DIR} --no-hoist`)
}

/**
 * Install all deps, adding those needed for Amplify backend deployments.
 */
async function installDeps() {
	console.log("adding deps to package.json");
	// add deps used by Amplify to deploy backend
	const packageData = JSON.parse(await fs.promises.readFile(path.join(CWD, 'package.json')));
	packageData.devDependencies = {
		...(packageData.devDependencies || {}),
		...{
			'@aws-amplify/backend': '^1.14.0',
			'@aws-amplify/backend-cli': '^1.4.8',
			'aws-cdk': '^2.177.0',
			'aws-cdk-lib': '^2.177.0',
			'constructs': '^10.4.2',
			'esbuild': '^0.24.2',
			'tsx': '^4.19.2',
			'typescript': '^5.7.3',
			'wirejs-resources': `file:${SELF_DIR}`
		}
	};
	await fs.promises.writeFile(
		path.join(CWD, 'package.json'),
		JSON.stringify(packageData, null, 2)
	);

	console.log("installing all deps")

	// install all
	execSync('npm i');

	console.log("done installing deps")
}

/**
 * 
 * @returns {Promise<string>} output filename
 */
async function buildApiBundle() {
	console.log("building api")
	// looks like cruft at the moment, but we'll see ...
	// await import(path.join(PROJECT_API_DIR, 'index.js'));

	const outputPath = path.join(BACKEND_DIR, 'api.js');

	// intermediate build of the resource overrides. this includes any deps we have
	// on the original `wirejs-resources` into the intermediate bundle. doing this
	// allows us to completely override (alias) `wirejs-resources` in the final build
	// without creating a circular alias.
	console.log("creating intermediate wirejs-resources overrides");
	await esbuild.build({
		entryPoints: [path.join(SELF_DIR, 'wirejs-resources-overrides', 'index.js')],
		bundle: true,
		outfile: RESOURCE_OVERRIDES_BUILD,
		platform: 'node',
		format: 'esm',
		external: ['@aws-sdk/client-s3']
	});

	// exploratory build. builds using our overrides, which will emit a manifest of
	// resources required by the API when imported.
	console.log("creating api bundle using platform overrides");
	await esbuild.build({
		entryPoints: [path.join('.', 'api', 'index.js')],
		bundle: true,
		outfile: outputPath,
		platform: 'node',
		format: 'esm',
		alias: {
			'wirejs-resources': RESOURCE_OVERRIDES_BUILD
		},
		external: ['@aws-sdk/client-s3']
	});

	// exploratory import. not strictly necessary until we're actually using the manifest
	// to direct construction of backend resources. for now, this is just informational/
	// confirmational that we're building things properly.
	await import(outputPath);
	console.log('discovered resources', globalThis.wirejsResources);

	return outputPath;
}

async function deployFrontend() {
	console.log("copying frontend assets");
	await copy(PROJECT_DIST_DIR, STATIC_DIR);

	// ssr will likely have been build as a static asset, but should NOT be
	// served as a static resource.
	await rimraf(path.join(STATIC_DIR, 'ssr'));
	
	// instead, ssr should be served from the "compute" directory, served by lambda@edge
	await copy(
		path.join(PROJECT_DIST_DIR, 'ssr'),
		path.join(HOSTING_DIR, 'compute', 'default', 'ssr')
	);
	console.log('frontend assets copied');
}


if (action === 'prebuild') {
	console.log("starting prebuild");
	await createSkeleton();
	await installDeps();
	// await buildApiBundle();

	console.log("prebuild done");
} else if (action === 'inject-backend') {
	console.log("starting inject-backend");
	const config = JSON.parse(await fs.promises.readFile(path.join('.', 'amplify_outputs.json')));
	const apiUrl = config.custom.api;

	const configJSON = JSON.stringify({
		apiUrl
	});
	const configJS = `const config = ${configJSON};\nexport default config;`;

	await fs.promises.writeFile(path.join(PROJECT_API_DIR, 'config.js'), configJS);
	await fs.promises.writeFile(path.join(COMPUTE_DIR, 'config.js'), configJS);

	console.log("inject-backend done");
} else if (action === 'build-hosting-artifacts') {
	console.log("starting build-hosting-artifacts");
	await deployFrontend();
	console.log("build-hosting-artifacts done");
} else {
	throw new Error("Unrecognized action.");
}