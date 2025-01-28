#!/usr/bin/env node

import process from 'process';
import path from 'path';
import fs from 'fs';
import { rimraf } from 'rimraf';
import copy from 'recursive-copy';
import esbuild from 'esbuild';
import { execSync } from 'child_process';

const CWD = process.cwd();
const SELF_DIR = import.meta.dirname;
const TEMP_DIR = path.join(SELF_DIR, 'temp');
const RESOURCE_OVERRIDES_BUILD = path.join(
	TEMP_DIR, 'wirejs-resource-overrides.build.js'
);
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
	await rimraf(HOSTING_DIR);
	await fs.promises.mkdir(HOSTING_DIR, { recursive: true });
	await fs.promises.mkdir(STATIC_DIR, { recursive: true });
	await fs.promises.mkdir(COMPUTE_DIR, { recursive: true });
	
	// skeleton for backend assets
	await copy(path.join(SELF_DIR, 'amplify-backend-assets'), path.join(BACKEND_DIR));
	
	// skeleton for hosting assets
	await copy(path.join(SELF_DIR, 'amplify-hosting-assets'), path.join(HOSTING_DIR));
}

/**
 * Install all deps, adding those needed for Amplify backend deployments.
 */
async function installDeps() {
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
			'@aws-sdk/client-s3': "^3.735.0",
		}
	};
	await fs.promises.writeFile(
		path.join(CWD, 'package.json'),
		JSON.stringify(packageData, null, 2)
	);

	// install all
	execSync('npm ci --cache .npm --prefer-offline');
}

/**
 * 
 * @returns {Promise<string>} output filename
 */
async function buildApiBundle() {
	// looks like cruft at the moment, but we'll see ...
	// await import(path.join(PROJECT_API_DIR, 'index.js'));

	const outputPath = path.join(PROJECT_DIST_DIR, 'api', 'dist', 'index.js');

	// intermediate build of the resource overrides. this includes any deps we have
	// on the original `wirejs-resources` into the intermediate bundle. doing this
	// allows us to completely override (alias) `wirejs-resources` in the final build
	// without creating a circular alias.
	await esbuild.build({
		entryPoints: [path.join(SELF_DIR, 'wirejs-resources-overrides', 'index.js')],
		bundle: true,
		outfile: RESOURCE_OVERRIDES_BUILD,
		platform: 'node',
		format: 'esm',
	});

	// exploratory build. builds using our overrides, which will emit a manifest of
	// resources required by the API when imported.
	await esbuild.build({
		entryPoints: [path.join('.', 'api', 'index.js')],
		bundle: true,
		outfile: outputPath,
		platform: 'node',
		format: 'esm',
		alias: {
			'wirejs-resources': RESOURCE_OVERRIDES_BUILD
		}
	});

	// exploratory import. not strictly necessary until we're actually using the manifest
	// to direct construction of backend resources. for now, this is just informational/
	// confirmational that we're building things properly.
	await import(outputPath);
	console.log(globalThis.wirejsResources);

	return outputPath;
}

async function deployFrontend() {
	await copy(PROJECT_DIST_DIR, STATIC_DIR);

	// ssr will likely have been build as a static asset, but should NOT be
	// served as a static resource.
	await rimraf(path.join(STATIC_DIR, 'ssr'));
	
	// instead, ssr should be served from the "compute" directory, served by lambda@edge
	await copy(
		path.join(PROJECT_DIST_DIR, 'ssr'),
		path.join(HOSTING_DIR, 'compute', 'default', 'ssr')
	);
}


if (action === 'prebuild') {
	await createSkeleton();
	await installDeps();
	await buildApiBundle();
} else if (action === 'inject-backend') {
	const config = JSON.parse(await fs.promises.readFile(path.join('.', 'amplify_outputs.json')));
	const apiUrl = config.custom.api;

	const configJSON = JSON.stringify({
		apiUrl
	});

	await fs.promises.writeFile(
		path.join(PROJECT_API_DIR, 'config.js'),
		`const config = ${configJSON};\n export default config;`
	);
} else if (action === 'build-hosting-artifacts') {
	await deployFrontend();
} else {
	throw new Error("Unrecognized action.");
}